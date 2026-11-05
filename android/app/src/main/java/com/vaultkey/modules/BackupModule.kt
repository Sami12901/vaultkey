package com.vaultkey.modules

import android.app.Activity
import android.content.ContentValues
import android.content.Intent
import android.media.MediaScannerConnection
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.OpenableColumns
import com.facebook.react.bridge.*
import com.vaultkey.backup.EncryptedBackupManager
import com.vaultkey.crypto.AesGcmCipher
import com.vaultkey.crypto.MemorySecurity
import com.vaultkey.database.ItemType
import com.vaultkey.database.VaultDao
import com.vaultkey.session.VaultSessionManager
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

class BackupModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        private const val REQUEST_CODE_PICK_BACKUP = 9101
    }

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "BackupModule"

    private val sessionManager: VaultSessionManager
        get() = VaultSessionManager.getInstance(reactApplicationContext)

    private val backupManager = EncryptedBackupManager(reactApplicationContext)
    private val dao: VaultDao
        get() = sessionManager.dao

    private var pickBackupPromise: Promise? = null

    // ---------------------------------------------------------
    // SAF Document Picker for External .vkb Archives
    // ---------------------------------------------------------

    @ReactMethod
    fun pickBackupFile(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("ERR_ACTIVITY", "Current activity not available")
            return
        }
        if (pickBackupPromise != null) {
            pickBackupPromise?.reject("ERR_CANCELLED", "Previous file picker cancelled")
            pickBackupPromise = null
        }
        pickBackupPromise = promise

        try {
            val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
                addCategory(Intent.CATEGORY_OPENABLE)
                type = "*/*"
                putExtra(
                    Intent.EXTRA_MIME_TYPES,
                    arrayOf("application/octet-stream", "application/json", "text/plain", "*/*")
                )
            }
            activity.startActivityForResult(
                Intent.createChooser(intent, "Select VaultKey Backup Archive"),
                REQUEST_CODE_PICK_BACKUP
            )
        } catch (e: Exception) {
            try {
                val fallback = Intent(Intent.ACTION_GET_CONTENT).apply {
                    addCategory(Intent.CATEGORY_OPENABLE)
                    type = "*/*"
                }
                activity.startActivityForResult(
                    Intent.createChooser(fallback, "Select VaultKey Backup Archive"),
                    REQUEST_CODE_PICK_BACKUP
                )
            } catch (ex: Exception) {
                pickBackupPromise = null
                promise.reject("ERR_PICK", ex.message, ex)
            }
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_CODE_PICK_BACKUP) {
            val promise = pickBackupPromise
            pickBackupPromise = null
            if (resultCode == Activity.RESULT_OK && data?.data != null) {
                val uri = data.data!!
                val context = reactApplicationContext
                var fileName = "backup.vkb"
                var fileSize = 0L

                try {
                    context.contentResolver.takePersistableUriPermission(
                        uri,
                        Intent.FLAG_GRANT_READ_URI_PERMISSION
                    )
                } catch (e: Exception) {
                    // Ignored if provider does not support persistent grants
                }

                try {
                    val cursor = context.contentResolver.query(uri, null, null, null, null)
                    cursor?.use {
                        if (it.moveToFirst()) {
                            val nameIdx = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                            if (nameIdx >= 0) fileName = it.getString(nameIdx) ?: fileName
                            val sizeIdx = it.getColumnIndex(OpenableColumns.SIZE)
                            if (sizeIdx >= 0) fileSize = it.getLong(sizeIdx)
                        }
                    }
                } catch (e: Exception) {
                    uri.lastPathSegment?.let { fileName = it }
                }

                var resolvedPath = uri.toString()
                try {
                    val cacheDir = File(context.cacheDir, "backups").apply { if (!exists()) mkdirs() }
                    val cachedFile = File(cacheDir, "picked_restore_${System.currentTimeMillis()}.vkb")
                    context.contentResolver.openInputStream(uri)?.use { input ->
                        FileOutputStream(cachedFile).use { output ->
                            input.copyTo(output)
                        }
                    }
                    if (cachedFile.exists() && cachedFile.length() > 0) {
                        resolvedPath = cachedFile.absolutePath
                        fileSize = cachedFile.length()
                    }
                } catch (e: Exception) {
                    // Fallback to original uri
                }

                val map = Arguments.createMap().apply {
                    putString("uri", resolvedPath)
                    putString("fileName", fileName)
                    putDouble("fileSizeBytes", fileSize.toDouble())
                }
                promise?.resolve(map)
            } else {
                promise?.reject("ERR_CANCELLED", "File selection was cancelled")
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        // No-op
    }

    // ---------------------------------------------------------
    // Stream Reading Helper (content://, file://, or raw path)
    // ---------------------------------------------------------

    private fun readBytesFromUriOrPath(uriOrPath: String): ByteArray {
        val context = reactApplicationContext
        return if (uriOrPath.startsWith("content://") || uriOrPath.startsWith("file://")) {
            val uri = Uri.parse(uriOrPath)
            context.contentResolver.openInputStream(uri)?.use { inputStream ->
                inputStream.readBytes()
            } ?: throw IllegalArgumentException("Could not open input stream for: $uriOrPath")
        } else {
            val file = File(uriOrPath)
            if (file.exists() && file.canRead()) {
                file.readBytes()
            } else {
                try {
                    val uri = Uri.parse(uriOrPath)
                    context.contentResolver.openInputStream(uri)?.use { inputStream ->
                        inputStream.readBytes()
                    } ?: throw IllegalArgumentException("Cannot read file: $uriOrPath")
                } catch (e: Exception) {
                    throw IllegalArgumentException("Backup file does not exist or cannot be read: $uriOrPath", e)
                }
            }
        }
    }

    // ---------------------------------------------------------
    // Create, Inspect & Restore Backups
    // ---------------------------------------------------------

    @ReactMethod
    fun createEncryptedBackup(password: String, promise: Promise) {
        val chars = password.toCharArray()
        try {
            val backupBytes = backupManager.createEncryptedBackup(chars)
            val fileName = "vaultkey_backup_${System.currentTimeMillis()}.vkb"
            val outputDir = reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
                ?: reactApplicationContext.filesDir
            val outFile = File(outputDir, fileName)

            FileOutputStream(outFile).use { fos ->
                fos.write(backupBytes)
            }

            val map = Arguments.createMap().apply {
                putString("filePath", outFile.absolutePath)
                putString("fileName", fileName)
                putInt("fileSizeBytes", backupBytes.size)
                putBoolean("success", true)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_BACKUP", e.message, e)
        } finally {
            MemorySecurity.wipe(chars)
        }
    }

    @ReactMethod
    fun inspectBackup(filePath: String, password: String, promise: Promise) {
        val chars = password.toCharArray()
        try {
            val bytes = readBytesFromUriOrPath(filePath)
            val (preview, _) = backupManager.inspectBackup(bytes, chars)

            val map = Arguments.createMap().apply {
                putInt("formatVersion", preview.formatVersion)
                putDouble("timestamp", preview.timestamp.toDouble())
                putInt("loginCount", preview.loginCount)
                putInt("noteCount", preview.noteCount)
                putInt("cardCount", preview.cardCount)
                putInt("bankCount", preview.bankCount)
                putInt("mediaCount", preview.mediaCount)
                putInt("folderCount", preview.folderCount)
                putInt("tagCount", preview.tagCount)
                putInt("totalItems", preview.totalItems)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_INSPECT", e.message, e)
        } finally {
            MemorySecurity.wipe(chars)
        }
    }

    @ReactMethod
    fun restoreBackup(filePath: String, password: String, mode: String, promise: Promise) {
        val chars = password.toCharArray()
        try {
            val bytes = readBytesFromUriOrPath(filePath)
            val restoredCount = backupManager.restoreBackup(bytes, chars, mode)

            val map = Arguments.createMap().apply {
                putInt("restoredCount", restoredCount)
                putString("mode", mode)
                putBoolean("success", true)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_RESTORE", e.message, e)
        } finally {
            MemorySecurity.wipe(chars)
        }
    }

    // ---------------------------------------------------------
    // JSON Import & Export
    // ---------------------------------------------------------

    @ReactMethod
    fun importCredentialsJson(jsonString: String, deleteSourceFile: String?, promise: Promise) {
        try {
            if (!sessionManager.isUnlocked()) {
                promise.reject("ERR_LOCKED", "Vault is locked")
                return
            }
            val dek = sessionManager.getActiveDek()

            val rootJson = JSONObject(jsonString)
            val itemsArr = rootJson.optJSONArray("items") ?: JSONArray()
            var importedCount = 0

            for (i in 0 until itemsArr.length()) {
                val item = itemsArr.getJSONObject(i)
                val title = item.optString("name", item.optString("title", "Imported Item"))
                val loginObj = item.optJSONObject("login")
                val username = loginObj?.optString("username") ?: item.optString("username", "")
                val password = loginObj?.optString("password") ?: item.optString("password", "")
                val notes = item.optString("notes", "")

                if (username.isNotEmpty() || password.isNotEmpty()) {
                    val encPass = AesGcmCipher.encryptString(password, dek)
                    dao.insertLoginItem(
                        title = title,
                        username = username,
                        encryptedPassword = encPass.ciphertext,
                        passwordIv = encPass.iv,
                        notes = notes
                    )
                    importedCount++
                }
            }

            if (!deleteSourceFile.isNullOrBlank()) {
                val f = File(deleteSourceFile)
                if (f.exists()) f.delete()
            }

            dao.logAuditEvent("JSON_IMPORTED", "Imported $importedCount credentials from JSON", true)

            val map = Arguments.createMap().apply {
                putInt("importedCount", importedCount)
                putBoolean("success", true)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_IMPORT", e.message, e)
        }
    }

    @ReactMethod
    fun exportCredentialsJson(promise: Promise) {
        try {
            if (!sessionManager.isUnlocked()) {
                promise.reject("ERR_LOCKED", "Vault is locked")
                return
            }
            val dek = sessionManager.getActiveDek()
            val rootJson = JSONObject()
            rootJson.put("generator", "VaultKey")
            rootJson.put("version", 2)
            rootJson.put("exportedAt", System.currentTimeMillis())

            val itemsArr = JSONArray()
            val summaries = dao.getItemSummaries(limit = 100000)
            for (s in summaries) {
                val item = dao.getItem(s.id) ?: continue
                val itemObj = JSONObject().apply {
                    put("id", item.id)
                    put("type", item.type.name)
                    put("title", item.title)
                    put("isFavorite", item.isFavorite)
                    put("createdAt", item.createdAt)
                    put("updatedAt", item.updatedAt)
                    put("tags", JSONArray(item.tags))
                }

                when (item.type) {
                    ItemType.LOGIN -> {
                        val l = dao.getLoginRecord(item.id)
                        if (l != null) {
                            val pass = AesGcmCipher.decryptToString(l.encryptedPassword, l.passwordIv, dek)
                            val logObj = JSONObject().apply {
                                put("username", l.username)
                                put("password", pass)
                                put("urls", l.urlsJson)
                                put("notes", l.notes)
                            }
                            itemObj.put("login", logObj)
                        }
                    }
                    ItemType.SECURE_NOTE -> {
                        val n = dao.getSecureNote(item.id)
                        if (n != null) {
                            val content = AesGcmCipher.decryptToString(n.encryptedContent, n.contentIv, dek)
                            itemObj.put("notes", content)
                        }
                    }
                    ItemType.CREDENTIAL_CARD -> {
                        val c = dao.getCreditCard(item.id)
                        if (c != null) {
                            val num = AesGcmCipher.decryptToString(c.encryptedCardNumber, c.cardIv, dek)
                            val cvv = AesGcmCipher.decryptToString(c.encryptedCvv, c.cvvIv, dek)
                            val cardObj = JSONObject().apply {
                                put("cardholderName", c.cardholderName)
                                put("cardNumber", num)
                                put("expiryMonth", c.expiryMonth)
                                put("expiryYear", c.expiryYear)
                                put("cvv", cvv)
                                put("cardBrand", c.cardBrand)
                                put("cardType", c.cardType)
                                put("billingZip", c.billingZip)
                            }
                            itemObj.put("card", cardObj)
                        }
                    }
                    ItemType.BANK_ACCOUNT -> {
                        val b = dao.getBankAccount(item.id)
                        if (b != null) {
                            val num = AesGcmCipher.decryptToString(b.encryptedAccountNumber, b.accountIv, dek)
                            val bankObj = JSONObject().apply {
                                put("bankName", b.bankName)
                                put("accountHolder", b.accountHolder)
                                put("accountNumber", num)
                                put("routingNumber", b.routingNumber)
                                put("swiftBic", b.swiftBic)
                                put("iban", b.iban)
                                put("accountType", b.accountType)
                            }
                            itemObj.put("bankAccount", bankObj)
                        }
                    }
                    ItemType.AUTHENTICATOR_2FA -> {
                        val a = dao.getAuthenticatorRecord(item.id)
                        if (a != null) {
                            val secret = AesGcmCipher.decryptToString(a.encryptedSecret, a.secretIv, dek)
                            val authObj = JSONObject().apply {
                                put("issuer", a.issuer)
                                put("accountName", a.accountName)
                                put("secret", secret)
                                put("algorithm", a.algorithm)
                                put("digits", a.digits)
                                put("period", a.period)
                            }
                            itemObj.put("authenticator", authObj)
                        }
                    }
                    else -> {}
                }
                itemsArr.put(itemObj)
            }
            rootJson.put("items", itemsArr)

            dao.logAuditEvent("JSON_EXPORTED", "Exported credentials JSON", true)
            promise.resolve(rootJson.toString(2))
        } catch (e: Exception) {
            promise.reject("ERR_EXPORT_JSON", e.message, e)
        }
    }

    // ---------------------------------------------------------
    // File Management & Public Downloads Export
    // ---------------------------------------------------------

    @ReactMethod
    fun listBackupFiles(promise: Promise) {
        try {
            val outputDir = reactApplicationContext.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
                ?: reactApplicationContext.filesDir
            val files = outputDir.listFiles { file -> file.isFile && file.name.endsWith(".vkb") } ?: emptyArray()
            val sorted = files.sortedByDescending { it.lastModified() }

            val array = Arguments.createArray()
            for (f in sorted) {
                val map = Arguments.createMap().apply {
                    putString("fileName", f.name)
                    putString("filePath", f.absolutePath)
                    putDouble("fileSizeBytes", f.length().toDouble())
                    putDouble("lastModified", f.lastModified().toDouble())
                }
                array.pushMap(map)
            }
            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERR_LIST_BACKUPS", e.message, e)
        }
    }

    @ReactMethod
    fun shareBackupFile(filePath: String, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("ERR_ACTIVITY", "Current activity not available")
            return
        }

        try {
            val file = File(filePath)
            val uri = if (file.exists()) {
                androidx.core.content.FileProvider.getUriForFile(
                    reactApplicationContext,
                    "${reactApplicationContext.packageName}.fileprovider",
                    file
                )
            } else if (filePath.startsWith("content://")) {
                Uri.parse(filePath)
            } else {
                promise.reject("ERR_FILE", "File does not exist")
                return
            }

            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "application/octet-stream"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "VaultKey Encrypted Backup: ${file.name}")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = Intent.createChooser(shareIntent, "Export / Share Encrypted Backup")
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(chooser)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_SHARE", e.message, e)
        }
    }

    @ReactMethod
    fun exportBackupToDownloads(filePath: String, promise: Promise) {
        try {
            val bytes = readBytesFromUriOrPath(filePath)
            val baseName = if (filePath.contains("/")) filePath.substringAfterLast("/") else "vaultkey_backup_${System.currentTimeMillis()}.vkb"
            val safeFileName = if (baseName.endsWith(".vkb")) baseName else "$baseName.vkb"

            val context = reactApplicationContext

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, safeFileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, "application/octet-stream")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/VaultKey")
                }
                val resolver = context.contentResolver
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    ?: throw IllegalStateException("Failed to create download entry in MediaStore")
                resolver.openOutputStream(uri)?.use { os ->
                    os.write(bytes)
                }

                val map = Arguments.createMap().apply {
                    putString("exportedPath", uri.toString())
                    putString("fileName", safeFileName)
                    putBoolean("success", true)
                }
                promise.resolve(map)
            } else {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                val vaultFolder = File(downloadsDir, "VaultKey")
                if (!vaultFolder.exists()) {
                    vaultFolder.mkdirs()
                }
                val destFile = File(vaultFolder, safeFileName)
                destFile.writeBytes(bytes)

                MediaScannerConnection.scanFile(
                    context,
                    arrayOf(destFile.absolutePath),
                    null,
                    null
                )

                val map = Arguments.createMap().apply {
                    putString("exportedPath", destFile.absolutePath)
                    putString("fileName", destFile.name)
                    putBoolean("success", true)
                }
                promise.resolve(map)
            }
        } catch (e: Exception) {
            promise.reject("ERR_EXPORT", e.message, e)
        }
    }

    @ReactMethod
    fun deleteBackupFile(filePath: String, promise: Promise) {
        try {
            val file = File(filePath)
            if (file.exists()) {
                try {
                    // Shred with zeros before deletion
                    val zeros = ByteArray(file.length().toInt().coerceAtMost(1024 * 1024))
                    FileOutputStream(file).use { fos ->
                        fos.write(zeros)
                    }
                } catch (e: Exception) {}
                file.delete()
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_DELETE", e.message, e)
        }
    }
}
