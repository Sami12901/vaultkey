package com.vaultkey.crypto

import org.bouncycastle.crypto.generators.Argon2BytesGenerator
import org.bouncycastle.crypto.params.Argon2Parameters
import java.nio.ByteBuffer
import java.nio.CharBuffer
import java.nio.charset.StandardCharsets
import java.security.SecureRandom

data class KdfParameters(
    val memoryKiB: Int = DEFAULT_MEMORY_KIB,
    val iterations: Int = DEFAULT_ITERATIONS,
    val parallelism: Int = DEFAULT_PARALLELISM,
    val saltLengthBytes: Int = DEFAULT_SALT_BYTES,
    val keyLengthBytes: Int = DEFAULT_KEY_BYTES
) {
    companion object {
        const val DEFAULT_MEMORY_KIB = 65536 // 64 MB
        const val DEFAULT_ITERATIONS = 3
        const val DEFAULT_PARALLELISM = 2
        const val DEFAULT_SALT_BYTES = 32
        const val DEFAULT_KEY_BYTES = 32 // 256 bits

        // Lightweight parameters for fast tests or low-end devices
        const val LOW_MEMORY_KIB = 16384 // 16 MB
        const val LOW_ITERATIONS = 2
        const val LOW_PARALLELISM = 1
    }
}

object Argon2idKdf {

    private val secureRandom = SecureRandom()

    fun generateSalt(lengthBytes: Int = KdfParameters.DEFAULT_SALT_BYTES): ByteArray {
        val salt = ByteArray(lengthBytes)
        secureRandom.nextBytes(salt)
        return salt
    }

    fun deriveKey(
        passwordChars: CharArray,
        salt: ByteArray,
        params: KdfParameters = KdfParameters()
    ): ByteArray {
        val passwordBytes = charsToBytes(passwordChars)
        return try {
            deriveKey(passwordBytes, salt, params)
        } finally {
            MemorySecurity.wipe(passwordBytes)
        }
    }

    fun deriveKey(
        passwordBytes: ByteArray,
        salt: ByteArray,
        params: KdfParameters = KdfParameters()
    ): ByteArray {
        require(salt.isNotEmpty()) { "Salt cannot be empty" }
        require(params.memoryKiB >= 8) { "Memory must be at least 8 KiB" }
        require(params.iterations >= 1) { "Iterations must be at least 1" }
        require(params.parallelism >= 1) { "Parallelism must be at least 1" }

        val argonParams = Argon2Parameters.Builder(Argon2Parameters.ARGON2_id)
            .withVersion(Argon2Parameters.ARGON2_VERSION_13)
            .withMemoryAsKB(params.memoryKiB)
            .withIterations(params.iterations)
            .withParallelism(params.parallelism)
            .withSalt(salt)
            .build()

        val generator = Argon2BytesGenerator()
        generator.init(argonParams)

        val derivedKey = ByteArray(params.keyLengthBytes)
        generator.generateBytes(passwordBytes, derivedKey, 0, derivedKey.size)
        return derivedKey
    }

    private fun charsToBytes(chars: CharArray): ByteArray {
        val charBuffer = CharBuffer.wrap(chars)
        val byteBuffer = StandardCharsets.UTF_8.encode(charBuffer)
        val bytes = ByteArray(byteBuffer.remaining())
        byteBuffer.get(bytes)
        MemorySecurity.wipe(byteBuffer.array())
        return bytes
    }
}
