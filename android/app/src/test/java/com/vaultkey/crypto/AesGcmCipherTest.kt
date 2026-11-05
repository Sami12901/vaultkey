package com.vaultkey.crypto

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.charset.StandardCharsets
import java.security.GeneralSecurityException
import javax.crypto.AEADBadTagException

class AesGcmCipherTest {

    @Test
    fun testGenerateKeyReturnsDistinct32ByteKeys() {
        val key1 = AesGcmCipher.generateKey()
        val key2 = AesGcmCipher.generateKey()

        assertEquals("AES-256 key must be exactly 32 bytes", AesGcmCipher.KEY_LENGTH_BYTES, key1.size)
        assertEquals("AES-256 key must be exactly 32 bytes", AesGcmCipher.KEY_LENGTH_BYTES, key2.size)
        assertFalse("Sequential random keys must not be identical", key1.contentEquals(key2))
    }

    @Test
    fun testGenerateIvReturnsDistinct12ByteIVs() {
        val iv1 = AesGcmCipher.generateIv()
        val iv2 = AesGcmCipher.generateIv()

        assertEquals("GCM IV must be exactly 12 bytes", AesGcmCipher.IV_LENGTH_BYTES, iv1.size)
        assertEquals("GCM IV must be exactly 12 bytes", AesGcmCipher.IV_LENGTH_BYTES, iv2.size)
        assertFalse("Sequential random IVs must not be identical", iv1.contentEquals(iv2))
    }

    @Test
    fun testEncryptDecryptWithoutAadRoundtrip() {
        val key = AesGcmCipher.generateKey()
        val originalPlaintext = "VaultKey Zero-Knowledge AES-256-GCM Test Vector 2026".toByteArray(StandardCharsets.UTF_8)

        val encrypted = AesGcmCipher.encrypt(originalPlaintext, key)
        assertNotNull(encrypted.ciphertext)
        assertNotNull(encrypted.iv)
        assertEquals(AesGcmCipher.IV_LENGTH_BYTES, encrypted.iv.size)
        // Ciphertext should contain 16-byte (128-bit) GCM tag
        assertEquals(originalPlaintext.size + 16, encrypted.ciphertext.size)

        val decrypted = AesGcmCipher.decrypt(encrypted, key)
        assertArrayEquals("Decrypted bytes must match original plaintext", originalPlaintext, decrypted)
    }

    @Test
    fun testEncryptDecryptWithAadIntegrity() {
        val key = AesGcmCipher.generateKey()
        val originalPlaintext = "Top-Secret Vault Credentials with Authenticated Additional Data".toByteArray(StandardCharsets.UTF_8)
        val aad = "user:saifullah@vaultkey.app|device:pixel-8".toByteArray(StandardCharsets.UTF_8)

        val encrypted = AesGcmCipher.encrypt(originalPlaintext, key, aad)
        val decrypted = AesGcmCipher.decrypt(encrypted.ciphertext, encrypted.iv, key, aad)
        assertArrayEquals(originalPlaintext, decrypted)
    }

    @Test
    fun testAadMismatchRejectionThrowsException() {
        val key = AesGcmCipher.generateKey()
        val plaintext = "Secret payload".toByteArray(StandardCharsets.UTF_8)
        val correctAad = "tenant:production".toByteArray(StandardCharsets.UTF_8)
        val tamperedAad = "tenant:staging".toByteArray(StandardCharsets.UTF_8)

        val encrypted = AesGcmCipher.encrypt(plaintext, key, correctAad)

        // Attempt decrypt with altered AAD
        assertThrows(GeneralSecurityException::class.java) {
            AesGcmCipher.decrypt(encrypted.ciphertext, encrypted.iv, key, tamperedAad)
        }

        // Attempt decrypt with missing AAD (null)
        assertThrows(GeneralSecurityException::class.java) {
            AesGcmCipher.decrypt(encrypted.ciphertext, encrypted.iv, key, null)
        }
    }

    @Test
    fun testTamperedCiphertextThrowsBadTagException() {
        val key = AesGcmCipher.generateKey()
        val plaintext = "Cryptographic integrity payload verification".toByteArray(StandardCharsets.UTF_8)
        val encrypted = AesGcmCipher.encrypt(plaintext, key)

        val tamperedCiphertext = encrypted.ciphertext.copyOf()
        // Flip a bit in the ciphertext body
        tamperedCiphertext[0] = (tamperedCiphertext[0].toInt() xor 0x01).toByte()

        assertThrows(GeneralSecurityException::class.java) {
            AesGcmCipher.decrypt(tamperedCiphertext, encrypted.iv, key)
        }
    }

    @Test
    fun testTamperedIvThrowsBadTagException() {
        val key = AesGcmCipher.generateKey()
        val plaintext = "Cryptographic IV integrity verification".toByteArray(StandardCharsets.UTF_8)
        val encrypted = AesGcmCipher.encrypt(plaintext, key)

        val tamperedIv = encrypted.iv.copyOf()
        // Flip a bit in the IV
        tamperedIv[0] = (tamperedIv[0].toInt() xor 0xFF).toByte()

        assertThrows(GeneralSecurityException::class.java) {
            AesGcmCipher.decrypt(encrypted.ciphertext, tamperedIv, key)
        }
    }

    @Test
    fun testDecryptionWithWrongKeyThrowsException() {
        val key1 = AesGcmCipher.generateKey()
        val key2 = AesGcmCipher.generateKey()
        val plaintext = "Data protected by key1".toByteArray(StandardCharsets.UTF_8)

        val encrypted = AesGcmCipher.encrypt(plaintext, key1)

        assertThrows(GeneralSecurityException::class.java) {
            AesGcmCipher.decrypt(encrypted, key2)
        }
    }

    @Test
    fun testInvalidKeyOrIvLengthThrowsIllegalArgumentException() {
        val invalidKey = ByteArray(16) // 128-bit key instead of required 256-bit
        val validKey = AesGcmCipher.generateKey()
        val invalidIv = ByteArray(16) // 16-byte IV instead of 12-byte GCM IV
        val validIv = AesGcmCipher.generateIv()
        val sampleCiphertext = ByteArray(32)

        assertThrows(IllegalArgumentException::class.java) {
            AesGcmCipher.encrypt("hello".toByteArray(), invalidKey)
        }

        assertThrows(IllegalArgumentException::class.java) {
            AesGcmCipher.decrypt(sampleCiphertext, invalidIv, validKey)
        }

        assertThrows(IllegalArgumentException::class.java) {
            AesGcmCipher.decrypt(sampleCiphertext, validIv, invalidKey)
        }
    }

    @Test
    fun testEncryptStringAndDecryptToStringWithBase32Secrets() {
        val key = AesGcmCipher.generateKey()
        val testSecrets = listOf(
            "JBSWY3DPEHPK3PXP", // standard Base32 seed
            "HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ", // 32-char Base32 seed
            "MY5DCOLVGUYTAMBQGA======", // Base32 with padding
            "P@ssw0rd#2026! Unicode 🔐 🛡️ 🔑", // complex UTF-8 string
            "" // empty string
        )

        for (secret in testSecrets) {
            val encrypted = AesGcmCipher.encryptString(secret, key)
            val decrypted = AesGcmCipher.decryptToString(encrypted.ciphertext, encrypted.iv, key, encrypted.aad)
            assertEquals("Roundtrip string must match perfectly", secret, decrypted)
        }
    }

    @Test
    fun testEncryptedDataEqualsAndHashCode() {
        val iv = ByteArray(12) { 1.toByte() }
        val ct1 = ByteArray(16) { 2.toByte() }
        val ct2 = ByteArray(16) { 2.toByte() }
        val aad = "aad-data".toByteArray(StandardCharsets.UTF_8)

        val data1 = EncryptedData(ct1, iv, aad)
        val data2 = EncryptedData(ct2, iv.copyOf(), aad.copyOf())

        assertEquals(data1, data2)
        assertEquals(data1.hashCode(), data2.hashCode())

        val dataDifferentAad = EncryptedData(ct1, iv, null)
        assertNotEquals(data1, dataDifferentAad)
    }
}
