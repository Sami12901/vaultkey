package com.vaultkey.database

import android.content.ContentValues
import net.zetetic.database.sqlcipher.SQLiteDatabase
import org.json.JSONArray
import java.util.UUID

class VaultDao(private val dbHelper: VaultDatabaseHelper) {

    private val db: SQLiteDatabase
        get() = dbHelper.getOpenDatabase()

    // ---------------------------------------------------------
    // Summaries & Search
    // ---------------------------------------------------------

    fun getItemSummaries(
        typeFilter: String? = null,
        folderFilter: String? = null,
        tagFilter: String? = null,
        favoritesOnly: Boolean = false,
        searchQuery: String? = null,
        sortOrder: String = "updated_desc",
        limit: Int = 50,
        offset: Int = 0
    ): List<VaultItemSummary> {
        val whereClauses = mutableListOf<String>()
        val args = mutableListOf<String>()

        whereClauses.add("v.is_trashed = 0")

        if (!typeFilter.isNullOrBlank() && typeFilter != "ALL") {
            whereClauses.add("v.type = ?")
            args.add(typeFilter.uppercase())
        }

        if (!folderFilter.isNullOrBlank()) {
            whereClauses.add("v.folder_id = ?")
            args.add(folderFilter)
        }

        if (favoritesOnly) {
            whereClauses.add("v.is_favorite = 1")
        }

        if (!searchQuery.isNullOrBlank()) {
            val queryPattern = "%$searchQuery%"
            whereClauses.add("(v.title LIKE ? OR f.name LIKE ? OR lc.username LIKE ?)")
            args.add(queryPattern)
            args.add(queryPattern)
            args.add(queryPattern)
        }

        val orderBy = when (sortOrder) {
            "title_asc" -> "v.title COLLATE NOCASE ASC"
            "title_desc" -> "v.title COLLATE NOCASE DESC"
            "updated_asc" -> "v.updated_at ASC"
            "used_desc" -> "v.last_used_at DESC"
            "created_desc" -> "v.created_at DESC"
            else -> "v.updated_at DESC"
        }

        val whereSql = if (whereClauses.isNotEmpty()) "WHERE " + whereClauses.joinToString(" AND ") else ""

        val sql = """
            SELECT 
                v.id, v.type, v.title, v.folder_id, v.is_favorite, v.created_at, v.updated_at, v.last_used_at,
                f.name as folder_name,
                lc.username as login_username,
                cc.cardholder_name, cc.masked_number, cc.card_brand,
                ba.bank_name, ba.masked_account_number,
                api.service_name,
                wifi.ssid,
                lic.software_name,
                lc.urls_json as login_urls,
                sm.file_name, sm.media_type, sm.size_bytes, sm.mime_type,
                auth.issuer, auth.account_name
            FROM vault_items v
            LEFT JOIN folders f ON v.folder_id = f.id
            LEFT JOIN login_credentials lc ON v.id = lc.vault_item_id
            LEFT JOIN credit_cards cc ON v.id = cc.vault_item_id
            LEFT JOIN bank_accounts ba ON v.id = ba.vault_item_id
            LEFT JOIN api_credentials api ON v.id = api.vault_item_id
            LEFT JOIN wifi_credentials wifi ON v.id = wifi.vault_item_id
            LEFT JOIN software_licenses lic ON v.id = lic.vault_item_id
            LEFT JOIN secure_media sm ON v.id = sm.vault_item_id
            LEFT JOIN authenticator_credentials auth ON v.id = auth.vault_item_id
            $whereSql
            ORDER BY $orderBy
            LIMIT $limit OFFSET $offset
        """.trimIndent()

        val cursor = db.rawQuery(sql, args.toTypedArray())
        val summaries = mutableListOf<VaultItemSummary>()

        while (cursor.moveToNext()) {
            val id = cursor.getString(0)
            val type = cursor.getString(1)
            val title = cursor.getString(2)
            val folderId = cursor.getString(3)
            val isFavorite = cursor.getInt(4) == 1
            val updatedAt = cursor.getLong(6)
            val lastUsedAt = if (cursor.isNull(7)) null else cursor.getLong(7)
            val folderName = cursor.getString(8)

            var subtitle: String? = null
            val extraData = mutableMapOf<String, Any?>()

            when (type) {
                ItemType.LOGIN.name -> {
                    subtitle = cursor.getString(9)
                    extraData["username"] = subtitle
                    val urlsJson = if (cursor.columnCount > 18 && !cursor.isNull(18)) cursor.getString(18) else cursor.getString(17)
                    if (!urlsJson.isNullOrBlank()) {
                        try {
                            val arr = org.json.JSONArray(urlsJson)
                            if (arr.length() > 0) {
                                extraData["website"] = arr.getString(0)
                            }
                        } catch (e: Exception) {
                            extraData["website"] = urlsJson
                        }
                    }
                }
                ItemType.CREDENTIAL_CARD.name -> {
                    val cardholder = cursor.getString(10)
                    val masked = cursor.getString(11)
                    val brand = cursor.getString(12)
                    subtitle = "$brand $masked"
                    extraData["maskedNumber"] = masked
                    extraData["cardBrand"] = brand
                }
                ItemType.BANK_ACCOUNT.name -> {
                    val bank = cursor.getString(13)
                    val maskedAcc = cursor.getString(14)
                    subtitle = "$bank ($maskedAcc)"
                    extraData["bankName"] = bank
                    extraData["maskedAccountNumber"] = maskedAcc
                }
                ItemType.SECURE_MEDIA.name -> {
                    val fName = if (cursor.columnCount > 19 && !cursor.isNull(19)) cursor.getString(19) else "Media"
                    val mType = if (cursor.columnCount > 20 && !cursor.isNull(20)) cursor.getString(20) else "IMAGE"
                    val sBytes = if (cursor.columnCount > 21 && !cursor.isNull(21)) cursor.getLong(21) else 0L
                    val sStr = if (sBytes < 1024) "$sBytes B" else if (sBytes < 1024 * 1024) "${sBytes / 1024} KB" else "${sBytes / (1024 * 1024)} MB"
                    subtitle = "$mType • $sStr"
                    extraData["fileName"] = fName
                    extraData["mediaType"] = mType
                    extraData["sizeBytes"] = sBytes
                }
                ItemType.API_CREDENTIAL.name -> {
                    subtitle = cursor.getString(15)
                }
                ItemType.WIFI_CREDENTIAL.name -> {
                    subtitle = cursor.getString(16)
                }
                ItemType.SOFTWARE_LICENSE.name -> {
                    subtitle = cursor.getString(17)
                }
                ItemType.SECURE_NOTE.name -> {
                    subtitle = "Secure Note"
                }
                ItemType.AUTHENTICATOR_2FA.name -> {
                    val authIssuer = if (cursor.columnCount > 23 && !cursor.isNull(23)) cursor.getString(23) else ""
                    val authAccount = if (cursor.columnCount > 24 && !cursor.isNull(24)) cursor.getString(24) else ""
                    subtitle = if (authIssuer.isNotBlank() && authAccount.isNotBlank()) "$authIssuer ($authAccount)" else if (authIssuer.isNotBlank()) authIssuer else authAccount
                    extraData["issuer"] = authIssuer
                    extraData["accountName"] = authAccount
                }
                else -> {
                    subtitle = null
                }
            }

            val tags = getItemTags(id)

            // If filtering by tag, skip if tag not present
            if (!tagFilter.isNullOrBlank() && !tags.contains(tagFilter)) {
                continue
            }

            summaries.add(
                VaultItemSummary(
                    id = id,
                    type = type,
                    title = title,
                    subtitle = subtitle,
                    folderId = folderId,
                    folderName = folderName,
                    isFavorite = isFavorite,
                    updatedAt = updatedAt,
                    lastUsedAt = lastUsedAt,
                    tags = tags,
                    extraData = extraData
                )
            )
        }
        cursor.close()
        return summaries
    }

    fun getItemTags(itemId: String): List<String> {
        val cursor = db.rawQuery(
            "SELECT t.name FROM tags t JOIN item_tags it ON t.id = it.tag_id WHERE it.vault_item_id = ?",
            arrayOf(itemId)
        )
        val tags = mutableListOf<String>()
        while (cursor.moveToNext()) {
            tags.add(cursor.getString(0))
        }
        cursor.close()
        return tags
    }

    fun setItemTags(itemId: String, tagNames: List<String>) {
        db.delete("item_tags", "vault_item_id = ?", arrayOf(itemId))
        for (tagName in tagNames) {
            val trimmed = tagName.trim()
            if (trimmed.isEmpty()) continue
            val tagId = getOrCreateTag(trimmed)
            val cv = ContentValues().apply {
                put("vault_item_id", itemId)
                put("tag_id", tagId)
            }
            db.insertWithOnConflict("item_tags", null, cv, SQLiteDatabase.CONFLICT_IGNORE)
        }
    }

    private fun getOrCreateTag(name: String): String {
        val cursor = db.rawQuery("SELECT id FROM tags WHERE name = ?", arrayOf(name))
        if (cursor.moveToFirst()) {
            val id = cursor.getString(0)
            cursor.close()
            return id
        }
        cursor.close()

        val newId = UUID.randomUUID().toString()
        val cv = ContentValues().apply {
            put("id", newId)
            put("name", name)
            put("color", "#3B82F6")
        }
        db.insert("tags", null, cv)
        return newId
    }

    // ---------------------------------------------------------
    // Login Item CRUD
    // ---------------------------------------------------------

    fun insertLoginItem(
        title: String,
        username: String,
        encryptedPassword: ByteArray,
        passwordIv: ByteArray,
        urlsJson: String = "[]",
        notes: String = "",
        folderId: String? = null,
        isFavorite: Boolean = false,
        tags: List<String> = emptyList()
    ): String {
        val itemId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()

        db.beginTransaction()
        try {
            val itemCv = ContentValues().apply {
                put("id", itemId)
                put("type", ItemType.LOGIN.name)
                put("title", title)
                put("folder_id", folderId)
                put("is_favorite", if (isFavorite) 1 else 0)
                put("created_at", now)
                put("updated_at", now)
                put("is_trashed", 0)
            }
            db.insertOrThrow("vault_items", null, itemCv)

            val loginCv = ContentValues().apply {
                put("vault_item_id", itemId)
                put("username", username)
                put("encrypted_password", encryptedPassword)
                put("password_iv", passwordIv)
                put("urls_json", urlsJson)
                put("notes", notes)
                put("last_changed_at", now)
            }
            db.insertOrThrow("login_credentials", null, loginCv)

            setItemTags(itemId, tags)

            db.setTransactionSuccessful()
            return itemId
        } finally {
            db.endTransaction()
        }
    }

    fun updateLoginItem(
        itemId: String,
        title: String,
        username: String,
        encryptedPassword: ByteArray?,
        passwordIv: ByteArray?,
        urlsJson: String,
        notes: String,
        folderId: String?,
        isFavorite: Boolean,
        tags: List<String>
    ) {
        val now = System.currentTimeMillis()
        db.beginTransaction()
        try {
            val itemCv = ContentValues().apply {
                put("title", title)
                put("folder_id", folderId)
                put("is_favorite", if (isFavorite) 1 else 0)
                put("updated_at", now)
            }
            db.update("vault_items", itemCv, "id = ?", arrayOf(itemId))

            val loginCv = ContentValues().apply {
                put("username", username)
                put("urls_json", urlsJson)
                put("notes", notes)
                if (encryptedPassword != null && passwordIv != null) {
                    put("encrypted_password", encryptedPassword)
                    put("password_iv", passwordIv)
                    put("last_changed_at", now)
                }
            }
            db.update("login_credentials", loginCv, "vault_item_id = ?", arrayOf(itemId))

            setItemTags(itemId, tags)

            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun getLoginRecord(itemId: String): LoginCredential? {
        val cursor = db.rawQuery(
            "SELECT username, encrypted_password, password_iv, urls_json, notes, last_changed_at FROM login_credentials WHERE vault_item_id = ?",
            arrayOf(itemId)
        )
        return if (cursor.moveToFirst()) {
            val cred = LoginCredential(
                vaultItemId = itemId,
                username = cursor.getString(0),
                encryptedPassword = cursor.getBlob(1),
                passwordIv = cursor.getBlob(2),
                urlsJson = cursor.getString(3),
                notes = cursor.getString(4),
                lastChangedAt = cursor.getLong(5)
            )
            cursor.close()
            cred
        } else {
            cursor.close()
            null
        }
    }

    // ---------------------------------------------------------
    // Secure Note CRUD
    // ---------------------------------------------------------

    fun insertSecureNote(
        title: String,
        encryptedContent: ByteArray,
        contentIv: ByteArray,
        folderId: String? = null,
        isFavorite: Boolean = false,
        tags: List<String> = emptyList(),
        isRichText: Boolean = false
    ): String {
        val itemId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        db.beginTransaction()
        try {
            val itemCv = ContentValues().apply {
                put("id", itemId)
                put("type", ItemType.SECURE_NOTE.name)
                put("title", title)
                put("folder_id", folderId)
                put("is_favorite", if (isFavorite) 1 else 0)
                put("created_at", now)
                put("updated_at", now)
                put("is_trashed", 0)
            }
            db.insertOrThrow("vault_items", null, itemCv)

            val noteCv = ContentValues().apply {
                put("vault_item_id", itemId)
                put("encrypted_content", encryptedContent)
                put("content_iv", contentIv)
                put("is_rich_text", if (isRichText) 1 else 0)
            }
            db.insertOrThrow("secure_notes", null, noteCv)

            setItemTags(itemId, tags)
            db.setTransactionSuccessful()
            return itemId
        } finally {
            db.endTransaction()
        }
    }

    fun getSecureNote(itemId: String): SecureNote? {
        val cursor = db.rawQuery(
            "SELECT encrypted_content, content_iv, is_rich_text FROM secure_notes WHERE vault_item_id = ?",
            arrayOf(itemId)
        )
        return if (cursor.moveToFirst()) {
            val note = SecureNote(
                vaultItemId = itemId,
                encryptedContent = cursor.getBlob(0),
                contentIv = cursor.getBlob(1),
                isRichText = cursor.getInt(2) == 1
            )
            cursor.close()
            note
        } else {
            cursor.close()
            null
        }
    }

    // ---------------------------------------------------------
    // Credit Card CRUD
    // ---------------------------------------------------------

    fun insertCreditCard(
        title: String,
        cardholderName: String,
        maskedNumber: String,
        encryptedCardNumber: ByteArray,
        cardIv: ByteArray,
        expiryMonth: String,
        expiryYear: String,
        encryptedCvv: ByteArray,
        cvvIv: ByteArray,
        cardBrand: String,
        encryptedPin: ByteArray? = null,
        pinIv: ByteArray? = null,
        cardType: String = "Credit",
        billingZip: String = "",
        folderId: String? = null,
        isFavorite: Boolean = false,
        tags: List<String> = emptyList()
    ): String {
        val itemId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        db.beginTransaction()
        try {
            val itemCv = ContentValues().apply {
                put("id", itemId)
                put("type", ItemType.CREDENTIAL_CARD.name)
                put("title", title)
                put("folder_id", folderId)
                put("is_favorite", if (isFavorite) 1 else 0)
                put("created_at", now)
                put("updated_at", now)
                put("is_trashed", 0)
            }
            db.insertOrThrow("vault_items", null, itemCv)

            val cardCv = ContentValues().apply {
                put("vault_item_id", itemId)
                put("cardholder_name", cardholderName)
                put("masked_number", maskedNumber)
                put("encrypted_card_number", encryptedCardNumber)
                put("card_iv", cardIv)
                put("expiry_month", expiryMonth)
                put("expiry_year", expiryYear)
                put("encrypted_cvv", encryptedCvv)
                put("cvv_iv", cvvIv)
                put("card_brand", cardBrand)
                if (encryptedPin != null && pinIv != null) {
                    put("encrypted_pin", encryptedPin)
                    put("pin_iv", pinIv)
                }
                put("card_type", cardType)
                put("billing_zip", billingZip)
            }
            db.insertOrThrow("credit_cards", null, cardCv)

            setItemTags(itemId, tags)
            db.setTransactionSuccessful()
            return itemId
        } finally {
            db.endTransaction()
        }
    }

    fun getCreditCard(itemId: String): CreditCardCredential? {
        val cursor = db.rawQuery(
            """
                SELECT cardholder_name, masked_number, encrypted_card_number, card_iv, 
                       expiry_month, expiry_year, encrypted_cvv, cvv_iv, card_brand,
                       encrypted_pin, pin_iv, card_type, billing_zip
                FROM credit_cards WHERE vault_item_id = ?
            """.trimIndent(),
            arrayOf(itemId)
        )
        return if (cursor.moveToFirst()) {
            val card = CreditCardCredential(
                vaultItemId = itemId,
                cardholderName = cursor.getString(0),
                maskedNumber = cursor.getString(1),
                encryptedCardNumber = cursor.getBlob(2),
                cardIv = cursor.getBlob(3),
                expiryMonth = cursor.getString(4),
                expiryYear = cursor.getString(5),
                encryptedCvv = cursor.getBlob(6),
                cvvIv = cursor.getBlob(7),
                cardBrand = cursor.getString(8),
                encryptedPin = if (cursor.columnCount > 9 && !cursor.isNull(9)) cursor.getBlob(9) else null,
                pinIv = if (cursor.columnCount > 10 && !cursor.isNull(10)) cursor.getBlob(10) else null,
                cardType = if (cursor.columnCount > 11 && !cursor.isNull(11)) cursor.getString(11) else "Credit",
                billingZip = if (cursor.columnCount > 12 && !cursor.isNull(12)) cursor.getString(12) else ""
            )
            cursor.close()
            card
        } else {
            cursor.close()
            null
        }
    }

    // ---------------------------------------------------------
    // Bank Account CRUD
    // ---------------------------------------------------------

    fun insertBankAccount(
        title: String,
        bankName: String,
        accountHolder: String,
        maskedAccountNumber: String,
        encryptedAccountNumber: ByteArray,
        accountIv: ByteArray,
        routingNumber: String = "",
        swiftBic: String = "",
        iban: String = "",
        accountType: String = "Checking",
        folderId: String? = null,
        isFavorite: Boolean = false,
        tags: List<String> = emptyList()
    ): String {
        val itemId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        db.beginTransaction()
        try {
            val itemCv = ContentValues().apply {
                put("id", itemId)
                put("type", ItemType.BANK_ACCOUNT.name)
                put("title", title)
                put("folder_id", folderId)
                put("is_favorite", if (isFavorite) 1 else 0)
                put("created_at", now)
                put("updated_at", now)
                put("is_trashed", 0)
            }
            db.insertOrThrow("vault_items", null, itemCv)

            val bankCv = ContentValues().apply {
                put("vault_item_id", itemId)
                put("bank_name", bankName)
                put("account_holder", accountHolder)
                put("masked_account_number", maskedAccountNumber)
                put("encrypted_account_number", encryptedAccountNumber)
                put("account_iv", accountIv)
                put("routing_number", routingNumber)
                put("swift_bic", swiftBic)
                put("iban", iban)
                put("account_type", accountType)
            }
            db.insertOrThrow("bank_accounts", null, bankCv)

            setItemTags(itemId, tags)
            db.setTransactionSuccessful()
            return itemId
        } finally {
            db.endTransaction()
        }
    }

    fun getBankAccount(itemId: String): BankAccountCredential? {
        val cursor = db.rawQuery(
            """
                SELECT bank_name, account_holder, masked_account_number, encrypted_account_number, account_iv,
                       routing_number, swift_bic, iban, account_type
                FROM bank_accounts WHERE vault_item_id = ?
            """.trimIndent(),
            arrayOf(itemId)
        )
        return if (cursor.moveToFirst()) {
            val bank = BankAccountCredential(
                vaultItemId = itemId,
                bankName = cursor.getString(0),
                accountHolder = cursor.getString(1),
                maskedAccountNumber = cursor.getString(2),
                encryptedAccountNumber = cursor.getBlob(3),
                accountIv = cursor.getBlob(4),
                routingNumber = cursor.getString(5),
                swiftBic = if (cursor.columnCount > 6 && !cursor.isNull(6)) cursor.getString(6) else "",
                iban = if (cursor.columnCount > 7 && !cursor.isNull(7)) cursor.getString(7) else "",
                accountType = if (cursor.columnCount > 8 && !cursor.isNull(8)) cursor.getString(8) else "Checking"
            )
            cursor.close()
            bank
        } else {
            cursor.close()
            null
        }
    }

    // ---------------------------------------------------------
    // Secure Media CRUD
    // ---------------------------------------------------------

    fun insertSecureMedia(
        title: String,
        fileName: String,
        mimeType: String,
        sizeBytes: Long,
        encryptedFilePath: String,
        mediaType: String = "IMAGE",
        notes: String = "",
        folderId: String? = null,
        isFavorite: Boolean = false,
        tags: List<String> = emptyList()
    ): String {
        val itemId = UUID.randomUUID().toString()
        val now = System.currentTimeMillis()
        db.beginTransaction()
        try {
            val itemCv = ContentValues().apply {
                put("id", itemId)
                put("type", ItemType.SECURE_MEDIA.name)
                put("title", title)
                put("folder_id", folderId)
                put("is_favorite", if (isFavorite) 1 else 0)
                put("created_at", now)
                put("updated_at", now)
                put("is_trashed", 0)
            }
            db.insertOrThrow("vault_items", null, itemCv)

            val mediaCv = ContentValues().apply {
                put("vault_item_id", itemId)
                put("file_name", fileName)
                put("mime_type", mimeType)
                put("size_bytes", sizeBytes)
                put("encrypted_file_path", encryptedFilePath)
                put("media_type", mediaType)
                put("notes", notes)
                put("created_at", now)
            }
            db.insertOrThrow("secure_media", null, mediaCv)

            setItemTags(itemId, tags)
            db.setTransactionSuccessful()
            return itemId
        } finally {
            db.endTransaction()
        }
    }

    fun getSecureMedia(itemId: String): SecureMediaRecord? {
        val cursor = db.rawQuery(
            """
                SELECT file_name, mime_type, size_bytes, encrypted_file_path, media_type, notes, created_at
                FROM secure_media WHERE vault_item_id = ?
            """.trimIndent(),
            arrayOf(itemId)
        )
        return if (cursor.moveToFirst()) {
            val media = SecureMediaRecord(
                vaultItemId = itemId,
                fileName = cursor.getString(0),
                mimeType = cursor.getString(1),
                sizeBytes = cursor.getLong(2),
                encryptedFilePath = cursor.getString(3),
                mediaType = cursor.getString(4),
                notes = cursor.getString(5),
                createdAt = cursor.getLong(6)
            )
            cursor.close()
            media
        } else {
            cursor.close()
            null
        }
    }

    // ---------------------------------------------------------
    // General Item Operations
    // ---------------------------------------------------------

    fun getItem(itemId: String): VaultItem? {
        val cursor = db.rawQuery(
            "SELECT id, type, title, folder_id, is_favorite, created_at, updated_at, last_used_at, is_trashed FROM vault_items WHERE id = ?",
            arrayOf(itemId)
        )
        return if (cursor.moveToFirst()) {
            val item = VaultItem(
                id = cursor.getString(0),
                type = ItemType.fromString(cursor.getString(1)),
                title = cursor.getString(2),
                folderId = cursor.getString(3),
                isFavorite = cursor.getInt(4) == 1,
                createdAt = cursor.getLong(5),
                updatedAt = cursor.getLong(6),
                lastUsedAt = if (cursor.isNull(7)) null else cursor.getLong(7),
                isTrashed = cursor.getInt(8) == 1,
                tags = getItemTags(itemId)
            )
            cursor.close()
            item
        } else {
            cursor.close()
            null
        }
    }

    fun toggleFavorite(itemId: String): Boolean {
        val cursor = db.rawQuery("SELECT is_favorite FROM vault_items WHERE id = ?", arrayOf(itemId))
        var newFav = false
        if (cursor.moveToFirst()) {
            newFav = cursor.getInt(0) == 0
            val cv = ContentValues().apply {
                put("is_favorite", if (newFav) 1 else 0)
                put("updated_at", System.currentTimeMillis())
            }
            db.update("vault_items", cv, "id = ?", arrayOf(itemId))
        }
        cursor.close()
        return newFav
    }

    fun updateLastUsed(itemId: String) {
        val cv = ContentValues().apply {
            put("last_used_at", System.currentTimeMillis())
        }
        db.update("vault_items", cv, "id = ?", arrayOf(itemId))
    }

    fun deleteItem(itemId: String, permanently: Boolean = false) {
        if (permanently) {
            val media = getSecureMedia(itemId)
            if (media != null) {
                try {
                    java.io.File(media.encryptedFilePath).delete()
                } catch (e: Exception) {}
            }
            db.delete("vault_items", "id = ?", arrayOf(itemId))
        } else {
            val cv = ContentValues().apply {
                put("is_trashed", 1)
                put("updated_at", System.currentTimeMillis())
            }
            db.update("vault_items", cv, "id = ?", arrayOf(itemId))
        }
    }

    // ---------------------------------------------------------
    // Folders & Tags
    // ---------------------------------------------------------

    fun getFolders(): List<Folder> {
        val cursor = db.rawQuery("SELECT id, name, color, icon, created_at FROM folders ORDER BY name ASC", null)
        val folders = mutableListOf<Folder>()
        while (cursor.moveToNext()) {
            folders.add(
                Folder(
                    id = cursor.getString(0),
                    name = cursor.getString(1),
                    color = cursor.getString(2),
                    icon = cursor.getString(3),
                    createdAt = cursor.getLong(4)
                )
            )
        }
        cursor.close()
        return folders
    }

    fun deleteAllItems(clearFolders: Boolean = false) {
        db.beginTransaction()
        try {
            db.delete("vault_items", null, null)
            if (clearFolders) {
                db.delete("folders", null, null)
            }
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun createFolder(name: String, color: String = "#10B981", icon: String = "folder", id: String? = null): Folder {
        val folder = Folder(
            id = id ?: UUID.randomUUID().toString(),
            name = name,
            color = color,
            icon = icon,
            createdAt = System.currentTimeMillis()
        )
        val cv = ContentValues().apply {
            put("id", folder.id)
            put("name", folder.name)
            put("color", folder.color)
            put("icon", folder.icon)
            put("created_at", folder.createdAt)
        }
        db.insertWithOnConflict("folders", null, cv, SQLiteDatabase.CONFLICT_REPLACE)
        return folder
    }

    fun deleteFolder(folderId: String) {
        db.delete("folders", "id = ?", arrayOf(folderId))
    }

    fun getTags(): List<Tag> {
        val cursor = db.rawQuery("SELECT id, name, color FROM tags ORDER BY name ASC", null)
        val tags = mutableListOf<Tag>()
        while (cursor.moveToNext()) {
            tags.add(
                Tag(
                    id = cursor.getString(0),
                    name = cursor.getString(1),
                    color = cursor.getString(2)
                )
            )
        }
        cursor.close()
        return tags
    }

    // ---------------------------------------------------------
    // Security & Autofill Matching Queries
    // ---------------------------------------------------------

    fun getAllLoginCredentialsForSecurityAnalysis(): List<Pair<VaultItem, LoginCredential>> {
        val sql = """
            SELECT v.id, v.title, v.created_at, v.updated_at,
                   lc.username, lc.encrypted_password, lc.password_iv, lc.urls_json, lc.last_changed_at
            FROM vault_items v
            JOIN login_credentials lc ON v.id = lc.vault_item_id
            WHERE v.is_trashed = 0
        """.trimIndent()

        val cursor = db.rawQuery(sql, null)
        val list = mutableListOf<Pair<VaultItem, LoginCredential>>()
        while (cursor.moveToNext()) {
            val item = VaultItem(
                id = cursor.getString(0),
                type = ItemType.LOGIN,
                title = cursor.getString(1),
                createdAt = cursor.getLong(2),
                updatedAt = cursor.getLong(3)
            )
            val cred = LoginCredential(
                vaultItemId = item.id,
                username = cursor.getString(4),
                encryptedPassword = cursor.getBlob(5),
                passwordIv = cursor.getBlob(6),
                urlsJson = cursor.getString(7),
                lastChangedAt = cursor.getLong(8)
            )
            list.add(Pair(item, cred))
        }
        cursor.close()
        return list
    }

    fun findLoginsByDomain(domain: String): List<Pair<VaultItem, LoginCredential>> {
        val all = getAllLoginCredentialsForSecurityAnalysis()
        val normalizedTarget = domain.lowercase().trim()

        return all.filter { (_, cred) ->
            try {
                val urls = JSONArray(cred.urlsJson)
                var matched = false
                for (i in 0 until urls.length()) {
                    val urlStr = urls.getString(i).lowercase().trim()
                    if (urlStr.contains(normalizedTarget) || normalizedTarget.contains(urlStr)) {
                        matched = true
                        break
                    }
                }
                matched
            } catch (e: Exception) {
                false
            }
        }
    }

    // ---------------------------------------------------------
    // Authenticator 2FA CRUD
    // ---------------------------------------------------------

    fun insertAuthenticatorItem(
        title: String,
        issuer: String,
        accountName: String,
        encryptedSecret: ByteArray,
        secretIv: ByteArray,
        algorithm: String = "SHA1",
        digits: Int = 6,
        period: Int = 30,
        folderId: String? = null,
        isFavorite: Boolean = false,
        tags: List<String> = emptyList()
    ): String {
        val itemId = java.util.UUID.randomUUID().toString()
        val now = System.currentTimeMillis()

        db.beginTransaction()
        try {
            val itemCv = ContentValues().apply {
                put("id", itemId)
                put("type", ItemType.AUTHENTICATOR_2FA.name)
                put("title", title)
                put("folder_id", folderId)
                put("is_favorite", if (isFavorite) 1 else 0)
                put("created_at", now)
                put("updated_at", now)
                put("is_trashed", 0)
            }
            db.insertOrThrow("vault_items", null, itemCv)

            val cv = ContentValues().apply {
                put("vault_item_id", itemId)
                put("issuer", issuer)
                put("account_name", accountName)
                put("encrypted_secret", encryptedSecret)
                put("secret_iv", secretIv)
                put("algorithm", algorithm)
                put("digits", digits)
                put("period", period)
            }
            db.insertOrThrow("authenticator_credentials", null, cv)

            for (tag in tags) {
                val tagId = getOrCreateTag(tag)
                val tagCv = ContentValues().apply {
                    put("item_id", itemId)
                    put("tag_id", tagId)
                }
                db.insertWithOnConflict("item_tags", null, tagCv, SQLiteDatabase.CONFLICT_IGNORE)
            }

            db.setTransactionSuccessful()
            return itemId
        } finally {
            db.endTransaction()
        }
    }

    fun getAuthenticatorRecord(itemId: String): AuthenticatorCredential? {
        val cursor = db.rawQuery(
            "SELECT vault_item_id, issuer, account_name, encrypted_secret, secret_iv, algorithm, digits, period FROM authenticator_credentials WHERE vault_item_id = ?",
            arrayOf(itemId)
        )
        return if (cursor.moveToFirst()) {
            val record = AuthenticatorCredential(
                vaultItemId = cursor.getString(0),
                issuer = cursor.getString(1),
                accountName = cursor.getString(2),
                encryptedSecret = cursor.getBlob(3),
                secretIv = cursor.getBlob(4),
                algorithm = cursor.getString(5),
                digits = cursor.getInt(6),
                period = cursor.getInt(7)
            )
            cursor.close()
            record
        } else {
            cursor.close()
            null
        }
    }

    fun getAllAuthenticatorRecords(): List<AuthenticatorCredential> {
        val cursor = db.rawQuery(
            "SELECT vault_item_id, issuer, account_name, encrypted_secret, secret_iv, algorithm, digits, period FROM authenticator_credentials",
            null
        )
        val list = mutableListOf<AuthenticatorCredential>()
        while (cursor.moveToNext()) {
            list.add(
                AuthenticatorCredential(
                    vaultItemId = cursor.getString(0),
                    issuer = cursor.getString(1),
                    accountName = cursor.getString(2),
                    encryptedSecret = cursor.getBlob(3),
                    secretIv = cursor.getBlob(4),
                    algorithm = cursor.getString(5),
                    digits = cursor.getInt(6),
                    period = cursor.getInt(7)
                )
            )
        }
        cursor.close()
        return list
    }

    // ---------------------------------------------------------
    // Audit Logging
    // ---------------------------------------------------------

    fun logAuditEvent(eventType: String, details: String, isSuccess: Boolean = true) {
        val cv = ContentValues().apply {
            put("id", UUID.randomUUID().toString())
            put("timestamp", System.currentTimeMillis())
            put("event_type", eventType)
            put("details", details)
            put("is_success", if (isSuccess) 1 else 0)
        }
        db.insert("audit_events", null, cv)
    }

    fun getAuditEvents(limit: Int = 100): List<AuditEvent> {
        val cursor = db.rawQuery(
            "SELECT id, timestamp, event_type, details, is_success FROM audit_events ORDER BY timestamp DESC LIMIT ?",
            arrayOf(limit.toString())
        )
        val events = mutableListOf<AuditEvent>()
        while (cursor.moveToNext()) {
            events.add(
                AuditEvent(
                    id = cursor.getString(0),
                    timestamp = cursor.getLong(1),
                    eventType = cursor.getString(2),
                    details = cursor.getString(3),
                    isSuccess = cursor.getInt(4) == 1
                )
            )
        }
        cursor.close()
        return events
    }

    // ---------------------------------------------------------
    // App Settings
    // ---------------------------------------------------------

    fun getSettings(): AppSettings {
        val cursor = db.rawQuery("SELECT auto_lock_seconds, biometric_enabled, screen_security, clipboard_clear_seconds, language, theme, show_website_icons FROM app_settings WHERE id = 1", null)
        return if (cursor.moveToFirst()) {
            val settings = AppSettings(
                autoLockSeconds = cursor.getInt(0),
                biometricEnabled = cursor.getInt(1) == 1,
                screenSecurity = cursor.getInt(2) == 1,
                clipboardClearSeconds = cursor.getInt(3),
                language = cursor.getString(4),
                theme = cursor.getString(5),
                showWebsiteIcons = if (cursor.columnCount > 6 && !cursor.isNull(6)) cursor.getInt(6) == 1 else true
            )
            cursor.close()
            settings
        } else {
            cursor.close()
            AppSettings()
        }
    }

    fun updateSettings(settings: AppSettings) {
        val cv = ContentValues().apply {
            put("auto_lock_seconds", settings.autoLockSeconds)
            put("biometric_enabled", if (settings.biometricEnabled) 1 else 0)
            put("screen_security", if (settings.screenSecurity) 1 else 0)
            put("clipboard_clear_seconds", settings.clipboardClearSeconds)
            put("language", settings.language)
            put("theme", settings.theme)
            put("show_website_icons", if (settings.showWebsiteIcons) 1 else 0)
        }
        db.update("app_settings", cv, "id = 1", null)
    }
}
