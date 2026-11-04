package com.vaultkey.autofill

import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.*
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import com.vaultkey.crypto.MemorySecurity
import com.vaultkey.session.VaultSessionManager

@RequiresApi(Build.VERSION_CODES.O)
class AutofillSaveActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_DOMAIN = "extra_domain"
        const val EXTRA_TITLE = "extra_title"
        const val EXTRA_USERNAME = "extra_username"
        const val EXTRA_PASSWORD = "extra_password"
        const val EXTRA_WEB_URL = "extra_web_url"
    }

    private lateinit var sessionManager: VaultSessionManager
    private var targetDomain: String = ""
    private var targetTitle: String = ""
    private var targetUsername: String = ""
    private var targetPassword: String = ""
    private var targetWebUrl: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Screen security to prevent snooping
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )

        sessionManager = VaultSessionManager.getInstance(this)
        targetDomain = intent.getStringExtra(EXTRA_DOMAIN) ?: "Unknown"
        targetTitle = intent.getStringExtra(EXTRA_TITLE) ?: targetDomain
        targetUsername = intent.getStringExtra(EXTRA_USERNAME) ?: ""
        targetPassword = intent.getStringExtra(EXTRA_PASSWORD) ?: ""
        targetWebUrl = intent.getStringExtra(EXTRA_WEB_URL) ?: ""

        // If vault is already unlocked, save immediately
        if (sessionManager.isUnlocked()) {
            performSave()
            return
        }

        // Vault is locked: prompt biometrics if available
        if (sessionManager.isBiometricUnlockAvailable()) {
            promptBiometricUnlock()
        }

        buildSaveUi()
    }

    private fun promptBiometricUnlock() {
        val decryptCipher = sessionManager.getBiometricDecryptCipher() ?: return

        val executor = ContextCompat.getMainExecutor(this)
        val prompt = BiometricPrompt(this, executor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                val cipher = result.cryptoObject?.cipher
                if (cipher != null && sessionManager.unlockWithBiometrics(cipher)) {
                    performSave()
                } else {
                    Toast.makeText(this@AutofillSaveActivity, "Biometric unlock failed", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                // User can use master password
            }
        })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("Save to VaultKey")
            .setSubtitle("Unlock vault to save credentials for $targetTitle")
            .setNegativeButtonText("Use Password")
            .build()

        prompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(decryptCipher))
    }

    private fun performSave() {
        val id = sessionManager.autoSaveLoginCredential(
            title = targetTitle,
            username = targetUsername,
            password = targetPassword,
            domain = targetDomain,
            webUrl = targetWebUrl
        )
        if (id != null) {
            Toast.makeText(this, "Password saved to VaultKey ($targetTitle)", Toast.LENGTH_SHORT).show()
        } else {
            Toast.makeText(this, "Failed to save password", Toast.LENGTH_SHORT).show()
        }
        finish()
    }


    private fun buildSaveUi() {
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setBackgroundColor(Color.parseColor("#0B0F17"))
            setPadding(48, 48, 48, 48)
        }

        val cardBg = GradientDrawable().apply {
            setColor(Color.parseColor("#131B2A"))
            cornerRadius = 32f
            setStroke(2, Color.parseColor("#223147"))
        }

        val cardLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = cardBg
            setPadding(40, 40, 40, 40)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val titleView = TextView(this).apply {
            text = "Save Credentials to VaultKey?"
            setTextColor(Color.parseColor("#F8FAFC"))
            textSize = 18f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 12)
        }
        cardLayout.addView(titleView)

        val displayUrl = if (targetWebUrl.isNotBlank()) targetWebUrl else targetDomain
        val descView = TextView(this).apply {
            text = "Service: $targetTitle\nWeb URL: $displayUrl\nEmail / User: ${targetUsername.ifBlank { "(None)" }}"
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 14f
            gravity = Gravity.START
            setPadding(12, 0, 12, 24)
        }
        cardLayout.addView(descView)

        val passLabel = TextView(this).apply {
            text = "Master Password (to unlock & save)"
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 12f
            setPadding(0, 0, 0, 8)
        }
        cardLayout.addView(passLabel)


        val passInputBg = GradientDrawable().apply {
            setColor(Color.parseColor("#1A2436"))
            cornerRadius = 16f
            setStroke(2, Color.parseColor("#2D405D"))
        }

        val passInput = EditText(this).apply {
            background = passInputBg
            setTextColor(Color.parseColor("#F8FAFC"))
            setHintTextColor(Color.parseColor("#64748B"))
            hint = "Enter master password"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            setPadding(32, 28, 32, 28)
            textSize = 14f
        }
        cardLayout.addView(passInput)

        val btnLayout = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.END
            setPadding(0, 32, 0, 0)
        }

        val cancelBtn = Button(this).apply {
            text = "Not Now"
            setTextColor(Color.parseColor("#94A3B8"))
            setBackgroundColor(Color.TRANSPARENT)
            setOnClickListener { finish() }
        }
        btnLayout.addView(cancelBtn)

        val saveBtnBg = GradientDrawable().apply {
            setColor(Color.parseColor("#10B981"))
            cornerRadius = 16f
        }

        val saveBtn = Button(this).apply {
            text = "Save Password"
            setTextColor(Color.WHITE)
            background = saveBtnBg
            typeface = Typeface.DEFAULT_BOLD
            setPadding(32, 0, 32, 0)
            setOnClickListener {
                val chars = passInput.text.toString().toCharArray()
                try {
                    val unlocked = sessionManager.unlock(chars)
                    if (unlocked) {
                        performSave()
                    } else {
                        Toast.makeText(this@AutofillSaveActivity, "Incorrect master password", Toast.LENGTH_SHORT).show()
                    }
                } finally {
                    MemorySecurity.wipe(chars)
                }
            }
        }
        btnLayout.addView(saveBtn)
        cardLayout.addView(btnLayout)

        rootLayout.addView(cardLayout)
        setContentView(rootLayout)
    }
}
