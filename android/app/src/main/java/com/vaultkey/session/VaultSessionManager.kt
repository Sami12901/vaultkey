package com.vaultkey.session

import android.content.Context
import android.content.SharedPreferences
import android.os.SystemClock
import android.util.Base64
import com.vaultkey.crypto.*
import com.vaultkey.database.VaultDao
import com.vaultkey.database.VaultDatabaseHelper
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import javax.crypto.AEADBadTagException
import javax.crypto.Cipher

enum class VaultState {
    UNINITIALIZED,
    LOCKED,
    UNLOCKED
}

class VaultSessionManager private constructor(private val context: Context) {

    companion object {
        private const val PREFS_NAME = "vaultkey_metadata_secure"
        private const val KEY_IS_INITIALIZED = "is_initialized"
        private const val KEY_SALT = "kdf_salt"
        private const val KEY_MEMORY_KIB = "kdf_memory_kib"
        private const val KEY_ITERATIONS = "kdf_iterations"
        private const val KEY_PARALLELISM = "kdf_parallelism"
        private const val KEY_ENCRYPTED_DEK = "encrypted_dek"
        private const val KEY_DEK_IV = "dek_iv"
        private const val KEY_VERIFIER = "password_verifier"
        private const val KEY_VERIFIER_IV = "password_verifier_iv"
        private const val KEY_BIO_ENCRYPTED_DEK = "bio_encrypted_dek"
        private const val KEY_BIO_DEK_IV = "bio_dek_iv"
        private const val KEY_FAILED_ATTEMPTS = "failed_attempts"
        private const val KEY_LOCKOUT_UNTIL = "lockout_until"

        private const val VERIFIER_PLAINTEXT = "VAULTKEY_ROOT_VERIFIER_TOKEN_V1"

        @Volatile
        private var instance: VaultSessionManager? = null

        fun getInstance(context: Context): VaultSessionManager {
            return instance ?: synchronized(this) {
                instance ?: VaultSessionManager(context.applicationContext).also { instance = it }
            }
        }
    }

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val dbHelper = VaultDatabaseHelper(context)
    val dao: VaultDao = VaultDao(dbHelper)
    val keystoreManager = KeystoreManager(context)

    private var activeDek: ByteArray? = null
    private var lastMonotonicActivityTime: Long = SystemClock.elapsedRealtime()

    val state: VaultState
        get() {
            if (!isInitialized()) return VaultState.UNINITIALIZED
            if (activeDek != null && dbHelper.isOpen()) {
                if (shouldAutoLock()) {
                    lock()
                    return VaultState.LOCKED
                }
                return VaultState.UNLOCKED
            }
            return VaultState.LOCKED
        }

    fun isInitialized(): Boolean {
        return prefs.getBoolean(KEY_IS_INITIALIZED, false) && dbHelper.databaseExists()
    }

    fun isLocked(): Boolean {
        return state == VaultState.LOCKED
    }

    fun isUnlocked(): Boolean {
        return state == VaultState.UNLOCKED
    }

    fun getActiveDek(): ByteArray {
        val dek = activeDek
        if (dek == null || !dbHelper.isOpen()) {
            throw IllegalStateException("Vault is locked")
        }
        touch()
        return dek
    }

    fun touch() {
        lastMonotonicActivityTime = SystemClock.elapsedRealtime()
    }

    private fun shouldAutoLock(): Boolean {
        if (!isInitialized() || activeDek == null) return false
        val settings = try { dao.getSettings() } catch (e: Exception) { null }
        val timeoutSeconds = settings?.autoLockSeconds ?: 300
        if (timeoutSeconds <= 0) {
            // Immediate lock if 0, never if negative
            return timeoutSeconds == 0
        }
        val elapsedMillis = SystemClock.elapsedRealtime() - lastMonotonicActivityTime
        return elapsedMillis >= (timeoutSeconds * 1000L)
    }

    // ---------------------------------------------------------
    // Setup / Master Password Creation
    // ---------------------------------------------------------

    @Synchronized
    fun initializeVault(passwordChars: CharArray, params: KdfParameters = KdfParameters()): ByteArray {
        require(!isInitialized()) { "Vault is already initialized" }

        val salt = Argon2idKdf.generateSalt(params.saltLengthBytes)
        val masterKey = Argon2idKdf.deriveKey(passwordChars, salt, params)
        val dek = AesGcmCipher.generateKey()

        try {
            // Encrypt DEK with MasterKey
            val encDek = AesGcmCipher.encrypt(dek, masterKey)

            // Encrypt Verifier token with MasterKey
            val encVerifier = AesGcmCipher.encryptString(VERIFIER_PLAINTEXT, masterKey)

            // Derive Database key from DEK
            val dbKey = deriveDatabaseKey(dek)

            // Open encrypted database
            dbHelper.open(dbKey)
            MemorySecurity.wipe(dbKey)

            // Store metadata
            prefs.edit()
                .putBoolean(KEY_IS_INITIALIZED, true)
                .putString(KEY_SALT, Base64.encodeToString(salt, Base64.NO_WRAP))
                .putInt(KEY_MEMORY_KIB, params.memoryKiB)
                .putInt(KEY_ITERATIONS, params.iterations)
                .putInt(KEY_PARALLELISM, params.parallelism)
                .putString(KEY_ENCRYPTED_DEK, Base64.encodeToString(encDek.ciphertext, Base64.NO_WRAP))
                .putString(KEY_DEK_IV, Base64.encodeToString(encDek.iv, Base64.NO_WRAP))
                .putString(KEY_VERIFIER, Base64.encodeToString(encVerifier.ciphertext, Base64.NO_WRAP))
                .putString(KEY_VERIFIER_IV, Base64.encodeToString(encVerifier.iv, Base64.NO_WRAP))
                .putInt(KEY_FAILED_ATTEMPTS, 0)
                .putLong(KEY_LOCKOUT_UNTIL, 0L)
                .apply()

            activeDek = dek.copyOf()
            touch()
            dao.logAuditEvent("VAULT_INITIALIZED", "Vault created successfully", true)

            return dek
        } finally {
            MemorySecurity.wipe(masterKey)
        }
    }

    // ---------------------------------------------------------
    // Unlock
    // ---------------------------------------------------------

    @Synchronized
    fun unlock(passwordChars: CharArray): Boolean {
        checkLockout()

        val saltStr = prefs.getString(KEY_SALT, null) ?: return false
        val encDekStr = prefs.getString(KEY_ENCRYPTED_DEK, null) ?: return false
        val dekIvStr = prefs.getString(KEY_DEK_IV, null) ?: return false
        val verifierStr = prefs.getString(KEY_VERIFIER, null) ?: return false
        val verifierIvStr = prefs.getString(KEY_VERIFIER_IV, null) ?: return false

        val salt = Base64.decode(saltStr, Base64.NO_WRAP)
        val params = KdfParameters(
            memoryKiB = prefs.getInt(KEY_MEMORY_KIB, KdfParameters.DEFAULT_MEMORY_KIB),
            iterations = prefs.getInt(KEY_ITERATIONS, KdfParameters.DEFAULT_ITERATIONS),
            parallelism = prefs.getInt(KEY_PARALLELISM, KdfParameters.DEFAULT_PARALLELISM)
        )

        val masterKey = Argon2idKdf.deriveKey(passwordChars, salt, params)

        return try {
            val verifierBytes = Base64.decode(verifierStr, Base64.NO_WRAP)
            val verifierIv = Base64.decode(verifierIvStr, Base64.NO_WRAP)
            val decryptedVerifier = AesGcmCipher.decryptToString(verifierBytes, verifierIv, masterKey)

            if (decryptedVerifier != VERIFIER_PLAINTEXT) {
                recordFailedAttempt()
                dao.logAuditEvent("UNLOCK_FAILED", "Invalid master password", false)
                return false
            }

            // Decrypt DEK
            val encDek = Base64.decode(encDekStr, Base64.NO_WRAP)
            val dekIv = Base64.decode(dekIvStr, Base64.NO_WRAP)
            val dek = AesGcmCipher.decrypt(encDek, dekIv, masterKey)

            // Derive DB key and open database
            val dbKey = deriveDatabaseKey(dek)
            dbHelper.open(dbKey)
            MemorySecurity.wipe(dbKey)

            activeDek = dek
            touch()
            resetFailedAttempts()
            dao.logAuditEvent("VAULT_UNLOCKED", "Unlocked with master password", true)
            true
        } catch (e: AEADBadTagException) {
            recordFailedAttempt()
            dao.logAuditEvent("UNLOCK_FAILED", "Authentication failed", false)
            false
        } catch (e: Exception) {
            recordFailedAttempt()
            false
        } finally {
            MemorySecurity.wipe(masterKey)
        }
    }

    // ---------------------------------------------------------
    // Biometric Unlock & Setup
    // ---------------------------------------------------------

    fun isBiometricUnlockAvailable(): Boolean {
        return prefs.getString(KEY_BIO_ENCRYPTED_DEK, null) != null && keystoreManager.hasBiometricKey()
    }

    fun getBiometricDecryptCipher(): Cipher? {
        val ivStr = prefs.getString(KEY_BIO_DEK_IV, null) ?: return null
        val iv = Base64.decode(ivStr, Base64.NO_WRAP)
        return try {
            keystoreManager.getDecryptCipher(iv)
        } catch (e: Exception) {
            // Key invalidated or unavailable
            prefs.edit().remove(KEY_BIO_ENCRYPTED_DEK).remove(KEY_BIO_DEK_IV).apply()
            null
        }
    }

    @Synchronized
    fun unlockWithBiometrics(cipher: Cipher): Boolean {
        val bioDekStr = prefs.getString(KEY_BIO_ENCRYPTED_DEK, null) ?: return false
        val bioDekBytes = Base64.decode(bioDekStr, Base64.NO_WRAP)

        return try {
            val dek = cipher.doFinal(bioDekBytes)
            val dbKey = deriveDatabaseKey(dek)
            dbHelper.open(dbKey)
            MemorySecurity.wipe(dbKey)

            activeDek = dek
            touch()
            resetFailedAttempts()
            dao.logAuditEvent("VAULT_UNLOCKED", "Unlocked with biometrics", true)
            true
        } catch (e: Exception) {
            dao.logAuditEvent("BIOMETRIC_FAILED", e.message ?: "Biometric unlock failed", false)
            false
        }
    }

    @Synchronized
    fun enableBiometrics(encryptCipher: Cipher): Boolean {
        val dek = activeDek ?: return false
        return try {
            val ciphertext = encryptCipher.doFinal(dek)
            val iv = encryptCipher.iv
            prefs.edit()
                .putString(KEY_BIO_ENCRYPTED_DEK, Base64.encodeToString(ciphertext, Base64.NO_WRAP))
                .putString(KEY_BIO_DEK_IV, Base64.encodeToString(iv, Base64.NO_WRAP))
                .apply()

            val currentSettings = dao.getSettings()
            dao.updateSettings(currentSettings.copy(biometricEnabled = true))
            dao.logAuditEvent("BIOMETRICS_ENABLED", "Biometric unlock enabled", true)
            true
        } catch (e: Exception) {
            false
        }
    }

    @Synchronized
    fun disableBiometrics() {
        prefs.edit()
            .remove(KEY_BIO_ENCRYPTED_DEK)
            .remove(KEY_BIO_DEK_IV)
            .apply()
        keystoreManager.removeBiometricKey()
        val currentSettings = dao.getSettings()
        dao.updateSettings(currentSettings.copy(biometricEnabled = false))
        dao.logAuditEvent("BIOMETRICS_DISABLED", "Biometric unlock disabled", true)
    }

    // ---------------------------------------------------------
    // Lock & Crypto-Erase
    // ---------------------------------------------------------

    @Synchronized
    fun lock() {
        activeDek?.let {
            MemorySecurity.wipe(it)
        }
        activeDek = null
        dbHelper.close()
    }

    @Synchronized
    fun cryptoErase(): Boolean {
        lock()
        keystoreManager.removeBiometricKey()
        prefs.edit().clear().apply()
        return dbHelper.cryptoErase()
    }

    @Synchronized
    fun autoSaveLoginCredential(

        title: String,
        username: String,
        password: String,
        domain: String,
        webUrl: String? = null
    ): String? {
        if (!isUnlocked()) return null
        val dek = activeDek ?: return null
        val encPass = AesGcmCipher.encryptString(password, dek)
        val targetUri = if (!webUrl.isNullOrBlank()) {
            webUrl
        } else if (domain.startsWith("http://") || domain.startsWith("https://") || domain.startsWith("android://")) {
            domain
        } else {
            "https://$domain"
        }
        val urlsJson = org.json.JSONArray().apply {
            put(org.json.JSONObject().apply {
                put("uri", targetUri)
                put("matchType", 0)
            })
        }.toString()
        val id = dao.insertLoginItem(
            title = title,
            username = username,
            encryptedPassword = encPass.ciphertext,
            passwordIv = encPass.iv,
            urlsJson = urlsJson,
            notes = "Auto-saved by VaultKey Autofill",
            folderId = null,
            isFavorite = false,
            tags = listOf("Autofill")
        )
        dao.logAuditEvent("AUTO_SAVE_SUCCESS", "Auto-saved credentials for $domain", true)
        return id
    }


    // ---------------------------------------------------------
    // Envelope Master Password Rotation
    // ---------------------------------------------------------

    @Synchronized
    fun changeMasterPassword(currentPassword: CharArray, newPassword: CharArray): Boolean {
        require(isUnlocked()) { "Vault must be unlocked to change master password" }
        val dek = activeDek ?: return false

        // Verify current password first
        val saltStr = prefs.getString(KEY_SALT, null) ?: return false
        val salt = Base64.decode(saltStr, Base64.NO_WRAP)
        val params = KdfParameters(
            memoryKiB = prefs.getInt(KEY_MEMORY_KIB, KdfParameters.DEFAULT_MEMORY_KIB),
            iterations = prefs.getInt(KEY_ITERATIONS, KdfParameters.DEFAULT_ITERATIONS),
            parallelism = prefs.getInt(KEY_PARALLELISM, KdfParameters.DEFAULT_PARALLELISM)
        )
        val currentMasterKey = Argon2idKdf.deriveKey(currentPassword, salt, params)

        try {
            val verifierStr = prefs.getString(KEY_VERIFIER, null) ?: return false
            val verifierIvStr = prefs.getString(KEY_VERIFIER_IV, null) ?: return false
            val verifierBytes = Base64.decode(verifierStr, Base64.NO_WRAP)
            val verifierIv = Base64.decode(verifierIvStr, Base64.NO_WRAP)
            val verified = AesGcmCipher.decryptToString(verifierBytes, verifierIv, currentMasterKey)
            if (verified != VERIFIER_PLAINTEXT) return false
        } catch (e: Exception) {
            return false
        } finally {
            MemorySecurity.wipe(currentMasterKey)
        }

        // Generate new salt and derive new MasterKey
        val newSalt = Argon2idKdf.generateSalt()
        val newParams = KdfParameters()
        val newMasterKey = Argon2idKdf.deriveKey(newPassword, newSalt, newParams)

        return try {
            // Re-encrypt DEK with new MasterKey
            val newEncDek = AesGcmCipher.encrypt(dek, newMasterKey)
            val newEncVerifier = AesGcmCipher.encryptString(VERIFIER_PLAINTEXT, newMasterKey)

            prefs.edit()
                .putString(KEY_SALT, Base64.encodeToString(newSalt, Base64.NO_WRAP))
                .putInt(KEY_MEMORY_KIB, newParams.memoryKiB)
                .putInt(KEY_ITERATIONS, newParams.iterations)
                .putInt(KEY_PARALLELISM, newParams.parallelism)
                .putString(KEY_ENCRYPTED_DEK, Base64.encodeToString(newEncDek.ciphertext, Base64.NO_WRAP))
                .putString(KEY_DEK_IV, Base64.encodeToString(newEncDek.iv, Base64.NO_WRAP))
                .putString(KEY_VERIFIER, Base64.encodeToString(newEncVerifier.ciphertext, Base64.NO_WRAP))
                .putString(KEY_VERIFIER_IV, Base64.encodeToString(newEncVerifier.iv, Base64.NO_WRAP))
                .apply()

            dao.logAuditEvent("MASTER_PASSWORD_CHANGED", "Master password rotated successfully", true)
            true
        } finally {
            MemorySecurity.wipe(newMasterKey)
        }
    }

    // ---------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------

    private fun deriveDatabaseKey(dek: ByteArray): ByteArray {
        val digest = MessageDigest.getInstance("SHA-256")
        digest.update(dek)
        return digest.digest("VAULTKEY_SQLCIPHER_PEPPER".toByteArray(StandardCharsets.UTF_8))
    }

    private fun recordFailedAttempt() {
        val attempts = prefs.getInt(KEY_FAILED_ATTEMPTS, 0) + 1
        val editor = prefs.edit().putInt(KEY_FAILED_ATTEMPTS, attempts)
        if (attempts >= 5) {
            val delaySeconds = when {
                attempts >= 10 -> 300 // 5 min
                attempts >= 7 -> 60   // 1 min
                else -> 15            // 15 sec
            }
            editor.putLong(KEY_LOCKOUT_UNTIL, System.currentTimeMillis() + (delaySeconds * 1000L))
        }
        editor.apply()
    }

    private fun resetFailedAttempts() {
        prefs.edit().putInt(KEY_FAILED_ATTEMPTS, 0).putLong(KEY_LOCKOUT_UNTIL, 0L).apply()
    }

    private fun checkLockout() {
        val lockoutUntil = prefs.getLong(KEY_LOCKOUT_UNTIL, 0L)
        val now = System.currentTimeMillis()
        if (now < lockoutUntil) {
            val remainingSec = (lockoutUntil - now) / 1000
            throw IllegalStateException("Too many failed attempts. Try again in $remainingSec seconds.")
        }
    }
}
