package com.vaultkey.crypto

import java.nio.ByteBuffer
import java.util.Arrays
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Pure offline RFC 6238 TOTP & RFC 4226 HOTP Engine.
 * Supports HMAC-SHA1, HMAC-SHA256, HMAC-SHA512, 6 and 8 digit tokens, and custom time periods.
 * Zeroizes decrypted secret byte arrays immediately after computation.
 */
object TotpEngine {

    private const val BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

    data class TotpResult(
        val code: String,
        val remainingSeconds: Int,
        val period: Int,
        val progress: Float
    )

    /**
     * Decodes a RFC 4648 Base32 string into raw byte array.
     */
    fun decodeBase32(base32: String): ByteArray {
        val sanitized = base32.trim().replace(" ", "").replace("-", "").uppercase()
        if (sanitized.isEmpty()) {
            return ByteArray(0)
        }

        var buffer = 0
        var bitsLeft = 0
        val output = mutableListOf<Byte>()

        for (ch in sanitized) {
            if (ch == '=') break // padding reached
            val valIndex = BASE32_ALPHABET.indexOf(ch)
            if (valIndex == -1) {
                continue // skip unexpected chars
            }
            buffer = (buffer shl 5) or valIndex
            bitsLeft += 5
            if (bitsLeft >= 8) {
                bitsLeft -= 8
                output.add(((buffer shr bitsLeft) and 0xFF).toByte())
            }
        }
        return output.toByteArray()
    }

    /**
     * Generates a TOTP token using decoded secret bytes.
     * Decoded secret bytes are securely cleared from memory prior to returning.
     */
    fun generateTotp(
        secretBytes: ByteArray,
        epochSeconds: Long = System.currentTimeMillis() / 1000L,
        period: Int = 30,
        digits: Int = 6,
        algorithm: String = "SHA1"
    ): TotpResult {
        try {
            val validPeriod = if (period > 0) period else 30
            val validDigits = if (digits == 8) 8 else 6
            val timeStep = epochSeconds / validPeriod
            val remainingSeconds = (validPeriod - (epochSeconds % validPeriod)).toInt()
            val progress = remainingSeconds.toFloat() / validPeriod.toFloat()

            val macAlgorithm = when (algorithm.uppercase().replace("-", "")) {
                "SHA256", "HMACSHA256" -> "HmacSHA256"
                "SHA512", "HMACSHA512" -> "HmacSHA512"
                else -> "HmacSHA1"
            }

            // Convert 64-bit timeStep to big-endian 8-byte array
            val timeBytes = ByteBuffer.allocate(8).putLong(timeStep).array()

            val mac = Mac.getInstance(macAlgorithm)
            val keySpec = SecretKeySpec(secretBytes, macAlgorithm)
            mac.init(keySpec)
            val hash = mac.doFinal(timeBytes)

            // Dynamic Truncation (RFC 4226 Section 5.4)
            val offset = hash[hash.size - 1].toInt() and 0x0F
            val binary = ((hash[offset].toInt() and 0x7F) shl 24) or
                    ((hash[offset + 1].toInt() and 0xFF) shl 16) or
                    ((hash[offset + 2].toInt() and 0xFF) shl 8) or
                    (hash[offset + 3].toInt() and 0xFF)

            val divisor = when (validDigits) {
                8 -> 100000000
                else -> 1000000
            }

            val otp = binary % divisor
            val codeFormat = "%0${validDigits}d"
            val code = String.format(codeFormat, otp)

            return TotpResult(
                code = code,
                remainingSeconds = remainingSeconds,
                period = validPeriod,
                progress = progress
            )
        } finally {
            // Memory zeroization: wipe secret bytes immediately
            Arrays.fill(secretBytes, 0.toByte())
        }
    }

    /**
     * Convenience method to generate TOTP directly from Base32 string.
     */
    fun generateFromBase32(
        base32Secret: String,
        epochSeconds: Long = System.currentTimeMillis() / 1000L,
        period: Int = 30,
        digits: Int = 6,
        algorithm: String = "SHA1"
    ): TotpResult {
        val secretBytes = decodeBase32(base32Secret)
        return generateTotp(secretBytes, epochSeconds, period, digits, algorithm)
    }
}
