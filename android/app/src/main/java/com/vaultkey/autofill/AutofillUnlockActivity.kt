package com.vaultkey.autofill

import android.app.Activity
import android.app.PendingIntent
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.service.autofill.Dataset
import android.service.autofill.FillResponse
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.autofill.AutofillId
import android.view.autofill.AutofillManager
import android.view.autofill.AutofillValue
import android.widget.*
import androidx.annotation.RequiresApi
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import com.vaultkey.crypto.AesGcmCipher
import com.vaultkey.crypto.MemorySecurity
import com.vaultkey.database.VaultDao
import com.vaultkey.session.VaultSessionManager
import org.json.JSONArray

@RequiresApi(Build.VERSION_CODES.O)
class AutofillUnlockActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_DOMAIN = "extra_domain"
        const val EXTRA_USERNAME_ID = "extra_username_id"
        const val EXTRA_PASSWORD_ID = "extra_password_id"
    }

    private lateinit var sessionManager: VaultSessionManager
    private var targetDomain: String = ""
    private var usernameId: AutofillId? = null
    private var passwordId: AutofillId? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Screen security
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )

        sessionManager = VaultSessionManager.getInstance(this)
        targetDomain = intent.getStringExtra(EXTRA_DOMAIN) ?: ""
        usernameId = intent.getParcelableExtra(EXTRA_USERNAME_ID)
        passwordId = intent.getParcelableExtra(EXTRA_PASSWORD_ID)

        // Try biometric unlock first if configured
        if (sessionManager.isBiometricUnlockAvailable()) {
            promptBiometricUnlock()
        }

        buildUnlockUi()
    }

    private fun promptBiometricUnlock() {
        val decryptCipher = sessionManager.getBiometricDecryptCipher() ?: return

        val executor = ContextCompat.getMainExecutor(this)
        val prompt = BiometricPrompt(this, executor, object : BiometricPrompt.AuthenticationCallback() {
            override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                val cipher = result.cryptoObject?.cipher
                if (cipher != null && sessionManager.unlockWithBiometrics(cipher)) {
                    fillMatchingCredentialsAndFinish()
                } else {
                    Toast.makeText(this@AutofillUnlockActivity, "Biometric unlock failed", Toast.LENGTH_SHORT).show()
                }
            }

            override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                // Fall back to password UI
            }
        })

        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle("VaultKey Autofill")
            .setSubtitle("Unlock vault for $targetDomain")
            .setNegativeButtonText("Use Password")
            .build()

        prompt.authenticate(promptInfo, BiometricPrompt.CryptoObject(decryptCipher))
    }

    private fun buildUnlockUi() {
        val rootLayout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setBackgroundColor(Color.parseColor("#0B0F17"))
            setPadding(48, 64, 48, 64)
        }

        val cardView = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val bg = GradientDrawable().apply {
                setColor(Color.parseColor("#131B2A"))
                cornerRadius = 32f
                setStroke(2, Color.parseColor("#223147"))
            }
            background = bg
            setPadding(48, 48, 48, 48)
        }

        val title = TextView(this).apply {
            text = "VaultKey Autofill"
            setTextColor(Color.parseColor("#F8FAFC"))
            textSize = 20f
            typeface = Typeface.DEFAULT_BOLD
            gravity = Gravity.CENTER
        }

        val subtitle = TextView(this).apply {
            text = if (targetDomain.isNotEmpty()) "Unlock to autofill for $targetDomain" else "Unlock your vault"
            setTextColor(Color.parseColor("#94A3B8"))
            textSize = 14f
            gravity = Gravity.CENTER
            setPadding(0, 12, 0, 32)
        }

        val passwordInput = EditText(this).apply {
            hint = "Enter Master Password"
            setHintTextColor(Color.parseColor("#64748B"))
            setTextColor(Color.parseColor("#F8FAFC"))
            inputType = android.text.InputType.TYPE_CLASS_TEXT or android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD
            val inputBg = GradientDrawable().apply {
                setColor(Color.parseColor("#1A2436"))
                cornerRadius = 16f
                setStroke(2, Color.parseColor("#223147"))
            }
            background = inputBg
            setPadding(32, 24, 32, 24)
        }

        val unlockBtn = Button(this).apply {
            text = "Unlock & Fill"
            setTextColor(Color.WHITE)
            typeface = Typeface.DEFAULT_BOLD
            val btnBg = GradientDrawable().apply {
                setColor(Color.parseColor("#10B981"))
                cornerRadius = 16f
            }
            background = btnBg
            setPadding(0, 24, 0, 24)
            val params = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 32, 0, 0) }
            layoutParams = params

            setOnClickListener {
                val chars = passwordInput.text.toString().toCharArray()
                val success = try {
                    sessionManager.unlock(chars)
                } catch (e: Exception) {
                    Toast.makeText(this@AutofillUnlockActivity, e.message ?: "Authentication error", Toast.LENGTH_LONG).show()
                    false
                } finally {
                    MemorySecurity.wipe(chars)
                }

                if (success) {
                    fillMatchingCredentialsAndFinish()
                } else {
                    Toast.makeText(this@AutofillUnlockActivity, "Invalid Master Password", Toast.LENGTH_SHORT).show()
                }
            }
        }

        val cancelBtn = Button(this).apply {
            text = "Cancel"
            setTextColor(Color.parseColor("#94A3B8"))
            setBackgroundColor(Color.TRANSPARENT)
            setOnClickListener {
                setResult(Activity.RESULT_CANCELED)
                finish()
            }
        }

        cardView.addView(title)
        cardView.addView(subtitle)
        cardView.addView(passwordInput)
        cardView.addView(unlockBtn)
        cardView.addView(cancelBtn)

        rootLayout.addView(cardView)
        setContentView(rootLayout)
    }

    private fun fillMatchingCredentialsAndFinish() {
        val matches = sessionManager.dao.findLoginsByDomain(targetDomain)
        if (matches.isEmpty()) {
            Toast.makeText(this, "No matching credentials found for $targetDomain", Toast.LENGTH_SHORT).show()
            setResult(Activity.RESULT_CANCELED)
            finish()
            return
        }

        val dek = sessionManager.getActiveDek()
        val (_, cred) = matches[0]
        val plainPassword = try {
            AesGcmCipher.decryptToString(cred.encryptedPassword, cred.passwordIv, dek)
        } catch (e: Exception) {
            setResult(Activity.RESULT_CANCELED)
            finish()
            return
        }

        val replyIntent = Intent()
        val datasetBuilder = Dataset.Builder()

        val presentation = RemoteViews(packageName, android.R.layout.simple_list_item_1).apply {
            setTextViewText(android.R.id.text1, "VaultKey: ${cred.username}")
        }

        if (usernameId != null) {
            datasetBuilder.setValue(usernameId!!, AutofillValue.forText(cred.username), presentation)
        }
        if (passwordId != null) {
            datasetBuilder.setValue(passwordId!!, AutofillValue.forText(plainPassword), presentation)
        }

        val response = FillResponse.Builder()
            .addDataset(datasetBuilder.build())
            .build()

        replyIntent.putExtra(AutofillManager.EXTRA_AUTHENTICATION_RESULT, response)
        setResult(Activity.RESULT_OK, replyIntent)
        finish()
    }
}
