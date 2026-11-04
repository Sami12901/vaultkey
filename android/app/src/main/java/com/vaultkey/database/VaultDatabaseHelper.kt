package com.vaultkey.database

import android.content.Context
import net.zetetic.database.sqlcipher.SQLiteDatabase
import java.io.File

class VaultDatabaseHelper(private val context: Context) {

    companion object {
        const val DATABASE_NAME = "vaultkey_encrypted.db"
        const val DATABASE_VERSION = 1

        init {
            try {
                System.loadLibrary("sqlcipher")
            } catch (e: UnsatisfiedLinkError) {
                // Already loaded or loaded by system
            }
        }
    }

    private var database: SQLiteDatabase? = null

    fun getDatabaseFile(): File {
        return context.getDatabasePath(DATABASE_NAME)
    }

    fun databaseExists(): Boolean {
        return getDatabaseFile().exists()
    }

    fun open(databaseKeyBytes: ByteArray): SQLiteDatabase {
        if (database != null && database!!.isOpen) {
            return database!!
        }

        val dbFile = getDatabaseFile()
        dbFile.parentFile?.mkdirs()

        val db = SQLiteDatabase.openOrCreateDatabase(dbFile, databaseKeyBytes, null, null)
        createTablesIfNotExist(db)
        database = db
        return db
    }

    fun getOpenDatabase(): SQLiteDatabase {
        val db = database
        if (db == null || !db.isOpen) {
            throw IllegalStateException("Vault database is locked or not opened")
        }
        return db
    }

    fun isOpen(): Boolean {
        return database != null && database!!.isOpen
    }

    fun close() {
        database?.let {
            if (it.isOpen) {
                it.close()
            }
        }
        database = null
    }

    fun cryptoErase(): Boolean {
        close()
        val dbFile = getDatabaseFile()
        val walFile = File(dbFile.path + "-wal")
        val shmFile = File(dbFile.path + "-shm")
        var deleted = true
        if (dbFile.exists()) deleted = deleted && dbFile.delete()
        if (walFile.exists()) deleted = deleted && walFile.delete()
        if (shmFile.exists()) deleted = deleted && shmFile.delete()
        return deleted
    }

    private fun createTablesIfNotExist(db: SQLiteDatabase) {
        db.execSQL("""
            CREATE TABLE IF NOT EXISTS folders (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                color TEXT NOT NULL,
                icon TEXT NOT NULL,
                created_at INTEGER NOT NULL
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL UNIQUE,
                color TEXT NOT NULL
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS vault_items (
                id TEXT PRIMARY KEY NOT NULL,
                type TEXT NOT NULL,
                title TEXT NOT NULL,
                folder_id TEXT,
                is_favorite INTEGER NOT NULL DEFAULT 0,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL,
                last_used_at INTEGER,
                is_trashed INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
            )
        """.trimIndent())

        db.execSQL("CREATE INDEX IF NOT EXISTS idx_vault_items_type ON vault_items(type)")
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_vault_items_folder ON vault_items(folder_id)")
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_vault_items_fav ON vault_items(is_favorite)")
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_vault_items_title ON vault_items(title)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS item_tags (
                vault_item_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                PRIMARY KEY (vault_item_id, tag_id),
                FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE,
                FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS login_credentials (
                vault_item_id TEXT PRIMARY KEY NOT NULL,
                username TEXT NOT NULL,
                encrypted_password BLOB NOT NULL,
                password_iv BLOB NOT NULL,
                urls_json TEXT NOT NULL DEFAULT '[]',
                notes TEXT NOT NULL DEFAULT '',
                last_changed_at INTEGER NOT NULL,
                FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS secure_notes (
                vault_item_id TEXT PRIMARY KEY NOT NULL,
                encrypted_content BLOB NOT NULL,
                content_iv BLOB NOT NULL,
                is_rich_text INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS identities (
                vault_item_id TEXT PRIMARY KEY NOT NULL,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                encrypted_details BLOB NOT NULL,
                details_iv BLOB NOT NULL,
                FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS credit_cards (
                vault_item_id TEXT PRIMARY KEY NOT NULL,
                cardholder_name TEXT NOT NULL,
                masked_number TEXT NOT NULL,
                encrypted_card_number BLOB NOT NULL,
                card_iv BLOB NOT NULL,
                expiry_month TEXT NOT NULL,
                expiry_year TEXT NOT NULL,
                encrypted_cvv BLOB NOT NULL,
                cvv_iv BLOB NOT NULL,
                card_brand TEXT NOT NULL,
                encrypted_pin BLOB,
                pin_iv BLOB,
                card_type TEXT NOT NULL DEFAULT 'Credit',
                billing_zip TEXT NOT NULL DEFAULT '',
                FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE
            )
        """.trimIndent())

        try { db.execSQL("ALTER TABLE credit_cards ADD COLUMN encrypted_pin BLOB") } catch (e: Exception) {}
        try { db.execSQL("ALTER TABLE credit_cards ADD COLUMN pin_iv BLOB") } catch (e: Exception) {}
        try { db.execSQL("ALTER TABLE credit_cards ADD COLUMN card_type TEXT NOT NULL DEFAULT 'Credit'") } catch (e: Exception) {}
        try { db.execSQL("ALTER TABLE credit_cards ADD COLUMN billing_zip TEXT NOT NULL DEFAULT ''") } catch (e: Exception) {}

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS bank_accounts (
                vault_item_id TEXT PRIMARY KEY NOT NULL,
                bank_name TEXT NOT NULL,
                account_holder TEXT NOT NULL,
                masked_account_number TEXT NOT NULL,
                encrypted_account_number BLOB NOT NULL,
                account_iv BLOB NOT NULL,
                routing_number TEXT NOT NULL DEFAULT '',
                swift_bic TEXT NOT NULL DEFAULT '',
                iban TEXT NOT NULL DEFAULT '',
                account_type TEXT NOT NULL DEFAULT 'Checking',
                FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE
            )
        """.trimIndent())

        try { db.execSQL("ALTER TABLE bank_accounts ADD COLUMN swift_bic TEXT NOT NULL DEFAULT ''") } catch (e: Exception) {}
        try { db.execSQL("ALTER TABLE bank_accounts ADD COLUMN iban TEXT NOT NULL DEFAULT ''") } catch (e: Exception) {}
        try { db.execSQL("ALTER TABLE bank_accounts ADD COLUMN account_type TEXT NOT NULL DEFAULT 'Checking'") } catch (e: Exception) {}

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS api_credentials (
                vault_item_id TEXT PRIMARY KEY NOT NULL,
                service_name TEXT NOT NULL,
                username TEXT NOT NULL DEFAULT '',
                encrypted_api_key BLOB NOT NULL,
                api_key_iv BLOB NOT NULL,
                encrypted_secret BLOB NOT NULL,
                secret_iv BLOB NOT NULL,
                endpoint_url TEXT NOT NULL DEFAULT '',
                FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS wifi_credentials (
                vault_item_id TEXT PRIMARY KEY NOT NULL,
                ssid TEXT NOT NULL,
                encrypted_password BLOB NOT NULL,
                wifi_iv BLOB NOT NULL,
                security_type TEXT NOT NULL DEFAULT 'WPA2',
                FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS software_licenses (
                vault_item_id TEXT PRIMARY KEY NOT NULL,
                software_name TEXT NOT NULL,
                encrypted_license_key BLOB NOT NULL,
                license_iv BLOB NOT NULL,
                email TEXT NOT NULL DEFAULT '',
                purchase_date TEXT NOT NULL DEFAULT '',
                FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS passkey_metadata (
                vault_item_id TEXT PRIMARY KEY NOT NULL,
                rp_id TEXT NOT NULL,
                user_name TEXT NOT NULL,
                user_handle TEXT NOT NULL DEFAULT '',
                credential_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE
            )
        """.trimIndent())

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS secure_media (
                vault_item_id TEXT PRIMARY KEY NOT NULL,
                file_name TEXT NOT NULL,
                mime_type TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                encrypted_file_path TEXT NOT NULL,
                media_type TEXT NOT NULL DEFAULT 'IMAGE',
                notes TEXT NOT NULL DEFAULT '',
                created_at INTEGER NOT NULL,
                FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_secure_media_type ON secure_media(media_type)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS authenticator_credentials (
                vault_item_id TEXT PRIMARY KEY NOT NULL,
                issuer TEXT NOT NULL,
                account_name TEXT NOT NULL,
                encrypted_secret BLOB NOT NULL,
                secret_iv BLOB NOT NULL,
                algorithm TEXT NOT NULL DEFAULT 'SHA1',
                digits INTEGER NOT NULL DEFAULT 6,
                period INTEGER NOT NULL DEFAULT 30,
                FOREIGN KEY (vault_item_id) REFERENCES vault_items(id) ON DELETE CASCADE
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_authenticator_issuer ON authenticator_credentials(issuer)")

        try { db.execSQL("ALTER TABLE login_credentials ADD COLUMN encrypted_totp_secret BLOB") } catch (e: Exception) {}
        try { db.execSQL("ALTER TABLE login_credentials ADD COLUMN totp_secret_iv BLOB") } catch (e: Exception) {}
        try { db.execSQL("ALTER TABLE login_credentials ADD COLUMN totp_period INTEGER NOT NULL DEFAULT 30") } catch (e: Exception) {}
        try { db.execSQL("ALTER TABLE login_credentials ADD COLUMN totp_digits INTEGER NOT NULL DEFAULT 6") } catch (e: Exception) {}
        try { db.execSQL("ALTER TABLE login_credentials ADD COLUMN totp_algorithm TEXT NOT NULL DEFAULT 'SHA1'") } catch (e: Exception) {}

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS audit_events (
                id TEXT PRIMARY KEY NOT NULL,
                timestamp INTEGER NOT NULL,
                event_type TEXT NOT NULL,
                details TEXT NOT NULL,
                is_success INTEGER NOT NULL DEFAULT 1
            )
        """.trimIndent())
        db.execSQL("CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_events(timestamp)")

        db.execSQL("""
            CREATE TABLE IF NOT EXISTS app_settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                auto_lock_seconds INTEGER NOT NULL DEFAULT 300,
                biometric_enabled INTEGER NOT NULL DEFAULT 0,
                screen_security INTEGER NOT NULL DEFAULT 1,
                clipboard_clear_seconds INTEGER NOT NULL DEFAULT 30,
                language TEXT NOT NULL DEFAULT 'en',
                theme TEXT NOT NULL DEFAULT 'dark',
                show_website_icons INTEGER NOT NULL DEFAULT 1
            )
        """.trimIndent())

        try {
            db.execSQL("ALTER TABLE app_settings ADD COLUMN show_website_icons INTEGER NOT NULL DEFAULT 1")
        } catch (e: Exception) {
            // Column already exists
        }

        // Insert default app settings if not exists
        db.execSQL("INSERT OR IGNORE INTO app_settings (id, auto_lock_seconds, biometric_enabled, screen_security, clipboard_clear_seconds, language, theme, show_website_icons) VALUES (1, 300, 0, 1, 30, 'en', 'dark', 1)")

        // Seed default folders
        seedDefaultFolders(db)
    }

    private fun seedDefaultFolders(db: SQLiteDatabase) {
        val cursor = db.rawQuery("SELECT COUNT(*) FROM folders", null)
        var count = 0
        if (cursor.moveToFirst()) {
            count = cursor.getInt(0)
        }
        cursor.close()

        if (count == 0) {
            val defaultFolders = listOf(
                Triple("Personal", "#10B981", "user"),
                Triple("Work", "#3B82F6", "briefcase"),
                Triple("Finance", "#F59E0B", "card"),
                Triple("Shopping", "#EC4899", "shopping-bag"),
                Triple("Social", "#8B5CF6", "message-circle"),
                Triple("Developer", "#06B6D4", "code"),
                Triple("Education", "#14B8A6", "book-open"),
                Triple("Other", "#64748B", "folder")
            )

            db.beginTransaction()
            try {
                for ((name, color, icon) in defaultFolders) {
                    db.execSQL(
                        "INSERT INTO folders (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)",
                        arrayOf(java.util.UUID.randomUUID().toString(), name, color, icon, System.currentTimeMillis())
                    )
                }
                db.setTransactionSuccessful()
            } finally {
                db.endTransaction()
            }
        }
    }
}
