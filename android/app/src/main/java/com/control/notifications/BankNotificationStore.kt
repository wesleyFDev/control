package com.control.notifications

import android.content.Context
import java.io.File

/**
 * Configuração dos filtros e fila de notificações capturadas.
 *
 * Filtros, aplicados aqui no nativo para que o resto nunca chegue ao app:
 * - `blocked_packages`: apps que nunca são capturados.
 * - `allowed_packages`: apps sempre capturados, com ou sem valor em R$.
 * - `money_from_any_app`: captura de qualquer outro app as notificações que
 *   mostram um valor em R$. É o que permite descobrir de qual app vêm as
 *   notificações do banco, sem saber o pacote antes.
 *
 * A fila é um arquivo com um JSON por linha, na pasta interna do app.
 */
object BankNotificationStore {
  private const val PREFS = "bank_notifications"
  private const val KEY_ALLOWED = "allowed_packages"
  private const val KEY_BLOCKED = "blocked_packages"
  private const val KEY_MONEY_ANY_APP = "money_from_any_app"
  private const val KEY_CONNECTED_AT = "last_connected_at"
  private const val KEY_DISCONNECTED_AT = "last_disconnected_at"
  private const val KEY_CAPTURED_AT = "last_captured_at"
  private const val QUEUE_FILE = "bank_notifications_queue.jsonl"
  /** Evita que a fila cresça sem limite se o app ficar muito tempo sem abrir. */
  private const val MAX_QUEUE_BYTES = 2L * 1024 * 1024

  private val lock = Any()

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  fun allowedPackages(context: Context): Set<String> =
    prefs(context).getStringSet(KEY_ALLOWED, emptySet()).orEmpty()

  fun setAllowedPackages(context: Context, packages: Set<String>) {
    prefs(context).edit().putStringSet(KEY_ALLOWED, packages).apply()
  }

  fun blockedPackages(context: Context): Set<String> =
    prefs(context).getStringSet(KEY_BLOCKED, emptySet()).orEmpty()

  fun setBlockedPackages(context: Context, packages: Set<String>) {
    prefs(context).edit().putStringSet(KEY_BLOCKED, packages).apply()
  }

  /** Ligado por padrão: sem ele, um pacote errado faz o app não capturar nada. */
  fun moneyFromAnyApp(context: Context): Boolean =
    prefs(context).getBoolean(KEY_MONEY_ANY_APP, true)

  fun setMoneyFromAnyApp(context: Context, enabled: Boolean) {
    prefs(context).edit().putBoolean(KEY_MONEY_ANY_APP, enabled).apply()
  }

  fun markConnected(context: Context) {
    prefs(context).edit().putLong(KEY_CONNECTED_AT, System.currentTimeMillis()).apply()
  }

  fun markDisconnected(context: Context) {
    prefs(context).edit().putLong(KEY_DISCONNECTED_AT, System.currentTimeMillis()).apply()
  }

  fun lastConnectedAt(context: Context): Long = prefs(context).getLong(KEY_CONNECTED_AT, 0)

  fun lastDisconnectedAt(context: Context): Long =
    prefs(context).getLong(KEY_DISCONNECTED_AT, 0)

  fun lastCapturedAt(context: Context): Long = prefs(context).getLong(KEY_CAPTURED_AT, 0)

  fun append(context: Context, line: String) {
    synchronized(lock) {
      val file = File(context.filesDir, QUEUE_FILE)
      if (file.exists() && file.length() > MAX_QUEUE_BYTES) {
        return
      }
      file.appendText(line.replace("\n", " ") + "\n")
    }
    prefs(context).edit().putLong(KEY_CAPTURED_AT, System.currentTimeMillis()).apply()
  }

  /** Lê todas as notificações da fila e esvazia o arquivo. */
  fun drain(context: Context): List<String> {
    synchronized(lock) {
      val file = File(context.filesDir, QUEUE_FILE)
      if (!file.exists()) {
        return emptyList()
      }
      val lines = file.readLines().filter { it.isNotBlank() }
      file.delete()
      return lines
    }
  }
}
