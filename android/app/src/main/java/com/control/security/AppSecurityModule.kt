package com.control.security

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.UiThreadUtil

/** Ponte para ligar e desligar a proteção da tela de recentes. */
class AppSecurityModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  override fun getName() = "AppSecurity"

  @ReactMethod
  fun setSecureScreen(enabled: Boolean, promise: Promise) {
    SecureScreen.setEnabled(context, enabled)
    UiThreadUtil.runOnUiThread {
      context.currentActivity?.let { SecureScreen.apply(it) }
      promise.resolve(true)
    }
  }
}
