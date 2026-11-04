package com.vaultkey.modules

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.*
import com.vaultkey.crypto.MemorySecurity
import com.vaultkey.session.VaultSessionManager

class BiometricModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BiometricModule"

    private val sessionManager: VaultSessionManager
        get() = VaultSessionManager.getInstance(reactApplicationContext)

    @ReactMethod
    fun canAuthenticate(promise: Promise) {
        val biometricManager = BiometricManager.from(reactApplicationContext)
        val canAuth = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
        val map = Arguments.createMap().apply {
            putBoolean("isSupported", canAuth == BiometricManager.BIOMETRIC_SUCCESS)
            putString("status", when (canAuth) {
                BiometricManager.BIOMETRIC_SUCCESS -> "SUCCESS"
                BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> "NO_HARDWARE"
                BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> "HW_UNAVAILABLE"
                BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> "NONE_ENROLLED"
                else -> "UNSUPPORTED"
            })
            putBoolean("isStrongBoxSupported", sessionManager.keystoreManager.isStrongBoxSupported())
        }
        promise.resolve(map)
    }

    @ReactMethod
    fun isBiometricUnlockAvailable(promise: Promise) {
        promise.resolve(sessionManager.isBiometricUnlockAvailable())
    }

    @ReactMethod
    fun enableBiometricsWithPassword(masterPassword: String, promise: Promise) {
        val activity = reactApplicationContext.currentActivity as? FragmentActivity
        if (activity == null) {
            promise.reject("ERR_ACTIVITY", "Current activity not available")
            return
        }

        val chars = masterPassword.toCharArray()
        try {
            // First verify or unlock
            if (!sessionManager.isUnlocked()) {
                val unlocked = sessionManager.unlock(chars)
                if (!unlocked) {
                    promise.reject("ERR_AUTH", "Invalid Master Password")
                    return
                }
            }

            val encryptCipher = sessionManager.keystoreManager.getEncryptCipher()

            activity.runOnUiThread {
                val executor = ContextCompat.getMainExecutor(activity)
                val prompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        val cipher = result.cryptoObject?.cipher
                        if (cipher != null && sessionManager.enableBiometrics(cipher)) {
                            promise.resolve(true)
                        } else {
                            promise.reject("ERR_BIO_ENABLE", "Failed to encrypt biometric key")
                        }
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        promise.reject("ERR_BIO_CANCEL", errString.toString())
                    }

                    override fun onAuthenticationFailed() {
                        // User can retry
                    }
                })

                val promptInfo = BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Enable Biometric Unlock")
                    .setSubtitle("Confirm your fingerprint or face to enable quick unlock")
                    .setNegativeButtonText("Cancel")
                    .build()

                prompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(encryptCipher))
            }
        } catch (e: Exception) {
            promise.reject("ERR_BIO_SETUP", e.message, e)
        } finally {
            MemorySecurity.wipe(chars)
        }
    }

    @ReactMethod
    fun disableBiometrics(promise: Promise) {
        try {
            sessionManager.disableBiometrics()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ERR_BIO_DISABLE", e.message, e)
        }
    }

    @ReactMethod
    fun authenticate(promise: Promise) {
        val activity = reactApplicationContext.currentActivity as? FragmentActivity
        if (activity == null) {
            promise.reject("ERR_ACTIVITY", "Current activity not available")
            return
        }

        val decryptCipher = sessionManager.getBiometricDecryptCipher()
        if (decryptCipher == null) {
            promise.reject("ERR_BIO_UNAVAILABLE", "Biometric unlock not configured or key invalidated")
            return
        }

        activity.runOnUiThread {
            val executor = ContextCompat.getMainExecutor(activity)
            val prompt = BiometricPrompt(activity, executor, object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    val cipher = result.cryptoObject?.cipher
                    if (cipher != null && sessionManager.unlockWithBiometrics(cipher)) {
                        promise.resolve(true)
                    } else {
                        promise.reject("ERR_AUTH", "Biometric unlock failed to decrypt key")
                    }
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    promise.reject("ERR_BIO_ERROR", errString.toString())
                }

                override fun onAuthenticationFailed() {
                    // Fingerprint not recognized, can retry
                }
            })

            val promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle("Unlock VaultKey")
                .setSubtitle("Authenticate using your biometric credential")
                .setNegativeButtonText("Use Password")
                .build()

            prompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(decryptCipher))
        }
    }
}