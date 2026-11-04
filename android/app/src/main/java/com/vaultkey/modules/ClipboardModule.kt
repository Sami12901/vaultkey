package com.vaultkey.modules

import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PersistableBundle
import com.facebook.react.bridge.*

class ClipboardModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "ClipboardModule"

    private val clipboardManager: ClipboardManager =
        reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
    private val mainHandler = Handler(Looper.getMainLooper())
    private var pendingClearRunnable: Runnable? = null

    @ReactMethod
    fun copySecure(text: String, label: String, timeoutSeconds: Int, promise: Promise) {
        try {
            val clipData = ClipData.newPlainText(label, text)

            // Android 13+ (API 33) EXTRA_IS_SENSITIVE flag hides password from notification preview
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                clipData.description.extras = PersistableBundle().apply {
                    putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true)
                }
            }

            clipboardManager.setPrimaryClip(clipData)

            // Cancel any previously scheduled clear
            pendingClearRunnable?.let { mainHandler.removeCallbacks(it) }

            val timeoutMs = (if (timeoutSeconds > 0) timeoutSeconds else 30) * 1000L

            val clearRunnable = Runnable {
                try {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                        clipboardManager.clearPrimaryClip()
                    } else {
                        clipboardManager.setPrimaryClip(ClipData.newPlainText("", ""))
                    }
                } catch (e: Exception) {
                    // Ignored
                }
            }

            pendingClearRunnable = clearRunnable
            mainHandler.postDelayed(clearRunnable, timeoutMs)

            val result = Arguments.createMap().apply {
                putBoolean("success", true)
                putInt("timeoutSeconds", (timeoutMs / 1000).toInt())
                putString("message", "Copied securely. Clipboard will be cleared in ${timeoutMs / 1000}s.")
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_CLIPBOARD", e.message, e)
        }
    }

    @ReactMethod
    fun clearClipboard(promise: Promise) {
        try {
            pendingClearRunnable?.let { mainHandler.removeCallbacks(it) }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                clipboardManager.clearPrimaryClip()
            } else {
                clipboardManager.setPrimaryClip(ClipData.newPlainText("", ""))
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_CLIPBOARD_CLEAR", e.message, e)
        }
    }
}
