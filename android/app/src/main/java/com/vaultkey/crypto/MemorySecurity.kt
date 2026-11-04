package com.vaultkey.crypto

import java.util.Arrays

object MemorySecurity {

    @JvmStatic
    fun wipe(bytes: ByteArray?) {
        if (bytes != null) {
            Arrays.fill(bytes, 0.toByte())
        }
    }

    @JvmStatic
    fun wipe(chars: CharArray?) {
        if (chars != null) {
            Arrays.fill(chars, '\u0000')
        }
    }

    inline fun <T> withWipedBytes(bytes: ByteArray, block: (ByteArray) -> T): T {
        try {
            return block(bytes)
        } finally {
            wipe(bytes)
        }
    }

    inline fun <T> withWipedChars(chars: CharArray, block: (CharArray) -> T): T {
        try {
            return block(chars)
        } finally {
            wipe(chars)
        }
    }
}
