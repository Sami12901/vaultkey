package com.vaultkey.database

import java.util.UUID

enum class ItemType {
    LOGIN,
    SECURE_NOTE,
    CREDENTIAL_IDENTITY,
    CREDENTIAL_CARD,
    BANK_ACCOUNT,
    API_CREDENTIAL,
    WIFI_CREDENTIAL,
    SOFTWARE_LICENSE,
    PASSKEY,
    SECURE_MEDIA,
    AUTHENTICATOR_2FA;

    companion object {
        fun fromString(value: String): ItemType {
            return try {
                valueOf(value.uppercase())
            } catch (e: Exception) {
                LOGIN
            }
        }
    }
}

data class VaultItem(
    val id: String = UUID.randomUUID().toString(),
    val type: ItemType = ItemType.LOGIN,
    val title: String,
    val folderId: String? = null,
    val isFavorite: Boolean = false,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val lastUsedAt: Long? = null,
    val isTrashed: Boolean = false,
    val tags: List<String> = emptyList()
)

data class VaultItemSummary(
    val id: String,
    val type: String,
    val title: String,
    val subtitle: String?,
    val folderId: String?,
    val folderName: String?,
    val isFavorite: Boolean,
    val updatedAt: Long,
    val lastUsedAt: Long?,
    val tags: List<String>,
    val extraData: Map<String, Any?> = emptyMap()
)

data class LoginCredential(
    val vaultItemId: String,
    val username: String,
    val encryptedPassword: ByteArray,
    val passwordIv: ByteArray,
    val urlsJson: String = "[]",
    val notes: String = "",
    val lastChangedAt: Long = System.currentTimeMillis()
)

data class SecureNote(
    val vaultItemId: String,
    val encryptedContent: ByteArray,
    val contentIv: ByteArray,
    val isRichText: Boolean = false
)

data class IdentityCredential(
    val vaultItemId: String,
    val firstName: String,
    val lastName: String,
    val encryptedDetailsJson: ByteArray,
    val detailsIv: ByteArray
)

data class CreditCardCredential(
    val vaultItemId: String,
    val cardholderName: String,
    val maskedNumber: String,
    val encryptedCardNumber: ByteArray,
    val cardIv: ByteArray,
    val expiryMonth: String,
    val expiryYear: String,
    val encryptedCvv: ByteArray,
    val cvvIv: ByteArray,
    val cardBrand: String,
    val encryptedPin: ByteArray? = null,
    val pinIv: ByteArray? = null,
    val cardType: String = "Credit",
    val billingZip: String = ""
)

data class BankAccountCredential(
    val vaultItemId: String,
    val bankName: String,
    val accountHolder: String,
    val maskedAccountNumber: String,
    val encryptedAccountNumber: ByteArray,
    val accountIv: ByteArray,
    val routingNumber: String = "",
    val swiftBic: String = "",
    val iban: String = "",
    val accountType: String = "Checking"
)

data class ApiCredential(
    val vaultItemId: String,
    val serviceName: String,
    val username: String = "",
    val encryptedApiKey: ByteArray,
    val apiKeyIv: ByteArray,
    val encryptedSecret: ByteArray,
    val secretIv: ByteArray,
    val endpointUrl: String = ""
)

data class WifiCredential(
    val vaultItemId: String,
    val ssid: String,
    val encryptedPassword: ByteArray,
    val wifiIv: ByteArray,
    val securityType: String = "WPA2"
)

data class SoftwareLicense(
    val vaultItemId: String,
    val softwareName: String,
    val encryptedLicenseKey: ByteArray,
    val licenseIv: ByteArray,
    val email: String = "",
    val purchaseDate: String = ""
)

data class PasskeyMetadata(
    val vaultItemId: String,
    val rpId: String,
    val userName: String,
    val userHandle: String = "",
    val credentialId: String,
    val createdAt: Long = System.currentTimeMillis()
)

data class Folder(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val color: String = "#10B981",
    val icon: String = "folder",
    val createdAt: Long = System.currentTimeMillis()
)

data class Tag(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val color: String = "#3B82F6"
)

data class AuditEvent(
    val id: String = UUID.randomUUID().toString(),
    val timestamp: Long = System.currentTimeMillis(),
    val eventType: String,
    val details: String = "",
    val isSuccess: Boolean = true
)

data class AppSettings(
    val autoLockSeconds: Int = 300, // 5 minutes default
    val biometricEnabled: Boolean = false,
    val screenSecurity: Boolean = true,
    val clipboardClearSeconds: Int = 30,
    val language: String = "en",
    val theme: String = "dark",
    val showWebsiteIcons: Boolean = true
)

data class SecureMediaRecord(
    val vaultItemId: String,
    val fileName: String,
    val mimeType: String,
    val sizeBytes: Long,
    val encryptedFilePath: String,
    val mediaType: String = "IMAGE",
    val notes: String = "",
    val createdAt: Long = System.currentTimeMillis()
)

data class AuthenticatorCredential(
    val vaultItemId: String,
    val issuer: String,
    val accountName: String,
    val encryptedSecret: ByteArray,
    val secretIv: ByteArray,
    val algorithm: String = "SHA1",
    val digits: Int = 6,
    val period: Int = 30
)
