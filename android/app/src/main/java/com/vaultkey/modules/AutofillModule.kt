package com.vaultkey.modules

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.view.autofill.AutofillManager
import com.facebook.react.bridge.*

class AutofillModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "AutofillModule"

    @ReactMethod
    fun isAutofillSupported(promise: Promise) {
        promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
    }

    @ReactMethod
    fun isAutofillEnabled(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val afm = reactApplicationContext.getSystemService(AutofillManager::class.java)
            val hasEnabled = afm != null && afm.hasEnabledAutofillServices()
            promise.resolve(hasEnabled)
        } else {
            promise.resolve(false)
        }
    }

    @ReactMethod
    fun openAutofillSettings(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val intent = Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } catch (e: Exception) {
                // Fallback to general settings
                try {
                    val fallback = Intent(Settings.ACTION_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    reactApplicationContext.startActivity(fallback)
                    promise.resolve(true)
                } catch (ex: Exception) {
                    promise.reject("ERR_SETTINGS", ex.message, ex)
                }
            }
        } else {
            promise.reject("ERR_UNSUPPORTED", "Autofill requires Android 8.0 (API 26) or higher")
        }
    }
}
