package com.vaultkey.crypto

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.nio.charset.StandardCharsets

class TotpEngineTest {

    // RFC 6238 Section B Test Keys
    private val rfcSha1KeyAscii = "12345678901234567890" // 20 bytes
    private val rfcSha256KeyAscii = "12345678901234567890123456789012" // 32 bytes
    private val rfcSha512KeyAscii = "1234567890123456789012345678901234567890123456789012345678901234" // 64 bytes

    @Test
    fun testBase32DecodingRfcVectors() {
        // RFC 4648 test vectors
        assertEquals("", String(TotpEngine.decodeBase32(""), StandardCharsets.UTF_8))
        assertEquals("f", String(TotpEngine.decodeBase32("MY======"), StandardCharsets.UTF_8))
        assertEquals("fo", String(TotpEngine.decodeBase32("MZXQ===="), StandardCharsets.UTF_8))
        assertEquals("foo", String(TotpEngine.decodeBase32("MZXW6==="), StandardCharsets.UTF_8))
        assertEquals("foob", String(TotpEngine.decodeBase32("MZXW6YQ="), StandardCharsets.UTF_8))
        assertEquals("fooba", String(TotpEngine.decodeBase32("MZXW6YTB"), StandardCharsets.UTF_8))
        assertEquals("foobar", String(TotpEngine.decodeBase32("MZXW6YTBOI======"), StandardCharsets.UTF_8))

        // Sanitization of lowercase, spaces, and hyphens
        assertEquals("foobar", String(TotpEngine.decodeBase32("mzxw 6ytb-oi=="), StandardCharsets.UTF_8))
    }

    @Test
    fun testRfc6238Sha1SixDigitVectors() {
        val key = rfcSha1KeyAscii.toByteArray(StandardCharsets.US_ASCII)

        // RFC 6238 Appendix B 6-digit SHA1 test vectors (time step 30s)
        val vectors = listOf(
            59L to "287082",
            1111111109L to "081804",
            1111111111L to "050471",
            1234567890L to "005924",
            2000000000L to "279037",
            20000000000L to "353130"
        )

        for ((timestamp, expectedCode) in vectors) {
            val result = TotpEngine.generateTotp(
                secretBytes = key.copyOf(),
                epochSeconds = timestamp,
                period = 30,
                digits = 6,
                algorithm = "SHA1"
            )
            assertEquals("Mismatch for SHA1 at epoch $timestamp", expectedCode, result.code)
            assertEquals(6, result.code.length)
        }
    }

    @Test
    fun testRfc6238Sha1EightDigitVectors() {
        val key = rfcSha1KeyAscii.toByteArray(StandardCharsets.US_ASCII)

        // RFC 6238 Appendix B 8-digit SHA1 test vectors
        val vectors = listOf(
            59L to "94287082",
            1111111109L to "07081804",
            1111111111L to "14050471",
            1234567890L to "89005924",
            2000000000L to "69279037",
            20000000000L to "65353130"
        )

        for ((timestamp, expectedCode) in vectors) {
            val result = TotpEngine.generateTotp(
                secretBytes = key.copyOf(),
                epochSeconds = timestamp,
                period = 30,
                digits = 8,
                algorithm = "SHA1"
            )
            assertEquals("Mismatch for 8-digit SHA1 at epoch $timestamp", expectedCode, result.code)
            assertEquals(8, result.code.length)
        }
    }

    @Test
    fun testRfc6238Sha256Vectors() {
        val key = rfcSha256KeyAscii.toByteArray(StandardCharsets.US_ASCII)

        // RFC 6238 Appendix B 8-digit SHA256 test vectors
        val vectors = listOf(
            59L to "46119246",
            1111111109L to "68084774",
            1111111111L to "67062674",
            1234567890L to "91819424",
            2000000000L to "90698825",
            20000000000L to "77737706"
        )

        for ((timestamp, expectedCode) in vectors) {
            val result = TotpEngine.generateTotp(
                secretBytes = key.copyOf(),
                epochSeconds = timestamp,
                period = 30,
                digits = 8,
                algorithm = "SHA256"
            )
            assertEquals("Mismatch for SHA256 at epoch $timestamp", expectedCode, result.code)
        }
    }

    @Test
    fun testRfc6238Sha512Vectors() {
        val key = rfcSha512KeyAscii.toByteArray(StandardCharsets.US_ASCII)

        // RFC 6238 Appendix B 8-digit SHA512 test vectors
        val vectors = listOf(
            59L to "90693936",
            1111111109L to "25091201",
            1111111111L to "99943326",
            1234567890L to "93441116",
            2000000000L to "38618901",
            20000000000L to "47863826"
        )

        for ((timestamp, expectedCode) in vectors) {
            val result = TotpEngine.generateTotp(
                secretBytes = key.copyOf(),
                epochSeconds = timestamp,
                period = 30,
                digits = 8,
                algorithm = "SHA512"
            )
            assertEquals("Mismatch for SHA512 at epoch $timestamp", expectedCode, result.code)
        }
    }

    @Test
    fun testGenerateFromBase32Seed() {
        // Base32 for ASCII "12345678901234567890" is "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
        val base32Secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"

        val result = TotpEngine.generateFromBase32(
            base32Secret = base32Secret,
            epochSeconds = 1234567890L,
            period = 30,
            digits = 6,
            algorithm = "SHA1"
        )

        assertEquals("005924", result.code)
    }

    @Test
    fun testRemainingSecondsAndProgressCalculation() {
        val key = rfcSha1KeyAscii.toByteArray(StandardCharsets.US_ASCII)

        // Epoch 59s with 30s period: 59 % 30 = 29 -> remaining = 1s
        val res1 = TotpEngine.generateTotp(key.copyOf(), epochSeconds = 59L, period = 30)
        assertEquals(1, res1.remainingSeconds)
        assertEquals(30, res1.period)
        assertEquals(1.0f / 30.0f, res1.progress, 0.001f)

        // Epoch 60s with 30s period: 60 % 30 = 0 -> remaining = 30s
        val res2 = TotpEngine.generateTotp(key.copyOf(), epochSeconds = 60L, period = 30)
        assertEquals(30, res2.remainingSeconds)
        assertEquals(1.0f, res2.progress, 0.001f)

        // Epoch 45s with 30s period: remaining = 15s, progress = 0.5
        val res3 = TotpEngine.generateTotp(key.copyOf(), epochSeconds = 45L, period = 30)
        assertEquals(15, res3.remainingSeconds)
        assertEquals(0.5f, res3.progress, 0.001f)
    }

    @Test
    fun testSecretBytesMemoryZeroizationGuarantee() {
        val secretBytes = "sensitive_seed_key_bytes_123456".toByteArray(StandardCharsets.UTF_8)
        val copyToVerifyZeroed = secretBytes.clone()

        // Calling generateTotp should zeroize the passed secretBytes
        TotpEngine.generateTotp(secretBytes, epochSeconds = 1000L)

        val zeroBytes = ByteArray(copyToVerifyZeroed.size) { 0 }
        assertArrayEquals("Secret byte array must be zeroized in memory after generation", zeroBytes, secretBytes)
    }
}
