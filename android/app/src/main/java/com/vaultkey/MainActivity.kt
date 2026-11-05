package com.vaultkey

import android.os.Bundle
import android.view.WindowManager
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.vaultkey.session.VaultSessionManager

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "VaultKey"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Enable FLAG_SECURE to prevent screenshot capture and app switcher snooping
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
    }

    override fun onResume() {
        super.onResume()
        val session = VaultSessionManager.getInstance(applicationContext)
        // Check if auto-lock expired while backgrounded BEFORE refreshing monotonic activity timer
        if (session.isLocked()) {
            // State property check evaluates shouldAutoLock() and locks active DEK if timed out
        } else {
            session.touch()
        }
    }

    override fun onPause() {
        super.onPause()
        VaultSessionManager.getInstance(applicationContext).touch()
    }
}
