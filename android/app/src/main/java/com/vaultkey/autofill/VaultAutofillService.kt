package com.vaultkey.autofill

import android.app.PendingIntent
import android.app.assist.AssistStructure
import android.content.Intent
import android.os.Build
import android.os.CancellationSignal
import android.service.autofill.*
import android.view.autofill.AutofillId
import android.view.autofill.AutofillValue
import android.widget.RemoteViews
import androidx.annotation.RequiresApi
import com.vaultkey.crypto.AesGcmCipher
import com.vaultkey.session.VaultSessionManager
import java.util.Locale
import java.util.regex.Pattern

@RequiresApi(Build.VERSION_CODES.O)
class VaultAutofillService : AutofillService() {

    companion object {
        private val EMAIL_PATTERN = Pattern.compile(
            "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$"
        )
    }


    override fun onFillRequest(
        request: FillRequest,
        cancellationSignal: CancellationSignal,
        callback: FillCallback
    ) {
        val structure = request.fillContexts.lastOrNull()?.structure
        if (structure == null) {
            callback.onSuccess(null)
            return
        }

        val sessionManager = VaultSessionManager.getInstance(applicationContext)

        // Find relevant fields and domain
        val parsed = parseStructure(structure)
        val domain = parsed.domain
        val usernameId = parsed.usernameId
        val emailId = parsed.emailId
        val passwordId = parsed.passwordId

        val effectiveUsernameId = usernameId ?: emailId

        if (passwordId == null && effectiveUsernameId == null) {
            callback.onSuccess(null)
            return
        }

        val normalizedDomain = DomainMatcher.normalizeDomain(domain)

        // Prepare SaveInfo with ALL data types: PASSWORD, USERNAME, EMAIL_ADDRESS
        val primarySaveId = passwordId ?: effectiveUsernameId
        val saveInfo = if (primarySaveId != null) {
            val saveTypes = SaveInfo.SAVE_DATA_TYPE_PASSWORD or
                    SaveInfo.SAVE_DATA_TYPE_USERNAME or
                    SaveInfo.SAVE_DATA_TYPE_EMAIL_ADDRESS
            val saveBuilder = SaveInfo.Builder(saveTypes, arrayOf(primarySaveId))
            val optionals = mutableListOf<AutofillId>()
            if (passwordId != null && passwordId != primarySaveId) optionals.add(passwordId)
            if (effectiveUsernameId != null && effectiveUsernameId != primarySaveId) optionals.add(effectiveUsernameId)
            if (emailId != null && emailId != primarySaveId && emailId != effectiveUsernameId) optionals.add(emailId)
            if (optionals.isNotEmpty()) {
                saveBuilder.setOptionalIds(optionals.toTypedArray())
            }
            // Essential for web & SPA sign-up forms: triggers onSaveRequest when form views become invisible on submit
            saveBuilder.setFlags(SaveInfo.FLAG_SAVE_ON_ALL_VIEWS_INVISIBLE)
            saveBuilder.build()
        } else null

        // If vault is locked, present an unlock intent
        if (!sessionManager.isUnlocked()) {
            val unlockIntent = Intent(this, AutofillUnlockActivity::class.java).apply {
                putExtra(AutofillUnlockActivity.EXTRA_DOMAIN, normalizedDomain)
                putExtra(AutofillUnlockActivity.EXTRA_USERNAME_ID, effectiveUsernameId)
                putExtra(AutofillUnlockActivity.EXTRA_PASSWORD_ID, passwordId)
            }

            val pendingIntent = PendingIntent.getActivity(
                this,
                1001,
                unlockIntent,
                PendingIntent.FLAG_CANCEL_CURRENT or PendingIntent.FLAG_MUTABLE
            )

            val presentation = RemoteViews(packageName, android.R.layout.simple_list_item_1).apply {
                setTextViewText(android.R.id.text1, "Unlock VaultKey to fill credentials")
            }

            val responseBuilder = FillResponse.Builder()
                .setAuthentication(
                    arrayOf(passwordId ?: effectiveUsernameId!!),
                    pendingIntent.intentSender,
                    presentation
                )
            if (saveInfo != null) {
                responseBuilder.setSaveInfo(saveInfo)
            }

            callback.onSuccess(responseBuilder.build())
            return
        }

        // Vault is unlocked: query matching credentials
        val matches = sessionManager.dao.findLoginsByDomain(normalizedDomain)
        if (matches.isEmpty()) {
            // No credentials found yet, but attach SaveInfo so newly submitted sign-up passwords can be auto-saved
            if (saveInfo != null) {
                val emptyResponse = FillResponse.Builder()
                    .setSaveInfo(saveInfo)
                    .build()
                callback.onSuccess(emptyResponse)
            } else {
                callback.onSuccess(null)
            }
            return
        }

        val responseBuilder = FillResponse.Builder()
        if (saveInfo != null) {
            responseBuilder.setSaveInfo(saveInfo)
        }

        val dek = sessionManager.getActiveDek()

        for ((_, cred) in matches) {
            val plainPassword = try {
                AesGcmCipher.decryptToString(cred.encryptedPassword, cred.passwordIv, dek)
            } catch (e: Exception) {
                continue
            }

            val presentation = RemoteViews(packageName, android.R.layout.simple_list_item_1).apply {
                setTextViewText(android.R.id.text1, "VaultKey: ${cred.username}")
            }

            val datasetBuilder = Dataset.Builder()
            if (effectiveUsernameId != null) {
                datasetBuilder.setValue(effectiveUsernameId, AutofillValue.forText(cred.username), presentation)
            }
            if (passwordId != null) {
                datasetBuilder.setValue(passwordId, AutofillValue.forText(plainPassword), presentation)
            }

            responseBuilder.addDataset(datasetBuilder.build())
        }

        sessionManager.dao.logAuditEvent("AUTOFILL_USED", "Autofilled credentials for $normalizedDomain", true)
        callback.onSuccess(responseBuilder.build())

    }

    override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
        val structure = request.fillContexts.lastOrNull()?.structure
        if (structure == null) {
            callback.onSuccess()
            return
        }

        val sessionManager = VaultSessionManager.getInstance(applicationContext)
        val creds = extractEnteredCredentials(structure)

        if (creds.password.isBlank()) {
            callback.onSuccess()
            return
        }

        val normalizedDomain = DomainMatcher.normalizeDomain(creds.domain)
        val title = resolveTitle(creds.domain, normalizedDomain)
        val username = creds.username.ifBlank { "User" }
        val webUrl = if (creds.webUrl.isNotBlank()) {
            creds.webUrl
        } else if (normalizedDomain.contains(".")) {
            "https://$normalizedDomain"
        } else {
            ""
        }

        // If vault is currently unlocked, save directly and securely
        if (sessionManager.isUnlocked()) {
            val id = sessionManager.autoSaveLoginCredential(
                title = title,
                username = username,
                password = creds.password,
                domain = normalizedDomain,
                webUrl = webUrl
            )
            if (id != null) {
                android.os.Handler(android.os.Looper.getMainLooper()).post {
                    android.widget.Toast.makeText(
                        applicationContext,
                        "Password saved to VaultKey ($title)",
                        android.widget.Toast.LENGTH_SHORT
                    ).show()
                }
            }
            callback.onSuccess()
        } else {
            // Vault is locked: launch AutofillSaveActivity for biometric or master password confirmation
            val saveIntent = Intent(this, AutofillSaveActivity::class.java).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                putExtra(AutofillSaveActivity.EXTRA_DOMAIN, normalizedDomain)
                putExtra(AutofillSaveActivity.EXTRA_TITLE, title)
                putExtra(AutofillSaveActivity.EXTRA_USERNAME, username)
                putExtra(AutofillSaveActivity.EXTRA_PASSWORD, creds.password)
                putExtra(AutofillSaveActivity.EXTRA_WEB_URL, webUrl)
            }
            startActivity(saveIntent)
            callback.onSuccess()
        }
    }

    private fun resolveTitle(rawDomain: String, normalizedDomain: String): String {
        // If it's an installed package name, resolve app label
        if (rawDomain.contains(".") && !rawDomain.contains("://") &&
            (rawDomain.startsWith("com.") || rawDomain.startsWith("org.") || rawDomain.startsWith("net."))) {
            try {
                val appInfo = packageManager.getApplicationInfo(rawDomain, 0)
                val label = packageManager.getApplicationLabel(appInfo).toString()
                if (label.isNotBlank()) return label
            } catch (_: Exception) {}
        }
        val domainName = DomainMatcher.extractDomainName(normalizedDomain)
        return domainName.replaceFirstChar {
            if (it.isLowerCase()) it.titlecase(Locale.ROOT) else it.toString()
        }
    }

    private data class ParsedFields(
        var domain: String = "",
        var webUrl: String = "",
        var usernameId: AutofillId? = null,
        var emailId: AutofillId? = null,
        var passwordId: AutofillId? = null
    )

    private fun parseStructure(structure: AssistStructure): ParsedFields {
        val result = ParsedFields()
        val pkg = structure.activityComponent.packageName
        result.domain = pkg

        for (i in 0 until structure.windowNodeCount) {
            val windowNode = structure.getWindowNodeAt(i)
            traverseNode(windowNode.rootViewNode, result)
        }
        return result
    }

    private fun traverseNode(node: AssistStructure.ViewNode?, result: ParsedFields) {
        if (node == null) return

        if (!node.webDomain.isNullOrBlank()) {
            result.domain = node.webDomain!!
            val scheme = node.webScheme ?: "https"
            result.webUrl = "$scheme://${node.webDomain}"
        }

        val hints = node.autofillHints
        val idEntry = node.idEntry?.lowercase(Locale.ROOT) ?: ""
        val hintText = node.hint?.lowercase(Locale.ROOT) ?: ""
        val inputType = node.inputType

        var isEmail = false
        var isUser = false
        var isPass = false

        if (hints != null) {
            for (hint in hints) {
                val lowerHint = hint.lowercase(Locale.ROOT)
                if (lowerHint.contains("email")) isEmail = true
                else if (lowerHint.contains("user")) isUser = true
                else if (lowerHint.contains("password")) isPass = true
            }
        }

        if (!isPass && !isEmail && !isUser) {
            val isEmailType = (inputType and android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS != 0) ||
                    (inputType and android.text.InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS != 0)
            val isPasswordType = (inputType and android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD != 0) ||
                    (inputType and android.text.InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD != 0) ||
                    (inputType and android.text.InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD != 0) ||
                    (inputType and android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD != 0)

            if (isEmailType) {
                isEmail = true
            } else if (isPasswordType) {
                isPass = true
            } else if (idEntry.contains("email") || hintText.contains("email") || hintText.contains("mail")) {
                isEmail = true
            } else if (idEntry.contains("password") || idEntry.contains("pass") || idEntry.contains("pwd") ||
                hintText.contains("password") || hintText.contains("pass")) {
                isPass = true
            } else if (idEntry.contains("user") || idEntry.contains("login") || idEntry.contains("account") ||
                hintText.contains("user") || hintText.contains("login")) {
                isUser = true
            }
        }

        if (isEmail && result.emailId == null) {
            result.emailId = node.autofillId
        }
        if (isUser && result.usernameId == null) {
            result.usernameId = node.autofillId
        }
        if (isPass && result.passwordId == null) {
            result.passwordId = node.autofillId
        }

        for (i in 0 until node.childCount) {
            traverseNode(node.getChildAt(i), result)
        }
    }

    private data class ExtractedCredentials(
        var domain: String = "",
        var webUrl: String = "",
        var username: String = "",
        var password: String = ""
    )

    private fun extractEnteredCredentials(structure: AssistStructure): ExtractedCredentials {
        val result = ExtractedCredentials()
        result.domain = structure.activityComponent.packageName

        for (i in 0 until structure.windowNodeCount) {
            val windowNode = structure.getWindowNodeAt(i)
            traverseForEnteredText(windowNode.rootViewNode, result)
        }
        return result
    }

    private fun traverseForEnteredText(node: AssistStructure.ViewNode?, result: ExtractedCredentials) {
        if (node == null) return

        if (!node.webDomain.isNullOrBlank()) {
            result.domain = node.webDomain!!
            val scheme = node.webScheme ?: "https"
            result.webUrl = "$scheme://${node.webDomain}"
        }

        val text = node.text?.toString() ?: node.autofillValue?.textValue?.toString() ?: ""
        val hints = node.autofillHints
        val idEntry = node.idEntry?.lowercase(Locale.ROOT) ?: ""
        val hintText = node.hint?.lowercase(Locale.ROOT) ?: ""
        val inputType = node.inputType

        if (text.isNotBlank()) {
            var isPass = false
            var isUser = false
            var isEmail = false

            // Check if entered text itself is a valid email address
            if (EMAIL_PATTERN.matcher(text.trim()).matches()) {
                isEmail = true
            }

            if (hints != null) {
                for (h in hints) {
                    val lower = h.lowercase(Locale.ROOT)
                    if (lower.contains("password")) isPass = true
                    if (lower.contains("email")) isEmail = true
                    if (lower.contains("user")) isUser = true
                }
            }

            if (!isPass && !isEmail && !isUser) {
                val isEmailType = (inputType and android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS != 0) ||
                        (inputType and android.text.InputType.TYPE_TEXT_VARIATION_WEB_EMAIL_ADDRESS != 0)
                val isPasswordType = (inputType and android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD != 0) ||
                        (inputType and android.text.InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD != 0) ||
                        (inputType and android.text.InputType.TYPE_TEXT_VARIATION_WEB_PASSWORD != 0) ||
                        (inputType and android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD != 0)

                if (isEmailType) {
                    isEmail = true
                } else if (isPasswordType) {
                    isPass = true
                } else if (idEntry.contains("password") || idEntry.contains("pass") || idEntry.contains("pwd") ||
                    hintText.contains("password") || hintText.contains("pass")) {
                    isPass = true
                } else if (idEntry.contains("email") || hintText.contains("email") || hintText.contains("mail")) {
                    isEmail = true
                } else if (idEntry.contains("user") || idEntry.contains("login") || idEntry.contains("account") ||
                    hintText.contains("user") || hintText.contains("login")) {
                    isUser = true
                }
            }

            if (isPass && result.password.isBlank()) {
                result.password = text
            } else if ((isEmail || isUser) && result.username.isBlank()) {
                result.username = text.trim()
            }
        }

        for (i in 0 until node.childCount) {
            traverseForEnteredText(node.getChildAt(i), result)
        }
    }
}