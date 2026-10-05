package com.control.notifications

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject

/**
 * Recebe as notificações do sistema depois que o usuário libera o acesso em
 * Configurações > Notificações > Acesso a notificações.
 *
 * O que passa pelos filtros de [BankNotificationStore] vai para uma fila em
 * arquivo, que o app lê e esvazia quando abre. Assim nada se perde com o app
 * fechado.
 */
class BankNotificationListener : NotificationListenerService() {

  override fun onListenerConnected() {
    super.onListenerConnected()
    BankNotificationStore.markConnected(this)
  }

  /**
   * Alguns fabricantes, como a Xiaomi, desconectam o serviço para economizar
   * bateria. Pedir para reconectar mantém a captura funcionando.
   */
  override fun onListenerDisconnected() {
    super.onListenerDisconnected()
    BankNotificationStore.markDisconnected(this)
    requestRebind(this)
  }

  override fun onNotificationPosted(sbn: StatusBarNotification) {
    val packageName = sbn.packageName ?: return
    if (packageName == this.packageName) {
      return
    }
    if (packageName in BankNotificationStore.blockedPackages(this)) {
      return
    }
    val notification = sbn.notification ?: return
    // Resumos de grupo repetem o conteúdo das notificações individuais, e
    // notificações fixas (música, download) não são compras.
    if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) {
      return
    }
    if (sbn.isOngoing) {
      return
    }
    val extras = notification.extras ?: return
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString().orEmpty()
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString().orEmpty()
    val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString().orEmpty()
    val body = if (bigText.length > text.length) bigText else text
    if (title.isBlank() && body.isBlank()) {
      return
    }

    val allowed = packageName in BankNotificationStore.allowedPackages(this)
    val hasMoney = MONEY.containsMatchIn("$title $body")
    if (!allowed && !(hasMoney && BankNotificationStore.moneyFromAnyApp(this))) {
      return
    }

    val entry = JSONObject()
      .put("packageName", packageName)
      .put("appLabel", appLabel(packageName))
      .put("key", sbn.key)
      .put("postedAt", sbn.postTime)
      .put("title", title)
      .put("text", body)
      .put("matchedBy", if (allowed) "allowed" else "money")
    BankNotificationStore.append(this, entry.toString())
  }

  private fun appLabel(packageName: String): String =
    try {
      val info = packageManager.getApplicationInfo(packageName, 0)
      packageManager.getApplicationLabel(info).toString()
    } catch (_: PackageManager.NameNotFoundException) {
      packageName
    }

  companion object {
    /** "R$ 45,90", "R$45", "R$ 1.234,56". */
    private val MONEY = Regex("""R\$\s?\d""")

    fun requestRebind(context: Context) {
      try {
        NotificationListenerService.requestRebind(
          ComponentName(context, BankNotificationListener::class.java),
        )
      } catch (_: Exception) {
        // Sem permissão concedida o sistema recusa; não há o que fazer aqui.
      }
    }
  }
}
