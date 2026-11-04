package com.vaultkey.modules

import android.os.Build
import android.os.Debug
import android.view.WindowManager
import com.facebook.react.bridge.*
import com.vaultkey.session.VaultSessionManager
import java.io.BufferedReader
import java.io.File
import java.io.FileReader
import java.net.InetSocketAddress
import java.net.Socket

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
        try {
            val detectedThreats = Arguments.createArray()

            // 1. Root checks
            val isSuBinary = checkSuBinary()
            if (isSuBinary) detectedThreats.pushString("ROOT_SU_BINARY")

            val isRootApp = checkRootPackages()
            if (isRootApp) detectedThreats.pushString("ROOT_MANAGEMENT_APP")

            val isTestKeys = (Build.TAGS ?: "").contains("test-keys")
            if (isTestKeys) detectedThreats.pushString("TEST_KEYS_FIRMWARE")

            val isMagiskMount = checkMagiskMounts()
            if (isMagiskMount) detectedThreats.pushString("MAGISK_ZYGISK_MOUNT")

            val isRooted = isSuBinary || isRootApp || isTestKeys || isMagiskMount

            // 2. Frida & Hooking checks
            val isFridaPort = checkFridaPort()
            if (isFridaPort) detectedThreats.pushString("FRIDA_SERVER_PORT")

            val isFridaMemory = checkMemoryMaps()
            if (isFridaMemory) detectedThreats.pushString("FRIDA_HOOK_MEMORY")

            val isFrida = isFridaPort || isFridaMemory

            // 3. Debugger checks
            val isDebuggerConnected = Debug.isDebuggerConnected() || Debug.waitingForDebugger()
            if (isDebuggerConnected) detectedThreats.pushString("DEBUGGER_CONNECTED")

            val isTracerPid = checkTracerPid()
            if (isTracerPid) detectedThreats.pushString("PTRACE_TRACER_ATTACHED")

            val isDebugger = isDebuggerConnected || isTracerPid

            val isCompromised = isRooted || isFrida || isDebugger
            val hasStrongBox = sessionManager.keystoreManager.isStrongBoxSupported()

            val map = Arguments.createMap().apply {
                putBoolean("isCompromised", isCompromised)
                putBoolean("isRootDetected", isRooted)
                putBoolean("isFridaDetected", isFrida)
                putBoolean("isDebuggerAttached", isDebugger)
                putBoolean("isTestKeysBuild", isTestKeys)
                putBoolean("isStrongBoxSupported", hasStrongBox)
                putArray("threats", detectedThreats)
                putString("securityLevel", when {
                    isCompromised -> "COMPROMISED"
                    hasStrongBox -> "HIGH_STRONGBOX"
                    else -> "STANDARD_TEE"
                })
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_SECURITY_CHECK", e.message, e)
        }
    }

    private fun checkSuBinary(): Boolean {
        val paths = arrayOf(
            "/system/app/Superuser.apk",
            "/sbin/su",
            "/system/bin/su",
            "/system/xbin/su",
            "/data/local/xbin/su",
            "/data/local/bin/su",
            "/system/sd/xbin/su",
            "/system/bin/failsafe/su",
            "/data/local/su",
            "/system/xbin/daemonsu",
            "/system/etc/init.d/99SuperSUDaemon",
            "/system/bin/.ext/.su",
            "/system/usr/we-need-root/su-backup"
        )
        for (p in paths) {
            try {
                if (File(p).exists()) return true
            } catch (_: Exception) {}
        }
        return false
    }

    private fun checkRootPackages(): Boolean {
        val packages = arrayOf(
            "com.topjohnwu.magisk",
            "eu.chainfire.supersu",
            "com.koushikdutta.superuser",
            "com.noshufou.android.su",
            "com.thirdparty.superuser",
            "io.github.vvb2060.magisk",
            "me.weishu.kernelsu",
            "com.chelpus.lackypatch"
        )
        val pm = reactApplicationContext.packageManager
        for (pkg in packages) {
            try {
                pm.getPackageInfo(pkg, 0)
                return true
            } catch (_: Exception) {}
        }
        return false
    }

    private fun checkMagiskMounts(): Boolean {
        try {
            val file = File("/proc/mounts")
            if (file.exists() && file.canRead()) {
                BufferedReader(FileReader(file)).use { reader ->
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        val lower = line?.lowercase() ?: ""
                        if (lower.contains("magisk") || lower.contains("core/mirror") || lower.contains("core/img")) {
                            return true
                        }
                    }
                }
            }
        } catch (_: Exception) {}
        return false
    }

    private fun checkFridaPort(): Boolean {
        val ports = intArrayOf(27042, 27043)
        for (port in ports) {
            try {
                Socket().use { socket ->
                    socket.connect(InetSocketAddress("127.0.0.1", port), 40)
                    return true
                }
            } catch (_: Exception) {}
        }
        return false
    }

    private fun checkMemoryMaps(): Boolean {
        try {
            val file = File("/proc/self/maps")
            if (file.exists() && file.canRead()) {
                BufferedReader(FileReader(file)).use { reader ->
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        val lower = line?.lowercase() ?: ""
                        if (lower.contains("frida-gadget") ||
                            lower.contains("frida-agent") ||
                            lower.contains("libfrida") ||
                            lower.contains("gum-js-loop") ||
                            lower.contains("edxposed") ||
                            lower.contains("lsposed") ||
                            lower.contains("xposed") ||
                            lower.contains("substrate")
                        ) {
                            return true
                        }
                    }
                }
            }
        } catch (_: Exception) {}
        return false
    }

    private fun checkTracerPid(): Boolean {
        try {
            val file = File("/proc/self/status")
            if (file.exists() && file.canRead()) {
                BufferedReader(FileReader(file)).use { reader ->
                    var line: String?
                    while (reader.readLine().also { line = it } != null) {
                        if (line?.startsWith("TracerPid:") == true) {
                            val parts = line!!.split(":")
                            if (parts.size > 1) {
                                val pid = parts[1].trim().toIntOrNull() ?: 0
                                if (pid > 0) return true
                            }
                        }
                    }
                }
            }
        } catch (_: Exception) {}
        return false
    }
}
