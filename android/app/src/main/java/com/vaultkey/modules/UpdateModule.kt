package com.vaultkey.modules

import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

class UpdateModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "UpdateModule"

    private val coroutineScope = CoroutineScope(Dispatchers.IO)

    @ReactMethod
    fun getAppVersion(promise: Promise) {
        try {
            val pInfo = reactApplicationContext.packageManager.getPackageInfo(reactApplicationContext.packageName, 0)
            val versionName = pInfo.versionName ?: "1.0.0"
            val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                pInfo.longVersionCode
            } else {
                @Suppress("DEPRECATION")
                pInfo.versionCode.toLong()
            }

            val map = Arguments.createMap().apply {
                putString("versionName", versionName)
                putDouble("versionCode", versionCode.toDouble())
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("ERR_VERSION", e.message, e)
        }
    }

    @ReactMethod
    fun checkForUpdate(promise: Promise) {
        coroutineScope.launch {
            try {
                val pInfo = reactApplicationContext.packageManager.getPackageInfo(reactApplicationContext.packageName, 0)
                val currentVersion = pInfo.versionName ?: "1.0.0"

                val apiUrl = "https://api.github.com/repos/Sami12901/vaultkey/releases/latest"
                val url = URL(apiUrl)
                val connection = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    setRequestProperty("Accept", "application/vnd.github.v3+json")
                    setRequestProperty("User-Agent", "VaultKey-Android-App")
                    connectTimeout = 15000
                    readTimeout = 15000
                }

                if (connection.responseCode != 200) {
                    promise.reject("ERR_HTTP", "GitHub API returned HTTP ${connection.responseCode}")
                    return@launch
                }

                val responseStr = connection.inputStream.bufferedReader().use { it.readText() }
                val releaseObj = JSONObject(responseStr)

                val tagName = releaseObj.optString("tag_name", "")
                val releaseName = releaseObj.optString("name", tagName)
                val changelog = releaseObj.optString("body", "")
                val publishedAt = releaseObj.optString("published_at", "")

                val assetsArr = releaseObj.optJSONArray("assets")
                var apkUrl = ""
                var apkName = ""
                var apkSize = 0L

                if (assetsArr != null) {
                    for (i in 0 until assetsArr.length()) {
                        val asset = assetsArr.getJSONObject(i)
                        val name = asset.optString("name", "")
                        if (name.endsWith(".apk", ignoreCase = true)) {
                            apkUrl = asset.optString("browser_download_url", "")
                            apkName = name
                            apkSize = asset.optLong("size", 0L)
                            break
                        }
                    }
                }

                val hasUpdate = isNewerVersion(tagName, currentVersion) && apkUrl.isNotEmpty()

                // Extract SHA-256 hash if present in release changelog/body
                val sha256Regex = Regex("(?i)sha-?256[:\\s=]+([a-f0-9]{64})")
                val expectedSha256 = sha256Regex.find(changelog)?.groupValues?.get(1) ?: ""

                val result = Arguments.createMap().apply {
                    putBoolean("hasUpdate", hasUpdate)
                    putString("latestVersion", tagName)
                    putString("currentVersion", currentVersion)
                    putString("releaseName", releaseName)
                    putString("changelog", changelog)
                    putString("publishedAt", publishedAt)
                    putString("apkUrl", apkUrl)
                    putString("apkName", apkName)
                    putDouble("apkSize", apkSize.toDouble())
                    putString("expectedSha256", expectedSha256)
                }
                promise.resolve(result)
            } catch (e: Exception) {
                promise.reject("ERR_CHECK_UPDATE", e.message, e)
            }
        }
    }

    @ReactMethod
    fun startDownload(apkUrl: String, promise: Promise) {
        coroutineScope.launch {
            try {
                val targetFile = File(reactApplicationContext.cacheDir, "VaultKey-Update.apk")
                if (targetFile.exists()) {
                    targetFile.delete()
                }

                var currentUrl = apkUrl
                var connection: HttpURLConnection
                var redirects = 0
                val maxRedirects = 8

                // Handle HTTP 301/302 redirects (GitHub release asset redirects to S3)
                while (true) {
                    val u = URL(currentUrl)
                    connection = (u.openConnection() as HttpURLConnection).apply {
                        requestMethod = "GET"
                        setRequestProperty("User-Agent", "VaultKey-Android-App")
                        instanceFollowRedirects = false
                        connectTimeout = 20000
                        readTimeout = 20000
                    }
                    val code = connection.responseCode
                    if (code == HttpURLConnection.HTTP_MOVED_PERM ||
                        code == HttpURLConnection.HTTP_MOVED_TEMP ||
                        code == 307 || code == 308) {
                        val newLocation = connection.getHeaderField("Location")
                        if (newLocation != null && redirects < maxRedirects) {
                            currentUrl = newLocation
                            redirects++
                            continue
                        }
                    }
                    break
                }

                val totalLength = connection.contentLength.toLong()
                var downloaded: Long = 0
                val buffer = ByteArray(16384)

                var input: InputStream? = null
                var output: FileOutputStream? = null
                try {
                    input = connection.inputStream
                    output = FileOutputStream(targetFile)

                    var lastEmittedTime = System.currentTimeMillis()
                    var bytesRead: Int
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        output.write(buffer, 0, bytesRead)
                        downloaded += bytesRead

                        val now = System.currentTimeMillis()
                        if (now - lastEmittedTime >= 200 || downloaded == totalLength) {
                            lastEmittedTime = now
                            val percent = if (totalLength > 0) ((downloaded * 100) / totalLength).toInt() else 0
                            val event = Arguments.createMap().apply {
                                putInt("percent", percent)
                                putDouble("downloadedBytes", downloaded.toDouble())
                                putDouble("totalBytes", totalLength.toDouble())
                            }
                            sendEvent("onUpdateDownloadProgress", event)
                        }
                    }
                    output.flush()
                } finally {
                    output?.close()
                    input?.close()
                }

                val res = Arguments.createMap().apply {
                    putBoolean("success", true)
                    putString("filePath", targetFile.absolutePath)
                }
                promise.resolve(res)
            } catch (e: Exception) {
                promise.reject("ERR_DOWNLOAD", e.message, e)
            }
        }
    }

    @ReactMethod
    fun canInstallUnknownApps(promise: Promise) {
        try {
            val canInstall = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.packageManager.canRequestPackageInstalls()
            } else {
                true
            }
            promise.resolve(canInstall)
        } catch (e: Exception) {
            promise.reject("ERR_CAN_INSTALL", e.message, e)
        }
    }

    @ReactMethod
    fun openInstallPermissionSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERR_SETTINGS", e.message, e)
        }
    }

    @ReactMethod
    fun verifyAndInstallApk(filePath: String, expectedSha256: String?, promise: Promise) {
        try {
            val apkFile = File(filePath)
            if (!apkFile.exists()) {
                promise.reject("ERR_FILE_NOT_FOUND", "Downloaded update file not found at $filePath")
                return
            }

            // 1. Calculate and verify file SHA-256 digest
            val actualSha256 = calculateFileSha256(apkFile)
            if (!expectedSha256.isNullOrBlank()) {
                val cleanExpected = expectedSha256.trim().lowercase()
                if (actualSha256 != cleanExpected) {
                    apkFile.delete()
                    promise.reject(
                        "ERR_CHECKSUM_MISMATCH",
                        "Security Warning: APK checksum mismatch! Expected $cleanExpected, found $actualSha256. File deleted."
                    )
                    return
                }
            }

            // 2. Cryptographic signature and package name verification
            try {
                verifyApkSignatureAndPackage(apkFile)
            } catch (sec: SecurityException) {
                apkFile.delete()
                promise.reject("ERR_SIGNATURE_MISMATCH", sec.message, sec)
                return
            }

            // 3. Permission check for Android O+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!reactApplicationContext.packageManager.canRequestPackageInstalls()) {
                    promise.reject("ERR_PERMISSION_REQUIRED", "Permission to install unknown packages required")
                    return
                }
            }

            val apkUri = FileProvider.getUriForFile(
                reactApplicationContext,
                "${reactApplicationContext.packageName}.fileprovider",
                apkFile
            )

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            reactApplicationContext.startActivity(installIntent)
            val res = Arguments.createMap().apply {
                putBoolean("success", true)
                putString("sha256", actualSha256)
            }
            promise.resolve(res)
        } catch (e: Exception) {
            promise.reject("ERR_INSTALL", e.message, e)
        }
    }

    @ReactMethod
    fun installApk(filePath: String, promise: Promise) {
        verifyAndInstallApk(filePath, null, promise)
    }

    private fun calculateFileSha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(8192)
            var bytesRead: Int
            while (input.read(buffer).also { bytesRead = it } != -1) {
                digest.update(buffer, 0, bytesRead)
            }
        }
        return digest.digest().joinToString("") { "%02x".format(it) }
    }

    private fun getCertFingerprint(certBytes: ByteArray): String {
        val md = MessageDigest.getInstance("SHA-256")
        return md.digest(certBytes).joinToString("") { "%02x".format(it) }
    }

    private fun verifyApkSignatureAndPackage(file: File) {
        val pm = reactApplicationContext.packageManager
        val currentPackageName = reactApplicationContext.packageName

        val archiveFlags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageManager.GET_SIGNING_CERTIFICATES
        } else {
            @Suppress("DEPRECATION")
            PackageManager.GET_SIGNATURES
        }

        val archiveInfo = pm.getPackageArchiveInfo(file.absolutePath, archiveFlags)
            ?: throw SecurityException("Unable to inspect APK package: corrupted or invalid archive format")

        if (archiveInfo.packageName != currentPackageName) {
            throw SecurityException("Package ID mismatch! Expected '$currentPackageName' but found '${archiveInfo.packageName}'")
        }

        val archiveFingerprints: List<String> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            archiveInfo.signingInfo?.apkContentsSigners?.map { getCertFingerprint(it.toByteArray()) } ?: emptyList()
        } else {
            @Suppress("DEPRECATION")
            archiveInfo.signatures?.map { getCertFingerprint(it.toByteArray()) } ?: emptyList()
        }

        if (archiveFingerprints.isEmpty()) {
            throw SecurityException("APK archive has no valid cryptographic signatures")
        }

        val currentAppInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            pm.getPackageInfo(currentPackageName, PackageManager.GET_SIGNING_CERTIFICATES)
        } else {
            @Suppress("DEPRECATION")
            pm.getPackageInfo(currentPackageName, PackageManager.GET_SIGNATURES)
        }

        val currentFingerprints: List<String> = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            currentAppInfo.signingInfo?.apkContentsSigners?.map { getCertFingerprint(it.toByteArray()) } ?: emptyList()
        } else {
            @Suppress("DEPRECATION")
            currentAppInfo.signatures?.map { getCertFingerprint(it.toByteArray()) } ?: emptyList()
        }

        if (currentFingerprints.isEmpty()) {
            throw SecurityException("Host application signing certificates could not be determined")
        }

        val isCertMatch = archiveFingerprints.any { currentFingerprints.contains(it) }
        if (!isCertMatch) {
            throw SecurityException("APK signature mismatch! The downloaded update was not signed with the legitimate VaultKey key. Installation aborted.")
        }
    }

    private fun isNewerVersion(latestTag: String, currentVer: String): Boolean {
        val cleanLatest = latestTag.trim().removePrefix("v").removePrefix("V")
        val cleanCurrent = currentVer.trim().removePrefix("v").removePrefix("V")

        val latestParts = cleanLatest.split(".").mapNotNull { it.toIntOrNull() }
        val currentParts = cleanCurrent.split(".").mapNotNull { it.toIntOrNull() }

        val maxLen = maxOf(latestParts.size, currentParts.size)
        for (i in 0 until maxLen) {
            val l = latestParts.getOrElse(i) { 0 }
            val c = currentParts.getOrElse(i) { 0 }
            if (l > c) return true
            if (l < c) return false
        }
        return false
    }

    private fun sendEvent(eventName: String, params: WritableMap) {
        if (reactApplicationContext.hasActiveReactInstance()) {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        }
    }
}

