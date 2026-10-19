package com.control.security

import android.app.Activity
import android.content.Context
import android.view.WindowManager

/**
 * Esconde o conteúdo do app na tela de apps recentes (e bloqueia prints)
 * com FLAG_SECURE. A escolha fica salva para valer desde o primeiro frame,
 * antes de o JavaScript carregar.
 */
object SecureScreen {
  private const val PREFS = "app_security"
  private const val KEY_SECURE = "secure_screen"

  fun isEnabled(context: Context): Boolean =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(KEY_SECURE, false)

  fun setEnabled(context: Context, enabled: Boolean) {
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
      .edit()
      .putBoolean(KEY_SECURE, enabled)
      .apply()
  }

  fun apply(activity: Activity) {
    if (isEnabled(activity)) {
      activity.window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
    } else {
      activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
    }
  }
}
