package com.vaultkey.modules

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.view.autofill.AutofillManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.*
import com.vaultkey.session.VaultSessionManager

class PermissionsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PermissionsModule"

    @ReactMethod
    fun checkSetupStatus(promise: Promise) {
        try {
            val context = reactApplicationContext

            // 1. Autofill service
            val isAutofillEnabled = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val afm = context.getSystemService(AutofillManager::class.java)
                afm?.hasEnabledAutofillServices() ?: false
            } else {
                false
            }

            // 2. Biometric enabled in vault
            val sessionManager = VaultSessionManager.getInstance(context)
            val isBiometricsEnabled = if (sessionManager.isInitialized() && sessionManager.isUnlocked()) {
                try {
                    sessionManager.dao.getSettings().biometricEnabled
                } catch (e: Exception) {
                    false
                }
            } else {
                false
            }

            // 3. Camera permission
            val isCameraGranted = ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED

            // 4. Install unknown apps
            val canInstall = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.packageManager.canRequestPackageInstalls()
            } else {
                true
            }

            // 5. Battery optimization exemption
            val isIgnoringBattery = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val pm = context.getSystemService(PowerManager::class.java)
                pm?.isIgnoringBatteryOptimizations(context.packageName) ?: false
            } else {
                true
            }

            val map = Arguments.createMap().apply {
                putBoolean("autofillEnabled", isAutofillEnabled)
                putBoolean("biometricsEnabled", isBiometricsEnabled)
                putBoolean("cameraGranted", isCameraGranted)
                putBoolean("canInstallUnknownApps", canInstall)
                putBoolean("ignoringBatteryOptimizations", isIgnoringBattery)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_CHECK_PERMS", e.message, e)
        }
    }

    @ReactMethod
    fun openAutofillSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            // Fallback to general settings
            try {
                val intent = Intent(Settings.ACTION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } catch (fallbackEx: Exception) {
                promise.reject("ERR_AUTOFILL_SETTINGS", fallbackEx.message, fallbackEx)
            }
        }
    }

    @ReactMethod
    fun openBatteryOptimizationSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            // Fallback to general battery settings
            try {
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } catch (fallback: Exception) {
                promise.reject("ERR_BATTERY", fallback.message, fallback)
            }
        }
    }

    @ReactMethod
    fun openAppSettings(promise: Promise) {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${reactApplicationContext.packageName}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            reactApplicationContext.startActivity(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_APP_SETTINGS", e.message, e)
        }
    }
}
