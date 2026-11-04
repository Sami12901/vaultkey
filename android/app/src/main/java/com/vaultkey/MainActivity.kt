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
        // Touch session activity or trigger auto-lock check
        VaultSessionManager.getInstance(applicationContext).touch()
    }

    override fun onPause() {
        super.onPause()
        VaultSessionManager.getInstance(applicationContext).touch()
    }
}
