package com.vaultkey.backup

import android.content.Context
import com.vaultkey.crypto.*
import com.vaultkey.database.*
import com.vaultkey.session.VaultSessionManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.nio.ByteBuffer
import java.nio.charset.StandardCharsets

data class BackupPreview(
    val formatVersion: Int,
    val timestamp: Long,
    val loginCount: Int,
    val noteCount: Int,
    val cardCount: Int,
    val bankCount: Int = 0,
    val mediaCount: Int = 0,
    val folderCount: Int,
    val tagCount: Int,
    val totalItems: Int
)

class EncryptedBackupManager(private val context: Context) {

    companion object {
        private val MAGIC_HEADER = "VAULTKEY".toByteArray(StandardCharsets.US_ASCII)
        private const val CURRENT_FORMAT_VERSION: Short = 2
        private const val KDF_ARGON2ID: Byte = 1
        private const val KDF_PBKDF2_SHA256: Byte = 2
    }

    private val sessionManager = VaultSessionManager.getInstance(context)
    private val dao: VaultDao
        get() = sessionManager.dao

    // ---------------------------------------------------------
    // Create Encrypted Backup
    // ---------------------------------------------------------

    fun createEncryptedBackup(backupPassword: CharArray): ByteArray {
        require(sessionManager.isUnlocked()) { "Vault must be unlocked to create a backup" }
        val dek = sessionManager.getActiveDek()

        // Gather all data into JSON
        val rootJson = JSONObject()
        rootJson.put("version", CURRENT_FORMAT_VERSION.toInt())
        rootJson.put("timestamp", System.currentTimeMillis())

        // Folders
        val foldersJson = JSONArray()
        for (f in dao.getFolders()) {
            val fj = JSONObject().apply {
                put("id", f.id)
                put("name", f.name)
                put("color", f.color)
                put("icon", f.icon)
                put("createdAt", f.createdAt)
            }
            foldersJson.put(fj)
        }
        rootJson.put("folders", foldersJson)

        // Tags
        val tagsJson = JSONArray()
        for (t in dao.getTags()) {
            val tj = JSONObject().apply {
                put("id", t.id)
                put("name", t.name)
                put("color", t.color)
            }
            tagsJson.put(tj)
        }
        rootJson.put("tags", tagsJson)

        // Settings
        try {
            val s = dao.getSettings()
            val sj = JSONObject().apply {
                put("autoLockSeconds", s.autoLockSeconds)
                put("biometricEnabled", s.biometricEnabled)
                put("screenSecurity", s.screenSecurity)
                put("clipboardClearSeconds", s.clipboardClearSeconds)
                put("language", s.language)
                put("theme", s.theme)
                put("showWebsiteIcons", s.showWebsiteIcons)
            }
            rootJson.put("settings", sj)
        } catch (e: Exception) {}

        // Vault items
        val itemsJson = JSONArray()
        val allSummaries = dao.getItemSummaries(limit = 100000)

        for (summary in allSummaries) {
            val item = dao.getItem(summary.id) ?: continue
            val itemJson = JSONObject().apply {
                put("id", item.id)
                put("type", item.type.name)
                put("title", item.title)
                put("folderId", item.folderId)
                put("isFavorite", item.isFavorite)
                put("createdAt", item.createdAt)
                put("updatedAt", item.updatedAt)
                put("tags", JSONArray(item.tags))
            }

            when (item.type) {
                ItemType.LOGIN -> {
                    val login = dao.getLoginRecord(item.id)
                    if (login != null) {
                        val plainPass = AesGcmCipher.decryptToString(login.encryptedPassword, login.passwordIv, dek)
                        val dataObj = JSONObject().apply {
                            put("username", login.username)
                            put("password", plainPass)
                            put("urlsJson", login.urlsJson)
                            put("notes", login.notes)
                            put("lastChangedAt", login.lastChangedAt)
                        }
                        itemJson.put("loginData", dataObj)
                    }
                }
                ItemType.SECURE_NOTE -> {
                    val note = dao.getSecureNote(item.id)
                    if (note != null) {
                        val plainContent = AesGcmCipher.decryptToString(note.encryptedContent, note.contentIv, dek)
                        val dataObj = JSONObject().apply {
                            put("content", plainContent)
                            put("isRichText", note.isRichText)
                        }
                        itemJson.put("noteData", dataObj)
                    }
                }
                ItemType.CREDENTIAL_CARD -> {
                    val card = dao.getCreditCard(item.id)
                    if (card != null) {
                        val plainCardNum = AesGcmCipher.decryptToString(card.encryptedCardNumber, card.cardIv, dek)
                        val plainCvv = AesGcmCipher.decryptToString(card.encryptedCvv, card.cvvIv, dek)
                        val plainPin = if (card.encryptedPin != null && card.pinIv != null) {
                            try {
                                AesGcmCipher.decryptToString(card.encryptedPin, card.pinIv, dek)
                            } catch (e: Exception) { "" }
                        } else ""

                        val dataObj = JSONObject().apply {
                            put("cardholderName", card.cardholderName)
                            put("maskedNumber", card.maskedNumber)
                            put("cardNumber", plainCardNum)
                            put("expiryMonth", card.expiryMonth)
                            put("expiryYear", card.expiryYear)
                            put("cvv", plainCvv)
                            put("cardBrand", card.cardBrand)
                            put("pin", plainPin)
                            put("cardType", card.cardType)
                            put("billingZip", card.billingZip)
                        }
                        itemJson.put("cardData", dataObj)
                    }
                }
                ItemType.BANK_ACCOUNT -> {
                    val bank = dao.getBankAccount(item.id)
                    if (bank != null) {
                        val plainAccNum = AesGcmCipher.decryptToString(bank.encryptedAccountNumber, bank.accountIv, dek)
                        val dataObj = JSONObject().apply {
                            put("bankName", bank.bankName)
                            put("accountHolder", bank.accountHolder)
                            put("maskedAccountNumber", bank.maskedAccountNumber)
                            put("accountNumber", plainAccNum)
                            put("routingNumber", bank.routingNumber)
                            put("swiftBic", bank.swiftBic)
                            put("iban", bank.iban)
                            put("accountType", bank.accountType)
                        }
                        itemJson.put("bankData", dataObj)
                    }
                }
                ItemType.SECURE_MEDIA -> {
                    val media = dao.getSecureMedia(item.id)
                    if (media != null) {
                        val dataObj = JSONObject().apply {
                            put("fileName", media.fileName)
                            put("mimeType", media.mimeType)
                            put("sizeBytes", media.sizeBytes)
                            put("mediaType", media.mediaType)
                            put("notes", media.notes)
                            put("createdAt", media.createdAt)
                        }
                        itemJson.put("mediaData", dataObj)
                    }
                }
                ItemType.AUTHENTICATOR_2FA -> {
                    val auth = dao.getAuthenticatorRecord(item.id)
                    if (auth != null) {
                        val plainSecret = AesGcmCipher.decryptToString(auth.encryptedSecret, auth.secretIv, dek)
                        val dataObj = JSONObject().apply {
                            put("issuer", auth.issuer)
                            put("accountName", auth.accountName)
                            put("secret", plainSecret)
                            put("algorithm", auth.algorithm)
                            put("digits", auth.digits)
                            put("period", auth.period)
                        }
                        itemJson.put("authenticatorData", dataObj)
                    }
                }
                else -> {}
            }
            itemsJson.put(itemJson)
        }
        rootJson.put("items", itemsJson)

        val jsonBytes = rootJson.toString().toByteArray(StandardCharsets.UTF_8)

        // Derive Backup Key from backup password
        val salt = Argon2idKdf.generateSalt()
        val params = KdfParameters()
        val backupKey = Argon2idKdf.deriveKey(backupPassword, salt, params)

        try {
            val encPayload = AesGcmCipher.encrypt(jsonBytes, backupKey)
            MemorySecurity.wipe(jsonBytes)

            // Construct binary container
            val bos = ByteArrayOutputStream()
            bos.write(MAGIC_HEADER)

            val headerBuf = ByteBuffer.allocate(2 + 1 + 32 + 4 + 4 + 4 + 12 + 4)
            headerBuf.putShort(CURRENT_FORMAT_VERSION)
            headerBuf.put(KDF_ARGON2ID)
            headerBuf.put(salt)
            headerBuf.putInt(params.memoryKiB)
            headerBuf.putInt(params.iterations)
            headerBuf.putInt(params.parallelism)
            headerBuf.put(encPayload.iv)
            headerBuf.putInt(encPayload.ciphertext.size)

            bos.write(headerBuf.array())
            bos.write(encPayload.ciphertext)

            dao.logAuditEvent("BACKUP_CREATED", "Encrypted backup container created (v$CURRENT_FORMAT_VERSION)", true)
            return bos.toByteArray()
        } finally {
            MemorySecurity.wipe(backupKey)
        }
    }

    // ---------------------------------------------------------
    // Validate & Preview Backup
    // ---------------------------------------------------------

    fun inspectBackup(backupBytes: ByteArray, backupPassword: CharArray): Pair<BackupPreview, JSONObject> {
        require(backupBytes.size >= 8 + 2 + 1 + 32 + 12 + 12 + 4) { "Invalid backup file: file too small" }

        val magic = backupBytes.copyOfRange(0, 8)
        if (!magic.contentEquals(MAGIC_HEADER)) {
            throw IllegalArgumentException("Invalid backup format: magic header mismatch")
        }

        val buf = ByteBuffer.wrap(backupBytes, 8, backupBytes.size - 8)
        val version = buf.short
        val kdfId = buf.get()
        if (kdfId != KDF_ARGON2ID && kdfId != KDF_PBKDF2_SHA256) {
            throw IllegalArgumentException("Unsupported KDF algorithm in backup ($kdfId)")
        }

        val salt = ByteArray(32)
        buf.get(salt)
        val memKiB = buf.int
        val iterations = buf.int
        val parallelism = buf.int
        val iv = ByteArray(12)
        buf.get(iv)
        val payloadLen = buf.int

        if (payloadLen <= 0 || payloadLen > backupBytes.size) {
            throw IllegalArgumentException("Invalid or corrupted backup payload length")
        }

        val ciphertext = ByteArray(payloadLen)
        buf.get(ciphertext)

        val backupKey = if (kdfId == KDF_ARGON2ID) {
            val params = KdfParameters(memoryKiB = memKiB, iterations = iterations, parallelism = parallelism)
            Argon2idKdf.deriveKey(backupPassword, salt, params)
        } else {
            derivePbkdf2Key(backupPassword, salt, iterations)
        }

        val decryptedPayload: ByteArray
        try {
            decryptedPayload = AesGcmCipher.decrypt(ciphertext, iv, backupKey)
        } catch (e: Exception) {
            throw IllegalArgumentException("Incorrect backup password or corrupted backup file", e)
        } finally {
            MemorySecurity.wipe(backupKey)
        }

        val jsonStr = String(decryptedPayload, StandardCharsets.UTF_8)
        MemorySecurity.wipe(decryptedPayload)
        val rootJson = JSONObject(jsonStr)

        var loginCount = 0
        var noteCount = 0
        var cardCount = 0
        var bankCount = 0
        var mediaCount = 0
        val itemsArr = rootJson.optJSONArray("items") ?: JSONArray()
        for (i in 0 until itemsArr.length()) {
            val item = itemsArr.getJSONObject(i)
            when (item.optString("type")) {
                ItemType.LOGIN.name -> loginCount++
                ItemType.SECURE_NOTE.name -> noteCount++
                ItemType.CREDENTIAL_CARD.name -> cardCount++
                ItemType.BANK_ACCOUNT.name -> bankCount++
                ItemType.SECURE_MEDIA.name -> mediaCount++
            }
        }

        val foldersArr = rootJson.optJSONArray("folders") ?: JSONArray()
        val tagsArr = rootJson.optJSONArray("tags") ?: JSONArray()

        val preview = BackupPreview(
            formatVersion = version.toInt(),
            timestamp = rootJson.optLong("timestamp", System.currentTimeMillis()),
            loginCount = loginCount,
            noteCount = noteCount,
            cardCount = cardCount,
            bankCount = bankCount,
            mediaCount = mediaCount,
            folderCount = foldersArr.length(),
            tagCount = tagsArr.length(),
            totalItems = itemsArr.length()
        )

        return Pair(preview, rootJson)
    }

    // ---------------------------------------------------------
    // Restore Backup (Merge or Replace)
    // ---------------------------------------------------------

    fun restoreBackup(
        backupBytes: ByteArray,
        backupPassword: CharArray,
        mode: String = "MERGE" // "MERGE" or "REPLACE"
    ): Int {
        require(sessionManager.isUnlocked()) { "Vault must be unlocked to restore backup" }
        val dek = sessionManager.getActiveDek()

        val (_, rootJson) = inspectBackup(backupBytes, backupPassword)
        val itemsArr = rootJson.optJSONArray("items") ?: JSONArray()
        val foldersArr = rootJson.optJSONArray("folders") ?: JSONArray()

        var importedCount = 0

        // In REPLACE mode, clear all existing vault items
        if (mode.equals("REPLACE", ignoreCase = true)) {
            dao.deleteAllItems(clearFolders = false)
        }

        // Existing folders map to preserve relationships in MERGE mode
        val existingFolders = dao.getFolders()
        val existingFoldersByName = existingFolders.associateBy { it.name.lowercase().trim() }
        val folderIdMap = mutableMapOf<String, String>()

        // Import folders
        for (i in 0 until foldersArr.length()) {
            val f = foldersArr.getJSONObject(i)
            val backupFolderId = f.optString("id", "")
            val name = f.getString("name")
            val color = f.optString("color", "#10B981")
            val icon = f.optString("icon", "folder")

            val existing = existingFoldersByName[name.lowercase().trim()]
            if (existing != null && mode.equals("MERGE", ignoreCase = true)) {
                if (backupFolderId.isNotEmpty()) {
                    folderIdMap[backupFolderId] = existing.id
                }
            } else {
                val created = dao.createFolder(
                    name = name,
                    color = color,
                    icon = icon,
                    id = if (backupFolderId.isNotEmpty()) backupFolderId else null
                )
                if (backupFolderId.isNotEmpty()) {
                    folderIdMap[backupFolderId] = created.id
                }
            }
        }

        // Import Items
        for (i in 0 until itemsArr.length()) {
            val itemJson = itemsArr.getJSONObject(i)
            val title = itemJson.getString("title")
            val typeStr = itemJson.getString("type")
            val isFavorite = itemJson.optBoolean("isFavorite", false)
            val rawFolderId = if (itemJson.isNull("folderId")) null else itemJson.optString("folderId")
            val folderId = if (rawFolderId != null) folderIdMap[rawFolderId] ?: rawFolderId else null

            val tagsArr = itemJson.optJSONArray("tags")
            val tags = mutableListOf<String>()
            if (tagsArr != null) {
                for (t in 0 until tagsArr.length()) tags.add(tagsArr.getString(t))
            }

            when (typeStr) {
                ItemType.LOGIN.name -> {
                    val loginData = itemJson.optJSONObject("loginData") ?: continue
                    val username = loginData.getString("username")
                    val password = loginData.getString("password")
                    val urlsJson = loginData.optString("urlsJson", "[]")
                    val notes = loginData.optString("notes", "")

                    val encPass = AesGcmCipher.encryptString(password, dek)
                    dao.insertLoginItem(
                        title = title,
                        username = username,
                        encryptedPassword = encPass.ciphertext,
                        passwordIv = encPass.iv,
                        urlsJson = urlsJson,
                        notes = notes,
                        folderId = folderId,
                        isFavorite = isFavorite,
                        tags = tags
                    )
                    importedCount++
                }
                ItemType.SECURE_NOTE.name -> {
                    val noteData = itemJson.optJSONObject("noteData") ?: continue
                    val content = noteData.getString("content")
                    val isRich = noteData.optBoolean("isRichText", false)

                    val encContent = AesGcmCipher.encryptString(content, dek)
                    dao.insertSecureNote(
                        title = title,
                        encryptedContent = encContent.ciphertext,
                        contentIv = encContent.iv,
                        folderId = folderId,
                        isFavorite = isFavorite,
                        tags = tags,
                        isRichText = isRich
                    )
                    importedCount++
                }
                ItemType.CREDENTIAL_CARD.name -> {
                    val cardData = itemJson.optJSONObject("cardData") ?: continue
                    val holder = cardData.getString("cardholderName")
                    val masked = cardData.getString("maskedNumber")
                    val cardNum = cardData.getString("cardNumber")
                    val month = cardData.getString("expiryMonth")
                    val year = cardData.getString("expiryYear")
                    val cvv = cardData.getString("cvv")
                    val brand = cardData.getString("cardBrand")
                    val pin = cardData.optString("pin", "")
                    val cardType = cardData.optString("cardType", "Credit")
                    val billingZip = cardData.optString("billingZip", "")

                    val encNum = AesGcmCipher.encryptString(cardNum, dek)
                    val encCvv = AesGcmCipher.encryptString(cvv, dek)
                    val encPin = if (pin.isNotEmpty()) AesGcmCipher.encryptString(pin, dek) else null

                    dao.insertCreditCard(
                        title = title,
                        cardholderName = holder,
                        maskedNumber = masked,
                        encryptedCardNumber = encNum.ciphertext,
                        cardIv = encNum.iv,
                        expiryMonth = month,
                        expiryYear = year,
                        encryptedCvv = encCvv.ciphertext,
                        cvvIv = encCvv.iv,
                        cardBrand = brand,
                        encryptedPin = encPin?.ciphertext,
                        pinIv = encPin?.iv,
                        cardType = cardType,
                        billingZip = billingZip,
                        folderId = folderId,
                        isFavorite = isFavorite,
                        tags = tags
                    )
                    importedCount++
                }
                ItemType.BANK_ACCOUNT.name -> {
                    val bankData = itemJson.optJSONObject("bankData") ?: continue
                    val bankName = bankData.getString("bankName")
                    val holder = bankData.getString("accountHolder")
                    val masked = bankData.getString("maskedAccountNumber")
                    val accNum = bankData.getString("accountNumber")
                    val routing = bankData.optString("routingNumber", "")
                    val swift = bankData.optString("swiftBic", "")
                    val iban = bankData.optString("iban", "")
                    val accType = bankData.optString("accountType", "Checking")

                    val encAcc = AesGcmCipher.encryptString(accNum, dek)
                    dao.insertBankAccount(
                        title = title,
                        bankName = bankName,
                        accountHolder = holder,
                        maskedAccountNumber = masked,
                        encryptedAccountNumber = encAcc.ciphertext,
                        accountIv = encAcc.iv,
                        routingNumber = routing,
                        swiftBic = swift,
                        iban = iban,
                        accountType = accType,
                        folderId = folderId,
                        isFavorite = isFavorite,
                        tags = tags
                    )
                    importedCount++
                }
                ItemType.SECURE_MEDIA.name -> {
                    val mediaData = itemJson.optJSONObject("mediaData") ?: continue
                    val fileName = mediaData.getString("fileName")
                    val mimeType = mediaData.getString("mimeType")
                    val sizeBytes = mediaData.optLong("sizeBytes", 0L)
                    val mediaType = mediaData.optString("mediaType", "IMAGE")
                    val notes = mediaData.optString("notes", "")

                    dao.insertSecureMedia(
                        title = title,
                        fileName = fileName,
                        mimeType = mimeType,
                        sizeBytes = sizeBytes,
                        encryptedFilePath = "",
                        mediaType = mediaType,
                        notes = notes,
                        folderId = folderId,
                        isFavorite = isFavorite,
                        tags = tags
                    )
                    importedCount++
                }
                ItemType.AUTHENTICATOR_2FA.name -> {
                    val authData = itemJson.optJSONObject("authenticatorData") ?: continue
                    val issuer = authData.optString("issuer", "")
                    val accountName = authData.optString("accountName", "")
                    val plainSecret = authData.optString("secret", "")
                    val algorithm = authData.optString("algorithm", "SHA1")
                    val digits = authData.optInt("digits", 6)
                    val period = authData.optInt("period", 30)

                    val encSecret = AesGcmCipher.encryptString(plainSecret, dek)
                    dao.insertAuthenticatorItem(
                        title = title,
                        issuer = issuer,
                        accountName = accountName,
                        encryptedSecret = encSecret.ciphertext,
                        secretIv = encSecret.iv,
                        algorithm = algorithm,
                        digits = digits,
                        period = period,
                        folderId = folderId,
                        isFavorite = isFavorite,
                        tags = tags
                    )
                    importedCount++
                }
            }
        }

        // Restore settings if present and in REPLACE mode
        if (mode.equals("REPLACE", ignoreCase = true) && rootJson.has("settings")) {
            try {
                val sj = rootJson.getJSONObject("settings")
                val current = dao.getSettings()
                val updated = current.copy(
                    autoLockSeconds = sj.optInt("autoLockSeconds", current.autoLockSeconds),
                    biometricEnabled = sj.optBoolean("biometricEnabled", current.biometricEnabled),
                    screenSecurity = sj.optBoolean("screenSecurity", current.screenSecurity),
                    clipboardClearSeconds = sj.optInt("clipboardClearSeconds", current.clipboardClearSeconds),
                    language = sj.optString("language", current.language),
                    theme = sj.optString("theme", current.theme),
                    showWebsiteIcons = sj.optBoolean("showWebsiteIcons", current.showWebsiteIcons)
                )
                dao.updateSettings(updated)
            } catch (e: Exception) {}
        }

        dao.logAuditEvent("BACKUP_RESTORED", "Restored $importedCount items ($mode mode)", true)
        return importedCount
    }

    private fun derivePbkdf2Key(passwordChars: CharArray, salt: ByteArray, iterations: Int): ByteArray {
        val safeIterations = if (iterations >= 10000) iterations else 100000
        val spec = javax.crypto.spec.PBEKeySpec(passwordChars, salt, safeIterations, 256)
        val skf = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
        return skf.generateSecret(spec).encoded
    }
}
