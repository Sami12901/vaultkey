package com.vaultkey.modules

import android.app.Activity
import android.os.Build
import android.view.WindowManager
import com.facebook.react.bridge.*
import com.vaultkey.session.VaultSessionManager
import java.io.File

class SecurityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "SecurityModule"

    private val sessionManager: VaultSessionManager
        get() = VaultSessionManager.getInstance(reactApplicationContext)

    @ReactMethod
    fun setScreenSecurity(enabled: Boolean, promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("ERR_ACTIVITY", "Current activity not available")
            return
        }

        activity.runOnUiThread {
            try {
                if (enabled) {
                    activity.window.setFlags(
                        WindowManager.LayoutParams.FLAG_SECURE,
                        WindowManager.LayoutParams.FLAG_SECURE
                    )
                } else {
                    activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                }
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_SCREEN_SECURITY", e.message, e)
            }
        }
    }

    @ReactMethod
    fun checkDeviceSecurity(promise: Promise) {
        val isRooted = checkRootStatus()
        val hasStrongBox = sessionManager.keystoreManager.isStrongBoxSupported()
        val buildTags = Build.TAGS ?: ""
        val isTestKeys = buildTags.contains("test-keys")

        val map = Arguments.createMap().apply {
            putBoolean("isRootDetected", isRooted)
            putBoolean("isTestKeysBuild", isTestKeys)
            putBoolean("isStrongBoxSupported", hasStrongBox)
            putString("securityLevel", when {
                isRooted -> "COMPROMISED"
                hasStrongBox -> "HIGH_STRONGBOX"
                else -> "STANDARD_TEE"
            })
        }
        promise.resolve(map)
    }

    private fun checkRootStatus(): Boolean {
        val paths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su"
        )
        for (path in paths) {
            if (File(path).exists()) return true
        }
        return false
    }
}