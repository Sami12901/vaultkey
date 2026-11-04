package com.vaultkey.crypto

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyPermanentlyInvalidatedException
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class KeystoreManager(private val context: Context) {

    companion object {
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        private const val BIOMETRIC_KEY_ALIAS = "VaultKey_Biometric_Master"
        private const val CIPHER_TRANSFORMATION = "AES/GCM/NoPadding"
        private const val KEY_SIZE = 256
        private const val GCM_TAG_LENGTH = 128
    }

    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply {
        load(null)
    }

    fun isStrongBoxSupported(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            context.packageManager.hasSystemFeature(PackageManager.FEATURE_STRONGBOX_KEYSTORE)
        } else {
            false
        }
    }

    fun hasBiometricKey(): Boolean {
        return keyStore.containsAlias(BIOMETRIC_KEY_ALIAS)
    }

    fun removeBiometricKey() {
        if (keyStore.containsAlias(BIOMETRIC_KEY_ALIAS)) {
            keyStore.deleteEntry(BIOMETRIC_KEY_ALIAS)
        }
    }

    fun generateBiometricKey(useStrongBox: Boolean = isStrongBoxSupported()): SecretKey {
        val keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)

        val builder = KeyGenParameterSpec.Builder(
            BIOMETRIC_KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(KEY_SIZE)
            .setUserAuthenticationRequired(true)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            builder.setUserAuthenticationParameters(
                0, // 0 = every use requires authentication
                KeyProperties.AUTH_BIOMETRIC_STRONG
            )
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P && useStrongBox) {
            try {
                builder.setIsStrongBoxBacked(true)
            } catch (e: Throwable) {
                // Fall back to TEE if StrongBox not available
                builder.setIsStrongBoxBacked(false)
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            builder.setInvalidatedByBiometricEnrollment(true)
        }

        return try {
            keyGenerator.init(builder.build())
            keyGenerator.generateKey()
        } catch (e: Exception) {
            if (useStrongBox) {
                // Retry without StrongBox
                generateBiometricKey(useStrongBox = false)
            } else {
                throw e
            }
        }
    }

    fun getBiometricKey(): SecretKey? {
        return if (keyStore.containsAlias(BIOMETRIC_KEY_ALIAS)) {
            keyStore.getKey(BIOMETRIC_KEY_ALIAS, null) as? SecretKey
        } else {
            null
        }
    }

    fun getEncryptCipher(): Cipher {
        val key = getBiometricKey() ?: generateBiometricKey()
        val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key)
        return cipher
    }

    @Throws(KeyPermanentlyInvalidatedException::class)
    fun getDecryptCipher(iv: ByteArray): Cipher {
        val key = getBiometricKey() ?: throw IllegalStateException("Biometric key not found in Keystore")
        val cipher = Cipher.getInstance(CIPHER_TRANSFORMATION)
        val spec = GCMParameterSpec(GCM_TAG_LENGTH, iv)
        cipher.init(Cipher.DECRYPT_MODE, key, spec)
        return cipher
    }
}
