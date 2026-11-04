package com.vaultkey.modules

import android.app.Activity
import android.content.Intent
import android.provider.MediaStore
import android.provider.OpenableColumns
import com.facebook.react.bridge.*
import com.vaultkey.crypto.AesGcmCipher
import com.vaultkey.crypto.MemorySecurity
import com.vaultkey.crypto.PassphraseOptions
import com.vaultkey.crypto.PasswordGeneratorOptions
import com.vaultkey.crypto.SecureRandomGenerator
import com.vaultkey.database.*
import com.vaultkey.session.VaultSessionManager
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import java.util.concurrent.TimeUnit

class VaultModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    init {
        reactContext.addActivityEventListener(this)
    }

    private var pickFilePromise: Promise? = null
    private val REQUEST_CODE_PICK_FILE = 8821
    private var mediaCapturePromise: Promise? = null
    private var cameraCaptureFile: java.io.File? = null
    private var cameraCaptureUri: android.net.Uri? = null
    private val REQUEST_CODE_CAPTURE_PHOTO = 8822
    private val REQUEST_CODE_CAPTURE_VIDEO = 8823
    private var galleryPickPromise: Promise? = null
    private val REQUEST_CODE_PICK_GALLERY = 8824

    override fun getName(): String = "VaultModule"

    private val sessionManager: VaultSessionManager
        get() = VaultSessionManager.getInstance(reactApplicationContext)

    private val dao: VaultDao
        get() = sessionManager.dao

    // ---------------------------------------------------------
    // Lifecycle & State
    // ---------------------------------------------------------

    @ReactMethod
    fun isInitialized(promise: Promise) {
        try {
            promise.resolve(sessionManager.isInitialized())
        } catch (e: Exception) {
            promise.reject("ERR_VAULT", e.message, e)
        }
    }

    @ReactMethod
    fun getVaultState(promise: Promise) {
        try {
            promise.resolve(sessionManager.state.name)
        } catch (e: Exception) {
            promise.reject("ERR_VAULT", e.message, e)
        }
    }

    @ReactMethod
    fun initializeVault(masterPassword: String, promise: Promise) {
        val chars = masterPassword.toCharArray()
        try {
            sessionManager.initializeVault(chars)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_SETUP", e.message, e)
        } finally {
            MemorySecurity.wipe(chars)
        }
    }

    @ReactMethod
    fun unlock(masterPassword: String, promise: Promise) {
        val chars = masterPassword.toCharArray()
        try {
            val success = sessionManager.unlock(chars)
            if (success) {
                promise.resolve(true)
            } else {
                promise.reject("ERR_AUTH", "Invalid Master Password")
            }
        } catch (e: Exception) {
            promise.reject("ERR_AUTH", e.message, e)
        } finally {
            MemorySecurity.wipe(chars)
        }
    }

    @ReactMethod
    fun lock(promise: Promise) {
        try {
            sessionManager.lock()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_LOCK", e.message, e)
        }
    }

    @ReactMethod
    fun changeMasterPassword(currentPass: String, newPass: String, promise: Promise) {
        val currChars = currentPass.toCharArray()
        val newChars = newPass.toCharArray()
        try {
            val success = sessionManager.changeMasterPassword(currChars, newChars)
            if (success) {
                promise.resolve(true)
            } else {
                promise.reject("ERR_PASSWORD_CHANGE", "Could not verify current password")
            }
        } catch (e: Exception) {
            promise.reject("ERR_PASSWORD_CHANGE", e.message, e)
        } finally {
            MemorySecurity.wipe(currChars)
            MemorySecurity.wipe(newChars)
        }
    }

    @ReactMethod
    fun cryptoErase(promise: Promise) {
        try {
            val success = sessionManager.cryptoErase()
            promise.resolve(success)
        } catch (e: Exception) {
            promise.reject("ERR_ERASE", e.message, e)
        }
    }

    // ---------------------------------------------------------
    // Summaries (Non-Sensitive)
    // ---------------------------------------------------------

    @ReactMethod
    fun getItemSummaries(filterOptions: ReadableMap?, promise: Promise) {
        try {
            if (!sessionManager.isUnlocked()) {
                promise.reject("ERR_LOCKED", "Vault is locked")
                return
            }

            val typeFilter = filterOptions?.getString("type")
            val folderFilter = filterOptions?.getString("folderId")
            val tagFilter = filterOptions?.getString("tag")
            val favOnly = filterOptions?.getBoolean("favoritesOnly") ?: false
            val query = filterOptions?.getString("query")
            val sort = filterOptions?.getString("sort") ?: "updated_desc"
            val limit = if (filterOptions?.hasKey("limit") == true) filterOptions.getInt("limit") else 100
            val offset = if (filterOptions?.hasKey("offset") == true) filterOptions.getInt("offset") else 0

            val summaries = dao.getItemSummaries(
                typeFilter = typeFilter,
                folderFilter = folderFilter,
                tagFilter = tagFilter,
                favoritesOnly = favOnly,
                searchQuery = query,
                sortOrder = sort,
                limit = limit,
                offset = offset
            )

            val array = Arguments.createArray()
            for (s in summaries) {
                val map = Arguments.createMap().apply {
                    putString("id", s.id)
                    putString("type", s.type)
                    putString("title", s.title)
                    putString("subtitle", s.subtitle)
                    putString("folderId", s.folderId)
                    putString("folderName", s.folderName)
                    putBoolean("isFavorite", s.isFavorite)
                    putDouble("updatedAt", s.updatedAt.toDouble())
                    if (s.lastUsedAt != null) putDouble("lastUsedAt", s.lastUsedAt.toDouble())

                    val tagsArray = Arguments.createArray()
                    for (t in s.tags) tagsArray.pushString(t)
                    putArray("tags", tagsArray)

                    if (s.extraData.containsKey("cardBrand")) {
                        putString("cardBrand", s.extraData["cardBrand"] as? String)
                    }
                    if (s.extraData.containsKey("maskedNumber")) {
                        putString("maskedNumber", s.extraData["maskedNumber"] as? String)
                    }
                    if (s.extraData.containsKey("username")) {
                        putString("username", s.extraData["username"] as? String)
                    }
                    if (s.extraData.containsKey("website")) {
                        putString("website", s.extraData["website"] as? String)
                    }
                    if (s.extraData.containsKey("bankName")) {
                        putString("bankName", s.extraData["bankName"] as? String)
                    }
                    if (s.extraData.containsKey("maskedAccountNumber")) {
                        putString("maskedAccountNumber", s.extraData["maskedAccountNumber"] as? String)
                    }
                }
                array.pushMap(map)
            }

            promise.resolve(array)
        } catch (e: Exception) {
            promise.reject("ERR_SUMMARIES", e.message, e)
        }
    }

    // ---------------------------------------------------------
    // Secret Fetch (On-Demand Single Decrypt)
    // ---------------------------------------------------------

    @ReactMethod
    fun getSecret(itemId: String, fieldName: String, promise: Promise) {
        try {
            if (!sessionManager.isUnlocked()) {
                promise.reject("ERR_LOCKED", "Vault is locked")
                return
            }
            val dek = sessionManager.getActiveDek()
            val item = dao.getItem(itemId) ?: run {
                promise.reject("ERR_NOT_FOUND", "Item not found")
                return
            }

            when (item.type) {
                ItemType.LOGIN -> {
                    val record = dao.getLoginRecord(itemId) ?: run {
                        promise.reject("ERR_NOT_FOUND", "Login record not found")
                        return
                    }
                    if (fieldName == "password") {
                        val pass = AesGcmCipher.decryptToString(record.encryptedPassword, record.passwordIv, dek)
                        dao.updateLastUsed(itemId)
                        promise.resolve(pass)
                    } else if (fieldName == "notes") {
                        promise.resolve(record.notes)
                    } else if (fieldName == "urls") {
                        promise.resolve(record.urlsJson)
                    } else {
                        promise.reject("ERR_FIELD", "Unknown field: $fieldName")
                    }
                }
                ItemType.SECURE_NOTE -> {
                    val note = dao.getSecureNote(itemId) ?: run {
                        promise.reject("ERR_NOT_FOUND", "Note not found")
                        return
                    }
                    if (fieldName == "content") {
                        val content = AesGcmCipher.decryptToString(note.encryptedContent, note.contentIv, dek)
                        dao.updateLastUsed(itemId)
                        promise.resolve(content)
                    } else {
                        promise.reject("ERR_FIELD", "Unknown field: $fieldName")
                    }
                }
                ItemType.CREDENTIAL_CARD -> {
                    val card = dao.getCreditCard(itemId) ?: run {
                        promise.reject("ERR_NOT_FOUND", "Card not found")
                        return
                    }
                    when (fieldName) {
                        "cardNumber" -> {
                            val num = AesGcmCipher.decryptToString(card.encryptedCardNumber, card.cardIv, dek)
                            dao.updateLastUsed(itemId)
                            promise.resolve(num)
                        }
                        "cvv" -> {
                            val cvv = AesGcmCipher.decryptToString(card.encryptedCvv, card.cvvIv, dek)
                            dao.updateLastUsed(itemId)
                            promise.resolve(cvv)
                        }
                        "pin" -> {
                            if (card.encryptedPin != null && card.pinIv != null) {
                                val pin = AesGcmCipher.decryptToString(card.encryptedPin, card.pinIv, dek)
                                dao.updateLastUsed(itemId)
                                promise.resolve(pin)
                            } else {
                                promise.resolve("")
                            }
                        }
                        "cardholderName" -> promise.resolve(card.cardholderName)
                        "expiryMonth" -> promise.resolve(card.expiryMonth)
                        "expiryYear" -> promise.resolve(card.expiryYear)
                        "cardBrand" -> promise.resolve(card.cardBrand)
                        "cardType" -> promise.resolve(card.cardType)
                        "billingZip" -> promise.resolve(card.billingZip)
                        else -> promise.reject("ERR_FIELD", "Unknown field: $fieldName")
                    }
                }
                ItemType.BANK_ACCOUNT -> {
                    val bank = dao.getBankAccount(itemId) ?: run {
                        promise.reject("ERR_NOT_FOUND", "Bank account not found")
                        return
                    }
                    when (fieldName) {
                        "accountNumber" -> {
                            val num = AesGcmCipher.decryptToString(bank.encryptedAccountNumber, bank.accountIv, dek)
                            dao.updateLastUsed(itemId)
                            promise.resolve(num)
                        }
                        "bankName" -> promise.resolve(bank.bankName)
                        "accountHolder" -> promise.resolve(bank.accountHolder)
                        "maskedAccountNumber" -> promise.resolve(bank.maskedAccountNumber)
                        "routingNumber" -> promise.resolve(bank.routingNumber)
                        "swiftBic" -> promise.resolve(bank.swiftBic)
                        "iban" -> promise.resolve(bank.iban)
                        "accountType" -> promise.resolve(bank.accountType)
                        else -> promise.reject("ERR_FIELD", "Unknown field: $fieldName")
                    }
                }
                else -> promise.reject("ERR_UNSUPPORTED", "Secret access not configured for ${item.type}")
            }
        } catch (e: Exception) {
            promise.reject("ERR_SECRET", e.message, e)
        }
    }

    // ---------------------------------------------------------
    // Save / Update Items
    // ---------------------------------------------------------

    @ReactMethod
    fun saveLoginItem(itemData: ReadableMap, promise: Promise) {
        try {
            if (!sessionManager.isUnlocked()) {
                promise.reject("ERR_LOCKED", "Vault is locked")
                return
            }
            val dek = sessionManager.getActiveDek()

            val title = itemData.getString("title") ?: "Untitled"
            val username = itemData.getString("username") ?: ""
            val password = itemData.getString("password") ?: ""
            val folderId = if (itemData.hasKey("folderId") && !itemData.isNull("folderId")) itemData.getString("folderId") else null
            val isFavorite = if (itemData.hasKey("isFavorite")) itemData.getBoolean("isFavorite") else false
            val urls = if (itemData.hasKey("urls")) itemData.getString("urls") ?: "[]" else "[]"
            val notes = if (itemData.hasKey("notes")) itemData.getString("notes") ?: "" else ""

            val tagsList = mutableListOf<String>()
            if (itemData.hasKey("tags")) {
                val tagsArr = itemData.getArray("tags")
                if (tagsArr != null) {
                    for (i in 0 until tagsArr.size()) {
                        tagsArr.getString(i)?.let { tagsList.add(it) }
                    }
                }
            }

            val encPass = AesGcmCipher.encryptString(password, dek)

            val id = dao.insertLoginItem(
                title = title,
                username = username,
                encryptedPassword = encPass.ciphertext,
                passwordIv = encPass.iv,
                urlsJson = urls,
                notes = notes,
                folderId = folderId,
                isFavorite = isFavorite,
                tags = tagsList
            )

            dao.logAuditEvent("ITEM_CREATED", "Login credential created: $title", true)
            promise.resolve(id)
        } catch (e: Exception) {
            promise.reject("ERR_SAVE", e.message, e)
        }
    }

    @ReactMethod
    fun saveSecureNote(noteData: ReadableMap, promise: Promise) {
        try {
            if (!sessionManager.isUnlocked()) {
                promise.reject("ERR_LOCKED", "Vault is locked")
                return
            }
            val dek = sessionManager.getActiveDek()

            val title = noteData.getString("title") ?: "Untitled Note"
            val content = noteData.getString("content") ?: ""
            val folderId = if (noteData.hasKey("folderId") && !noteData.isNull("folderId")) noteData.getString("folderId") else null
            val isFavorite = if (noteData.hasKey("isFavorite")) noteData.getBoolean("isFavorite") else false
            val isRich = if (noteData.hasKey("isRichText")) noteData.getBoolean("isRichText") else false

            val tagsList = mutableListOf<String>()
            if (noteData.hasKey("tags")) {
                val tagsArr = noteData.getArray("tags")
                if (tagsArr != null) {
                    for (i in 0 until tagsArr.size()) {
                        tagsArr.getString(i)?.let { tagsList.add(it) }
                    }
                }
            }

            val encContent = AesGcmCipher.encryptString(content, dek)

            val id = dao.insertSecureNote(
                title = title,
                encryptedContent = encContent.ciphertext,
                contentIv = encContent.iv,
                folderId = folderId,
                isFavorite = isFavorite,
                tags = tagsList,
                isRichText = isRich
            )

            dao.logAuditEvent("NOTE_CREATED", "Secure note created: $title", true)
            promise.resolve(id)
        } catch (e: Exception) {
            promise.reject("ERR_SAVE", e.message, e)
        }
    }

    @ReactMethod
    fun saveCreditCard(cardData: ReadableMap, promise: Promise) {
        try {
            if (!sessionManager.isUnlocked()) {
                promise.reject("ERR_LOCKED", "Vault is locked")
                return
            }
            val dek = sessionManager.getActiveDek()

            val title = cardData.getString("title") ?: "Card"
            val holder = cardData.getString("cardholderName") ?: ""
            val number = cardData.getString("cardNumber") ?: ""
            val month = cardData.getString("expiryMonth") ?: ""
            val year = cardData.getString("expiryYear") ?: ""
            val cvv = cardData.getString("cvv") ?: ""
            val brand = cardData.getString("cardBrand") ?: "Card"
            val pin = if (cardData.hasKey("pin")) cardData.getString("pin") ?: "" else ""
            val cardType = if (cardData.hasKey("cardType")) cardData.getString("cardType") ?: "Credit" else "Credit"
            val billingZip = if (cardData.hasKey("billingZip")) cardData.getString("billingZip") ?: "" else ""
            val folderId = if (cardData.hasKey("folderId") && !cardData.isNull("folderId")) cardData.getString("folderId") else null
            val isFavorite = if (cardData.hasKey("isFavorite")) cardData.getBoolean("isFavorite") else false

            val masked = if (number.length >= 4) {
                "•••• •••• •••• " + number.takeLast(4)
            } else {
                "••••"
            }

            val encNum = AesGcmCipher.encryptString(number, dek)
            val encCvv = AesGcmCipher.encryptString(cvv, dek)
            val encPin = if (pin.isNotEmpty()) AesGcmCipher.encryptString(pin, dek) else null

            val tags = mutableListOf<String>()
            if (cardData.hasKey("tags")) {
                val tagsArr = cardData.getArray("tags")
                if (tagsArr != null) {
                    for (i in 0 until tagsArr.size()) {
                        tagsArr.getString(i)?.let { tags.add(it) }
                    }
                }
            }

            val id = dao.insertCreditCard(
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

            dao.logAuditEvent("CARD_CREATED", "Credit card created: $title", true)
            promise.resolve(id)
        } catch (e: Exception) {
            promise.reject("ERR_SAVE", e.message, e)
        }
    }

    @ReactMethod
    fun saveBankAccount(bankData: ReadableMap, promise: Promise) {
        try {
            if (!sessionManager.isUnlocked()) {
                promise.reject("ERR_LOCKED", "Vault is locked")
                return
            }
            val dek = sessionManager.getActiveDek()

            val title = bankData.getString("title") ?: "Bank Account"
            val bankName = bankData.getString("bankName") ?: ""
            val accountHolder = bankData.getString("accountHolder") ?: ""
            val accountNumber = bankData.getString("accountNumber") ?: ""
            val routingNumber = if (bankData.hasKey("routingNumber")) bankData.getString("routingNumber") ?: "" else ""
            val swiftBic = if (bankData.hasKey("swiftBic")) bankData.getString("swiftBic") ?: "" else ""
            val iban = if (bankData.hasKey("iban")) bankData.getString("iban") ?: "" else ""
            val accountType = if (bankData.hasKey("accountType")) bankData.getString("accountType") ?: "Checking" else "Checking"
            val folderId = if (bankData.hasKey("folderId") && !bankData.isNull("folderId")) bankData.getString("folderId") else null
            val isFavorite = if (bankData.hasKey("isFavorite")) bankData.getBoolean("isFavorite") else false

            val masked = if (accountNumber.length >= 4) {
                "•••• " + accountNumber.takeLast(4)
            } else {
                "••••"
            }

            val encAcc = AesGcmCipher.encryptString(accountNumber, dek)

            val tags = mutableListOf<String>()
            if (bankData.hasKey("tags")) {
                val tagsArr = bankData.getArray("tags")
                if (tagsArr != null) {
                    for (i in 0 until tagsArr.size()) {
                        tagsArr.getString(i)?.let { tags.add(it) }
                    }
                }
            }

            val id = dao.insertBankAccount(
                title = title,
                bankName = bankName,
                accountHolder = accountHolder,
                maskedAccountNumber = masked,
                encryptedAccountNumber = encAcc.ciphertext,
                accountIv = encAcc.iv,
                routingNumber = routingNumber,
                swiftBic = swiftBic,
                iban = iban,
                accountType = accountType,
                folderId = folderId,
                isFavorite = isFavorite,
                tags = tags
            )

            dao.logAuditEvent("BANK_ACCOUNT_CREATED", "Bank account created: $title", true)
            promise.resolve(id)
        } catch (e: Exception) {
            promise.reject("ERR_SAVE", e.message, e)
        }
    }

    @ReactMethod
    fun toggleFavorite(itemId: String, promise: Promise) {
        try {
            val fav = dao.toggleFavorite(itemId)
            promise.resolve(fav)
        } catch (e: Exception) {
            promise.reject("ERR_FAVORITE", e.message, e)
        }
    }

    @ReactMethod
    fun deleteItem(itemId: String, permanently: Boolean, promise: Promise) {
        try {
            dao.deleteItem(itemId, permanently)
            dao.logAuditEvent("ITEM_DELETED", "Item deleted: $itemId", true)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_DELETE", e.message, e)
        }
    }

    // ---------------------------------------------------------
    // Folders & Tags
    // ---------------------------------------------------------

    @ReactMethod
    fun getFolders(promise: Promise) {
        try {
            val list = dao.getFolders()
            val arr = Arguments.createArray()
            for (f in list) {
                val map = Arguments.createMap().apply {
                    putString("id", f.id)
                    putString("name", f.name)
                    putString("color", f.color)
                    putString("icon", f.icon)
                }
                arr.pushMap(map)
            }
            promise.resolve(arr)
        } catch (e: Exception) {
            promise.reject("ERR_FOLDERS", e.message, e)
        }
    }

    @ReactMethod
    fun createFolder(name: String, color: String, icon: String, promise: Promise) {
        try {
            val f = dao.createFolder(name, color, icon)
            val map = Arguments.createMap().apply {
                putString("id", f.id)
                putString("name", f.name)
                putString("color", f.color)
                putString("icon", f.icon)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_FOLDER_CREATE", e.message, e)
        }
    }

    @ReactMethod
    fun deleteFolder(folderId: String, promise: Promise) {
        try {
            dao.deleteFolder(folderId)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_FOLDER_DELETE", e.message, e)
        }
    }

    @ReactMethod
    fun getTags(promise: Promise) {
        try {
            val list = dao.getTags()
            val arr = Arguments.createArray()
            for (t in list) {
                val map = Arguments.createMap().apply {
                    putString("id", t.id)
                    putString("name", t.name)
                    putString("color", t.color)
                }
                arr.pushMap(map)
            }
            promise.resolve(arr)
        } catch (e: Exception) {
            promise.reject("ERR_TAGS", e.message, e)
        }
    }

    // ---------------------------------------------------------
    // Security Dashboard & Analysis
    // ---------------------------------------------------------

    @ReactMethod
    fun getSecurityAnalysis(promise: Promise) {
        try {
            if (!sessionManager.isUnlocked()) {
                promise.reject("ERR_LOCKED", "Vault is locked")
                return
            }
            val dek = sessionManager.getActiveDek()
            val list = dao.getAllLoginCredentialsForSecurityAnalysis()

            val now = System.currentTimeMillis()
            val ninetyDaysMs = TimeUnit.DAYS.toMillis(90)

            var weakCount = 0
            var oldCount = 0
            val passwordHashes = mutableMapOf<String, MutableList<String>>()
            val weakItemIds = Arguments.createArray()
            val reusedItemIds = Arguments.createArray()
            val oldItemIds = Arguments.createArray()

            val md = MessageDigest.getInstance("SHA-256")

            for ((item, cred) in list) {
                val pass = try {
                    AesGcmCipher.decryptToString(cred.encryptedPassword, cred.passwordIv, dek)
                } catch (e: Exception) {
                    continue
                }

                val strength = SecureRandomGenerator.calculateStrength(pass)
                if (strength.isWeak) {
                    weakCount++
                    weakItemIds.pushString(item.id)
                }

                if (now - cred.lastChangedAt > ninetyDaysMs) {
                    oldCount++
                    oldItemIds.pushString(item.id)
                }

                val passHash = md.digest(pass.toByteArray()).joinToString("") { "%02x".format(it) }
                val ids = passwordHashes.getOrPut(passHash) { mutableListOf() }
                ids.add(item.id)
            }

            var reusedCount = 0
            for ((_, ids) in passwordHashes) {
                if (ids.size > 1) {
                    reusedCount += ids.size
                    for (id in ids) reusedItemIds.pushString(id)
                }
            }

            val total = list.size
            val score = if (total == 0) {
                100
            } else {
                var calculated = 100
                val weakPenalty = (weakCount.toDouble() / total) * 40.0
                val reusedPenalty = (reusedCount.toDouble() / total) * 35.0
                val oldPenalty = (oldCount.toDouble() / total) * 25.0
                calculated = (calculated - weakPenalty - reusedPenalty - oldPenalty).toInt().coerceIn(0, 100)
                calculated
            }

            val result = Arguments.createMap().apply {
                putInt("score", score)
                putInt("totalItems", total)
                putInt("weakCount", weakCount)
                putInt("reusedCount", reusedCount)
                putInt("oldCount", oldCount)
                putArray("weakItemIds", weakItemIds)
                putArray("reusedItemIds", reusedItemIds)
                putArray("oldItemIds", oldItemIds)
            }

            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_ANALYSIS", e.message, e)
        }
    }

    // ---------------------------------------------------------
    // Password Generator
    // ---------------------------------------------------------

    @ReactMethod
    fun generatePassword(options: ReadableMap?, promise: Promise) {
        try {
            val length = if (options?.hasKey("length") == true) options.getInt("length") else 20
            val upper = if (options?.hasKey("includeUppercase") == true) options.getBoolean("includeUppercase") else true
            val lower = if (options?.hasKey("includeLowercase") == true) options.getBoolean("includeLowercase") else true
            val nums = if (options?.hasKey("includeNumbers") == true) options.getBoolean("includeNumbers") else true
            val syms = if (options?.hasKey("includeSymbols") == true) options.getBoolean("includeSymbols") else true
            val noAmbiguous = if (options?.hasKey("excludeAmbiguous") == true) options.getBoolean("excludeAmbiguous") else true
            val avoidRep = if (options?.hasKey("avoidRepeat") == true) options.getBoolean("avoidRepeat") else false

            val pass = SecureRandomGenerator.generatePassword(
                PasswordGeneratorOptions(
                    length = length,
                    includeUppercase = upper,
                    includeLowercase = lower,
                    includeNumbers = nums,
                    includeSymbols = syms,
                    excludeAmbiguous = noAmbiguous,
                    avoidRepeat = avoidRep
                )
            )

            val strength = SecureRandomGenerator.calculateStrength(pass)
            val map = Arguments.createMap().apply {
                putString("password", pass)
                putInt("score", strength.score)
                putDouble("entropy", strength.entropyBits)
                putBoolean("isWeak", strength.isWeak)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_GEN", e.message, e)
        }
    }

    @ReactMethod
    fun generatePassphrase(options: ReadableMap?, promise: Promise) {
        try {
            val count = if (options?.hasKey("wordCount") == true) options.getInt("wordCount") else 4
            val sep = if (options?.hasKey("separator") == true) options.getString("separator") ?: "-" else "-"
            val cap = if (options?.hasKey("capitalize") == true) options.getBoolean("capitalize") else true
            val num = if (options?.hasKey("includeNumber") == true) options.getBoolean("includeNumber") else true

            val phrase = SecureRandomGenerator.generatePassphrase(
                PassphraseOptions(
                    wordCount = count,
                    separator = sep,
                    capitalize = cap,
                    includeNumber = num
                )
            )

            val strength = SecureRandomGenerator.calculateStrength(phrase)
            val map = Arguments.createMap().apply {
                putString("passphrase", phrase)
                putInt("score", strength.score)
                putDouble("entropy", strength.entropyBits)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_GEN", e.message, e)
        }
    }

    // ---------------------------------------------------------
    // App Settings & Audit
    // ---------------------------------------------------------

    @ReactMethod
    fun getSettings(promise: Promise) {
        try {
            val s = dao.getSettings()
            val map = Arguments.createMap().apply {
                putInt("autoLockSeconds", s.autoLockSeconds)
                putBoolean("biometricEnabled", s.biometricEnabled)
                putBoolean("screenSecurity", s.screenSecurity)
                putInt("clipboardClearSeconds", s.clipboardClearSeconds)
                putString("language", s.language)
                putString("theme", s.theme)
                putBoolean("showWebsiteIcons", s.showWebsiteIcons)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_SETTINGS", e.message, e)
        }
    }

    @ReactMethod
    fun updateSettings(settingsMap: ReadableMap, promise: Promise) {
        try {
            val current = dao.getSettings()
            val updated = current.copy(
                autoLockSeconds = if (settingsMap.hasKey("autoLockSeconds")) settingsMap.getInt("autoLockSeconds") else current.autoLockSeconds,
                biometricEnabled = if (settingsMap.hasKey("biometricEnabled")) settingsMap.getBoolean("biometricEnabled") else current.biometricEnabled,
                screenSecurity = if (settingsMap.hasKey("screenSecurity")) settingsMap.getBoolean("screenSecurity") else current.screenSecurity,
                clipboardClearSeconds = if (settingsMap.hasKey("clipboardClearSeconds")) settingsMap.getInt("clipboardClearSeconds") else current.clipboardClearSeconds,
                language = if (settingsMap.hasKey("language")) settingsMap.getString("language") ?: current.language else current.language,
                theme = if (settingsMap.hasKey("theme")) settingsMap.getString("theme") ?: current.theme else current.theme,
                showWebsiteIcons = if (settingsMap.hasKey("showWebsiteIcons")) settingsMap.getBoolean("showWebsiteIcons") else current.showWebsiteIcons
            )
            dao.updateSettings(updated)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_SETTINGS", e.message, e)
        }
    }

    @ReactMethod
    fun getAuditEvents(limit: Int, promise: Promise) {
        try {
            val list = dao.getAuditEvents(limit.coerceIn(1, 200))
            val arr = Arguments.createArray()
            for (evt in list) {
                val map = Arguments.createMap().apply {
                    putString("id", evt.id)
                    putDouble("timestamp", evt.timestamp.toDouble())
                    putString("eventType", evt.eventType)
                    putString("details", evt.details)
                    putBoolean("isSuccess", evt.isSuccess)
                }
                arr.pushMap(map)
            }
            promise.resolve(arr)
        } catch (e: Exception) {
            promise.reject("ERR_AUDIT", e.message, e)
        }
    }

    // ---------------------------------------------------------
    // Sensitive Information Share (Encrypted Capsule)
    // ---------------------------------------------------------

    @ReactMethod
    fun encryptSharePayload(plainText: String, passphrase: String, promise: Promise) {
        val passChars = passphrase.toCharArray()
        try {
            val salt = ByteArray(16)
            java.security.SecureRandom().nextBytes(salt)

            val spec = javax.crypto.spec.PBEKeySpec(passChars, salt, 10000, 256)
            val factory = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            val keyBytes = factory.generateSecret(spec).encoded

            val encrypted = AesGcmCipher.encryptString(plainText, keyBytes)
            MemorySecurity.wipe(keyBytes)

            val saltB64 = android.util.Base64.encodeToString(salt, android.util.Base64.NO_WRAP)
            val ivB64 = android.util.Base64.encodeToString(encrypted.iv, android.util.Base64.NO_WRAP)
            val cipherB64 = android.util.Base64.encodeToString(encrypted.ciphertext, android.util.Base64.NO_WRAP)

            val capsule = "VKSHARE1.$saltB64.$ivB64.$cipherB64"
            dao.logAuditEvent("SECRET_SHARED", "Encrypted share capsule created", true)
            promise.resolve(capsule)
        } catch (e: Exception) {
            promise.reject("ERR_ENCRYPT_SHARE", e.message, e)
        } finally {
            MemorySecurity.wipe(passChars)
        }
    }

    @ReactMethod
    fun decryptSharePayload(capsule: String, passphrase: String, promise: Promise) {
        val passChars = passphrase.toCharArray()
        try {
            val parts = capsule.trim().split(".")
            if (parts.size != 4 || parts[0] != "VKSHARE1") {
                promise.reject("ERR_FORMAT", "Invalid or corrupted share capsule format")
                return
            }

            val salt = android.util.Base64.decode(parts[1], android.util.Base64.NO_WRAP)
            val iv = android.util.Base64.decode(parts[2], android.util.Base64.NO_WRAP)
            val ciphertext = android.util.Base64.decode(parts[3], android.util.Base64.NO_WRAP)

            val spec = javax.crypto.spec.PBEKeySpec(passChars, salt, 10000, 256)
            val factory = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            val keyBytes = factory.generateSecret(spec).encoded

            val plain = AesGcmCipher.decryptToString(ciphertext, iv, keyBytes)
            MemorySecurity.wipe(keyBytes)

            dao.logAuditEvent("SECRET_DECRYPTED", "Encrypted share capsule opened", true)
            promise.resolve(plain)
        } catch (e: Exception) {
            promise.reject("ERR_DECRYPT_SHARE", "Decryption failed. Incorrect passphrase or corrupted payload.", e)
        } finally {
            MemorySecurity.wipe(passChars)
        }
    }

    // ---------------------------------------------------------
    // Secure Media & File Sharing (Zero-Knowledge AES-256-GCM)
    // ---------------------------------------------------------

    @ReactMethod
    fun encryptFile(inputUriOrPath: String, passphrase: String, hint: String, promise: Promise) {
        val passChars = passphrase.toCharArray()
        try {
            val context = reactApplicationContext
            var fileName = "media_file"
            var mimeType = "application/octet-stream"
            val fileBytes: ByteArray

            if (inputUriOrPath.startsWith("content://")) {
                val uri = android.net.Uri.parse(inputUriOrPath)
                val cursor = context.contentResolver.query(uri, null, null, null, null)
                cursor?.use {
                    if (it.moveToFirst()) {
                        val nameIndex = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                        if (nameIndex >= 0) fileName = it.getString(nameIndex) ?: fileName
                    }
                }
                mimeType = context.contentResolver.getType(uri) ?: mimeType
                val inputStream = context.contentResolver.openInputStream(uri)
                    ?: throw java.io.FileNotFoundException("Cannot open stream for URI: $inputUriOrPath")
                fileBytes = inputStream.readBytes()
                inputStream.close()
            } else {
                val cleanPath = if (inputUriOrPath.startsWith("file://")) inputUriOrPath.substring(7) else inputUriOrPath
                val f = java.io.File(cleanPath)
                if (!f.exists()) throw java.io.FileNotFoundException("File not found at $cleanPath")
                fileName = f.name
                fileBytes = f.readBytes()
                val ext = android.webkit.MimeTypeMap.getFileExtensionFromUrl(f.name)
                if (ext != null) {
                    mimeType = android.webkit.MimeTypeMap.getSingleton().getMimeTypeFromExtension(ext.lowercase()) ?: mimeType
                }
            }

            val salt = ByteArray(16)
            java.security.SecureRandom().nextBytes(salt)

            val spec = javax.crypto.spec.PBEKeySpec(passChars, salt, 10000, 256)
            val factory = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            val keyBytes = factory.generateSecret(spec).encoded

            val encryptedPayload = AesGcmCipher.encrypt(fileBytes, keyBytes)

            // Encrypt metadata JSON
            val metaJson = JSONObject().apply {
                put("fileName", fileName)
                put("mimeType", mimeType)
                put("hint", hint)
                put("sizeBytes", fileBytes.size)
                put("timestamp", System.currentTimeMillis())
            }.toString()
            val encryptedMeta = AesGcmCipher.encryptString(metaJson, keyBytes)
            MemorySecurity.wipe(keyBytes)

            // Output container: encrypted_shares directory
            val shareDir = java.io.File(context.cacheDir, "encrypted_shares").apply { mkdirs() }
            val cleanBaseName = fileName.replace("[^a-zA-Z0-9._-]".toRegex(), "_")
            val outFile = java.io.File(shareDir, "$cleanBaseName.vkfile")

            val outStream = java.io.FileOutputStream(outFile)
            // 1. Magic Header (8 bytes)
            outStream.write("VKFILE01".toByteArray(Charsets.US_ASCII))
            // 2. Salt (16 bytes)
            outStream.write(salt)
            // 3. Meta IV (12 bytes) + Meta Length (4 bytes) + Meta Ciphertext
            outStream.write(encryptedMeta.iv)
            val metaBytes = encryptedMeta.ciphertext
            val metaLenBuffer = java.nio.ByteBuffer.allocate(4).putInt(metaBytes.size).array()
            outStream.write(metaLenBuffer)
            outStream.write(metaBytes)
            // 4. Payload IV (12 bytes) + Payload Length (4 bytes) + Payload Ciphertext
            outStream.write(encryptedPayload.iv)
            val payloadBytes = encryptedPayload.ciphertext
            val payloadLenBuffer = java.nio.ByteBuffer.allocate(4).putInt(payloadBytes.size).array()
            outStream.write(payloadLenBuffer)
            outStream.write(payloadBytes)
            outStream.flush()
            outStream.close()

            dao.logAuditEvent("MEDIA_ENCRYPTED", "Encrypted media file: $fileName", true)

            val map = Arguments.createMap().apply {
                putString("outputFilePath", outFile.absolutePath)
                putString("originalName", fileName)
                putString("mimeType", mimeType)
                putDouble("sizeBytes", outFile.length().toDouble())
                putString("hint", hint)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_ENCRYPT_FILE", e.message, e)
        } finally {
            MemorySecurity.wipe(passChars)
        }
    }

    @ReactMethod
    fun decryptFile(encryptedFilePath: String, passphrase: String, promise: Promise) {
        val passChars = passphrase.toCharArray()
        try {
            val context = reactApplicationContext
            val cleanPath = if (encryptedFilePath.startsWith("file://")) encryptedFilePath.substring(7) else encryptedFilePath
            val encFile = java.io.File(cleanPath)
            if (!encFile.exists()) {
                promise.reject("ERR_NOT_FOUND", "Encrypted file does not exist")
                return
            }

            val inStream = java.io.FileInputStream(encFile)
            val header = ByteArray(8)
            inStream.read(header)
            val headerStr = String(header, Charsets.US_ASCII)
            if (headerStr != "VKFILE01") {
                inStream.close()
                promise.reject("ERR_INVALID_FORMAT", "Not a valid VaultKey encrypted file (.vkfile)")
                return
            }

            val salt = ByteArray(16)
            inStream.read(salt)

            val spec = javax.crypto.spec.PBEKeySpec(passChars, salt, 10000, 256)
            val factory = javax.crypto.SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256")
            val keyBytes = factory.generateSecret(spec).encoded

            // Read Meta IV and Meta Length
            val metaIv = ByteArray(12)
            inStream.read(metaIv)
            val metaLenBytes = ByteArray(4)
            inStream.read(metaLenBytes)
            val metaLen = java.nio.ByteBuffer.wrap(metaLenBytes).int
            val metaCipher = ByteArray(metaLen)
            inStream.read(metaCipher)

            val metaJsonStr = AesGcmCipher.decryptToString(metaCipher, metaIv, keyBytes)
            val metaObj = JSONObject(metaJsonStr)
            val origName = metaObj.optString("fileName", "decrypted_media")
            val mimeType = metaObj.optString("mimeType", "application/octet-stream")

            // Read Payload IV and Payload Length
            val payloadIv = ByteArray(12)
            inStream.read(payloadIv)
            val payloadLenBytes = ByteArray(4)
            inStream.read(payloadLenBytes)
            val payloadLen = java.nio.ByteBuffer.wrap(payloadLenBytes).int
            val payloadCipher = ByteArray(payloadLen)
            inStream.read(payloadCipher)
            inStream.close()

            val decryptedBytes = AesGcmCipher.decrypt(payloadCipher, payloadIv, keyBytes)
            MemorySecurity.wipe(keyBytes)

            // Save decrypted file to private cache
            val decDir = java.io.File(context.cacheDir, "decrypted_media").apply { mkdirs() }
            val outFile = java.io.File(decDir, origName)
            java.io.FileOutputStream(outFile).use { it.write(decryptedBytes) }

            dao.logAuditEvent("MEDIA_DECRYPTED", "Decrypted media file: $origName", true)

            val map = Arguments.createMap().apply {
                putString("outputFilePath", outFile.absolutePath)
                putString("fileUri", "file://${outFile.absolutePath}")
                putString("originalName", origName)
                putString("mimeType", mimeType)
                putDouble("sizeBytes", outFile.length().toDouble())
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_DECRYPT_FILE", "Decryption failed. Incorrect passphrase or corrupted file.", e)
        } finally {
            MemorySecurity.wipe(passChars)
        }
    }

    @ReactMethod
    fun shareEncryptedFile(filePath: String, title: String, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("ERR_ACTIVITY", "Current activity not available")
            return
        }

        try {
            val cleanPath = if (filePath.startsWith("file://")) filePath.substring(7) else filePath
            val file = java.io.File(cleanPath)
            if (!file.exists()) {
                promise.reject("ERR_FILE", "File does not exist: $cleanPath")
                return
            }

            val uri = androidx.core.content.FileProvider.getUriForFile(
                reactApplicationContext,
                "${reactApplicationContext.packageName}.fileprovider",
                file
            )

            val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                type = "application/octet-stream"
                putExtra(android.content.Intent.EXTRA_STREAM, uri)
                putExtra(android.content.Intent.EXTRA_SUBJECT, if (title.isNotEmpty()) title else "VaultKey Encrypted File: ${file.name}")
                addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }

            val chooser = android.content.Intent.createChooser(shareIntent, if (title.isNotEmpty()) title else "Share Encrypted Media / File")
            chooser.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(chooser)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_SHARE", e.message, e)
        }
    }

    @ReactMethod
    fun pickFile(mimeType: String, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("ERR_ACTIVITY", "Current activity is null")
            return
        }
        if (pickFilePromise != null) {
            pickFilePromise?.reject("ERR_CANCELLED", "Previous file picker cancelled")
            pickFilePromise = null
        }
        pickFilePromise = promise
        try {
            val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                type = if (mimeType.isNotEmpty()) mimeType else "*/*"
                addCategory(Intent.CATEGORY_OPENABLE)
            }
            activity.startActivityForResult(Intent.createChooser(intent, "Select Media or File"), REQUEST_CODE_PICK_FILE)
        } catch (e: Exception) {
            pickFilePromise = null
            promise.reject("ERR_PICK", e.message, e)
        }
    }

    @ReactMethod
    fun captureMedia(mode: String, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("ERR_ACTIVITY", "Current activity is null")
            return
        }
        if (mediaCapturePromise != null) {
            mediaCapturePromise?.reject("ERR_CANCELLED", "Previous capture cancelled")
            mediaCapturePromise = null
        }
        mediaCapturePromise = promise

        try {
            val context = reactApplicationContext
            val captureDir = java.io.File(context.cacheDir, "camera_captures").apply { mkdirs() }
            val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(Date())

            if (mode.uppercase() == "VIDEO") {
                val videoFile = java.io.File(captureDir, "VID_$timeStamp.mp4")
                cameraCaptureFile = videoFile
                val videoUri = androidx.core.content.FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    videoFile
                )
                cameraCaptureUri = videoUri

                val intent = Intent(MediaStore.ACTION_VIDEO_CAPTURE).apply {
                    putExtra(MediaStore.EXTRA_OUTPUT, videoUri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                }
                activity.startActivityForResult(intent, REQUEST_CODE_CAPTURE_VIDEO)
            } else {
                val photoFile = java.io.File(captureDir, "IMG_$timeStamp.jpg")
                cameraCaptureFile = photoFile
                val photoUri = androidx.core.content.FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    photoFile
                )
                cameraCaptureUri = photoUri

                val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE).apply {
                    putExtra(MediaStore.EXTRA_OUTPUT, photoUri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
                }
                activity.startActivityForResult(intent, REQUEST_CODE_CAPTURE_PHOTO)
            }
        } catch (e: Exception) {
            mediaCapturePromise = null
            cameraCaptureFile = null
            cameraCaptureUri = null
            promise.reject("ERR_CAMERA", e.message, e)
        }
    }

    @ReactMethod
    fun pickMediaFromGallery(mediaType: String, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("ERR_ACTIVITY", "Current activity is null")
            return
        }
        if (galleryPickPromise != null) {
            galleryPickPromise?.reject("ERR_CANCELLED", "Previous gallery picker cancelled")
            galleryPickPromise = null
        }
        galleryPickPromise = promise

        try {
            val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                type = if (mediaType.isNotBlank()) mediaType else "image/*"
                if (mediaType.contains(",") || mediaType == "image/*,video/*") {
                    type = "*/*"
                    putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*"))
                }
                addCategory(Intent.CATEGORY_OPENABLE)
            }
            activity.startActivityForResult(Intent.createChooser(intent, "Select Media"), REQUEST_CODE_PICK_GALLERY)
        } catch (e: Exception) {
            galleryPickPromise = null
            promise.reject("ERR_GALLERY", e.message, e)
        }
    }

    @ReactMethod
    fun saveVaultMedia(mediaData: ReadableMap, promise: Promise) {
        try {
            if (!sessionManager.isUnlocked()) {
                promise.reject("ERR_LOCKED", "Vault is locked")
                return
            }
            val dek = sessionManager.getActiveDek()
            val context = reactApplicationContext

            val title = if (mediaData.hasKey("title")) mediaData.getString("title") ?: "Media" else "Media"
            val inputUriOrPath = mediaData.getString("inputUri") ?: throw IllegalArgumentException("inputUri is required")
            val fileName = if (mediaData.hasKey("fileName")) mediaData.getString("fileName") ?: "media.jpg" else "media.jpg"
            val mimeType = if (mediaData.hasKey("mimeType")) mediaData.getString("mimeType") ?: "image/jpeg" else "image/jpeg"
            val mediaType = if (mediaData.hasKey("mediaType")) mediaData.getString("mediaType") ?: "IMAGE" else "IMAGE"
            val notes = if (mediaData.hasKey("notes")) mediaData.getString("notes") ?: "" else ""
            val folderId = if (mediaData.hasKey("folderId") && !mediaData.isNull("folderId")) mediaData.getString("folderId") else null
            val isFavorite = if (mediaData.hasKey("isFavorite")) mediaData.getBoolean("isFavorite") else false

            val tags = mutableListOf<String>()
            if (mediaData.hasKey("tags")) {
                val tagsArr = mediaData.getArray("tags")
                if (tagsArr != null) {
                    for (i in 0 until tagsArr.size()) {
                        tagsArr.getString(i)?.let { tags.add(it) }
                    }
                }
            }

            // Read media bytes
            val fileBytes: ByteArray
            var tempCaptureFileToDelete: java.io.File? = null

            if (inputUriOrPath.startsWith("content://")) {
                val uri = android.net.Uri.parse(inputUriOrPath)
                val inStream = context.contentResolver.openInputStream(uri)
                    ?: throw java.io.FileNotFoundException("Cannot read media at $inputUriOrPath")
                fileBytes = inStream.readBytes()
                inStream.close()
            } else {
                val cleanPath = if (inputUriOrPath.startsWith("file://")) inputUriOrPath.substring(7) else inputUriOrPath
                val f = java.io.File(cleanPath)
                if (!f.exists()) throw java.io.FileNotFoundException("File not found at $cleanPath")
                fileBytes = f.readBytes()
                if (f.absolutePath.contains("camera_captures")) {
                    tempCaptureFileToDelete = f
                }
            }

            // Encrypt bytes with DEK (AES-256-GCM)
            val encPayload = AesGcmCipher.encrypt(fileBytes, dek)

            // Save encrypted file into internal filesDir/vault_media/<uuid>.enc
            val vaultMediaDir = java.io.File(context.filesDir, "vault_media").apply { mkdirs() }
            val encFileName = "${UUID.randomUUID()}.enc"
            val encFile = java.io.File(vaultMediaDir, encFileName)

            java.io.FileOutputStream(encFile).use { fos ->
                fos.write(encPayload.iv) // 12 bytes IV
                fos.write(encPayload.ciphertext) // Ciphertext + auth tag
            }

            // If captured via camera, overwrite temp file with zeros and delete
            tempCaptureFileToDelete?.let { tf ->
                try {
                    val zeros = ByteArray(tf.length().toInt().coerceAtMost(65536))
                    java.io.FileOutputStream(tf).use { it.write(zeros) }
                    tf.delete()
                } catch (e: Exception) {}
            }

            // Insert into SQLite database
            val id = dao.insertSecureMedia(
                title = title,
                fileName = fileName,
                mimeType = mimeType,
                sizeBytes = fileBytes.size.toLong(),
                encryptedFilePath = encFile.absolutePath,
                mediaType = mediaType,
                notes = notes,
                folderId = folderId,
                isFavorite = isFavorite,
                tags = tags
            )

            dao.logAuditEvent("MEDIA_VAULT_SAVED", "Saved private media: $title ($fileName)", true)
            promise.resolve(id)
        } catch (e: Exception) {
            promise.reject("ERR_SAVE_MEDIA", e.message, e)
        }
    }

    @ReactMethod
    fun getDecryptedMedia(itemId: String, promise: Promise) {
        try {
            if (!sessionManager.isUnlocked()) {
                promise.reject("ERR_LOCKED", "Vault is locked")
                return
            }
            val dek = sessionManager.getActiveDek()
            val context = reactApplicationContext

            val record = dao.getSecureMedia(itemId)
                ?: throw java.io.FileNotFoundException("Media record not found for $itemId")

            val encFile = java.io.File(record.encryptedFilePath)
            if (!encFile.exists()) {
                throw java.io.FileNotFoundException("Encrypted media file not found on disk: ${record.encryptedFilePath}")
            }

            val encBytes = encFile.readBytes()
            if (encBytes.size < 12) {
                throw java.io.IOException("Encrypted media file is corrupted")
            }

            val iv = encBytes.copyOfRange(0, 12)
            val ciphertext = encBytes.copyOfRange(12, encBytes.size)

            val decryptedBytes = AesGcmCipher.decrypt(ciphertext, iv, dek)

            // Save into private cacheDir/decrypted_view/<filename>
            val viewDir = java.io.File(context.cacheDir, "decrypted_view").apply { mkdirs() }
            val outFile = java.io.File(viewDir, record.fileName)
            java.io.FileOutputStream(outFile).use { it.write(decryptedBytes) }

            val map = Arguments.createMap().apply {
                putString("fileUri", "file://${outFile.absolutePath}")
                putString("filePath", outFile.absolutePath)
                putString("fileName", record.fileName)
                putString("mimeType", record.mimeType)
                putDouble("sizeBytes", record.sizeBytes.toDouble())
                putString("mediaType", record.mediaType)
                putString("notes", record.notes)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_DECRYPT_MEDIA", e.message, e)
        }
    }

    @ReactMethod
    fun exportVaultMediaToGallery(itemId: String, promise: Promise) {
        try {
            if (!sessionManager.isUnlocked()) {
                promise.reject("ERR_LOCKED", "Vault is locked")
                return
            }
            val dek = sessionManager.getActiveDek()
            val context = reactApplicationContext

            val record = dao.getSecureMedia(itemId)
                ?: throw java.io.FileNotFoundException("Media record not found for $itemId")

            val encFile = java.io.File(record.encryptedFilePath)
            if (!encFile.exists()) throw java.io.FileNotFoundException("Encrypted file missing")

            val encBytes = encFile.readBytes()
            val iv = encBytes.copyOfRange(0, 12)
            val ciphertext = encBytes.copyOfRange(12, encBytes.size)
            val decryptedBytes = AesGcmCipher.decrypt(ciphertext, iv, dek)

            val resolver = context.contentResolver
            val isVideo = record.mediaType == "VIDEO" || record.mimeType.startsWith("video/")
            val contentUri = if (isVideo) {
                MediaStore.Video.Media.EXTERNAL_CONTENT_URI
            } else {
                MediaStore.Images.Media.EXTERNAL_CONTENT_URI
            }

            val values = android.content.ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, record.fileName)
                put(MediaStore.MediaColumns.MIME_TYPE, record.mimeType)
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                    put(MediaStore.MediaColumns.IS_PENDING, 1)
                    put(
                        MediaStore.MediaColumns.RELATIVE_PATH,
                        if (isVideo) android.os.Environment.DIRECTORY_MOVIES + "/VaultKey" else android.os.Environment.DIRECTORY_PICTURES + "/VaultKey"
                    )
                }
            }

            val itemUri = resolver.insert(contentUri, values)
                ?: throw java.io.IOException("Failed to create MediaStore entry")

            resolver.openOutputStream(itemUri).use { os ->
                if (os == null) throw java.io.IOException("Cannot open output stream")
                os.write(decryptedBytes)
            }

            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                values.clear()
                values.put(MediaStore.MediaColumns.IS_PENDING, 0)
                resolver.update(itemUri, values, null, null)
            }

            dao.logAuditEvent("MEDIA_EXPORTED", "Exported media to gallery: ${record.fileName}", true)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_EXPORT_GALLERY", e.message, e)
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQUEST_CODE_PICK_FILE) {
            val promise = pickFilePromise
            pickFilePromise = null
            if (resultCode == Activity.RESULT_OK && data?.data != null) {
                val uri = data.data!!
                val context = reactApplicationContext
                var fileName = "selected_file"
                var fileSize = 0L
                val mimeType = context.contentResolver.getType(uri) ?: "*/*"

                try {
                    val cursor = context.contentResolver.query(uri, null, null, null, null)
                    cursor?.use {
                        if (it.moveToFirst()) {
                            val nameIndex = it.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                            if (nameIndex >= 0) fileName = it.getString(nameIndex) ?: fileName
                            val sizeIndex = it.getColumnIndex(OpenableColumns.SIZE)
                            if (sizeIndex >= 0) fileSize = it.getLong(sizeIndex)
                        }
                    }
                } catch (e: Exception) {
                    uri.lastPathSegment?.let { fileName = it }
                }

                val map = Arguments.createMap().apply {
                    putString("uri", uri.toString())
                    putString("fileName", fileName)
                    putString("mimeType", mimeType)
                    putDouble("sizeBytes", fileSize.toDouble())
                }
                promise?.resolve(map)
            } else {
                promise?.reject("ERR_CANCELLED", "File selection was cancelled")
            }
        } else if (requestCode == REQUEST_CODE_CAPTURE_PHOTO) {
            val promise = mediaCapturePromise
            mediaCapturePromise = null
            val file = cameraCaptureFile
            val uri = cameraCaptureUri
            if (resultCode == Activity.RESULT_OK && file != null && file.exists() && file.length() > 0) {
                val map = Arguments.createMap().apply {
                    putString("uri", uri.toString())
                    putString("filePath", file.absolutePath)
                    putString("fileName", file.name)
                    putString("mimeType", "image/jpeg")
                    putDouble("sizeBytes", file.length().toDouble())
                    putString("mediaType", "IMAGE")
                }
                promise?.resolve(map)
            } else {
                file?.delete()
                promise?.reject("ERR_CANCELLED", "Camera capture was cancelled")
            }
            cameraCaptureFile = null
            cameraCaptureUri = null
        } else if (requestCode == REQUEST_CODE_CAPTURE_VIDEO) {
            val promise = mediaCapturePromise
            mediaCapturePromise = null
            val file = cameraCaptureFile
            val uri = data?.data ?: cameraCaptureUri
            if (resultCode == Activity.RESULT_OK && uri != null) {
                val map = Arguments.createMap().apply {
                    putString("uri", uri.toString())
                    putString("fileName", file?.name ?: "capture.mp4")
                    putString("mimeType", "video/mp4")
                    putDouble("sizeBytes", (file?.length() ?: 0L).toDouble())
                    putString("mediaType", "VIDEO")
                }
                promise?.resolve(map)
            } else {
                file?.delete()
                promise?.reject("ERR_CANCELLED", "Video capture was cancelled")
            }
            cameraCaptureFile = null
            cameraCaptureUri = null
        } else if (requestCode == REQUEST_CODE_PICK_GALLERY) {
            val promise = galleryPickPromise
            galleryPickPromise = null
            if (resultCode == Activity.RESULT_OK && data?.data != null) {
                val uri = data.data!!
                val context = reactApplicationContext
                var fileName = "media_item"
                var fileSize = 0L
                val mimeType = context.contentResolver.getType(uri) ?: "image/jpeg"

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

                val mediaType = if (mimeType.startsWith("video/")) "VIDEO" else "IMAGE"

                val map = Arguments.createMap().apply {
                    putString("uri", uri.toString())
                    putString("fileName", fileName)
                    putString("mimeType", mimeType)
                    putDouble("sizeBytes", fileSize.toDouble())
                    putString("mediaType", mediaType)
                }
                promise?.resolve(map)
            } else {
                promise?.reject("ERR_CANCELLED", "Media selection was cancelled")
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        // No-op
    }
}