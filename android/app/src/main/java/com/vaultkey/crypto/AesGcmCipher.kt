package com.vaultkey.crypto

import java.nio.ByteBuffer
import java.nio.CharBuffer
import java.nio.charset.StandardCharsets
import java.security.SecureRandom
import javax.crypto.AEADBadTagException
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.SecretKeySpec

data class EncryptedData(
    val ciphertext: ByteArray,
    val iv: ByteArray,
    val aad: ByteArray? = null
) {
    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (javaClass != other?.javaClass) return false
        other as EncryptedData
        if (!ciphertext.contentEquals(other.ciphertext)) return false
        if (!iv.contentEquals(other.iv)) return false
        if (aad != null) {
            if (other.aad == null || !aad.contentEquals(other.aad)) return false
        } else if (other.aad != null) return false
        return true
    }

    override fun hashCode(): Int {
        var result = ciphertext.contentHashCode()
        result = 31 * result + iv.contentHashCode()
        result = 31 * result + (aad?.contentHashCode() ?: 0)
        return result
    }
}

object AesGcmCipher {

    private const val ALGORITHM = "AES/GCM/NoPadding"
    private const val TAG_LENGTH_BITS = 128
    const val IV_LENGTH_BYTES = 12
    const val KEY_LENGTH_BYTES = 32

    private val secureRandom = SecureRandom()

    fun generateKey(): ByteArray {
        val key = ByteArray(KEY_LENGTH_BYTES)
        secureRandom.nextBytes(key)
        return key
    }

    fun generateIv(): ByteArray {
        val iv = ByteArray(IV_LENGTH_BYTES)
        secureRandom.nextBytes(iv)
        return iv
    }

    fun encrypt(
        plaintext: ByteArray,
        key: ByteArray,
        aad: ByteArray? = null
    ): EncryptedData {
        require(key.size == KEY_LENGTH_BYTES) { "AES-256 key must be 32 bytes" }
        val iv = generateIv()
        val secretKey: SecretKey = SecretKeySpec(key, "AES")
        val cipher = Cipher.getInstance(ALGORITHM)
        val spec = GCMParameterSpec(TAG_LENGTH_BITS, iv)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey, spec)

        if (aad != null && aad.isNotEmpty()) {
            cipher.updateAAD(aad)
        }

        val ciphertext = cipher.doFinal(plaintext)
        return EncryptedData(ciphertext, iv, aad)
    }

    fun encryptString(
        plaintext: String,
        key: ByteArray,
        aad: ByteArray? = null
    ): EncryptedData {
        val bytes = plaintext.toByteArray(StandardCharsets.UTF_8)
        return try {
            encrypt(bytes, key, aad)
        } finally {
            MemorySecurity.wipe(bytes)
        }
    }

    @Throws(AEADBadTagException::class, Exception::class)
    fun decrypt(
        encryptedData: EncryptedData,
        key: ByteArray
    ): ByteArray {
        return decrypt(encryptedData.ciphertext, encryptedData.iv, key, encryptedData.aad)
    }

    @Throws(AEADBadTagException::class, Exception::class)
    fun decrypt(
        ciphertext: ByteArray,
        iv: ByteArray,
        key: ByteArray,
        aad: ByteArray? = null
    ): ByteArray {
        require(key.size == KEY_LENGTH_BYTES) { "AES-256 key must be 32 bytes" }
        require(iv.size == IV_LENGTH_BYTES) { "GCM IV must be 12 bytes" }

        val secretKey: SecretKey = SecretKeySpec(key, "AES")
        val cipher = Cipher.getInstance(ALGORITHM)
        val spec = GCMParameterSpec(TAG_LENGTH_BITS, iv)
        cipher.init(Cipher.DECRYPT_MODE, secretKey, spec)

        if (aad != null && aad.isNotEmpty()) {
            cipher.updateAAD(aad)
        }

        return cipher.doFinal(ciphertext)
    }

    @Throws(AEADBadTagException::class, Exception::class)
    fun decryptToString(
        ciphertext: ByteArray,
        iv: ByteArray,
        key: ByteArray,
        aad: ByteArray? = null
    ): String {
        val decryptedBytes = decrypt(ciphertext, iv, key, aad)
        return try {
            String(decryptedBytes, StandardCharsets.UTF_8)
        } finally {
            MemorySecurity.wipe(decryptedBytes)
        }
    }
}
