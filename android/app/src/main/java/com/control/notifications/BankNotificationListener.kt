package com.control.notifications

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Parcelable
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
    // Notificações fixas (música, download, VPN) não são compras.
    if (sbn.isOngoing) {
      return
    }
    // O resumo de um grupo repete as notificações individuais. Só é
    // ignorado quando as individuais existem; alguns apps postam só o resumo.
    if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0 &&
      hasGroupChildren(sbn)
    ) {
      return
    }

    val extras = notification.extras ?: return
    val title = extras.text(Notification.EXTRA_TITLE_BIG)
      .ifBlank { extras.text(Notification.EXTRA_TITLE) }
    val body = bodyOf(extras)
    if (title.isBlank() && body.isBlank()) {
      return
    }

    val captureAll = BankNotificationStore.captureAll(this)
    val allowed = packageName in BankNotificationStore.allowedPackages(this)
    val hasMoney = MONEY.containsMatchIn("$title $body")
    val matchedBy = when {
      allowed -> "allowed"
      hasMoney && BankNotificationStore.moneyFromAnyApp(this) -> "money"
      captureAll -> "all"
      else -> return
    }

    val entry = JSONObject()
      .put("packageName", packageName)
      .put("appLabel", appLabel(packageName))
      .put("key", sbn.key)
      .put("postedAt", sbn.postTime)
      .put("title", title)
      .put("text", body)
      .put("matchedBy", matchedBy)
    BankNotificationStore.append(this, entry.toString())
  }

  /**
   * Junta todo o texto que a notificação mostra. Cada app usa um estilo:
   * texto simples, texto expandido, lista de linhas (InboxStyle) ou
   * mensagens (MessagingStyle). O valor da compra pode estar em qualquer um.
   */
  private fun bodyOf(extras: Bundle): String {
    val parts = mutableListOf<String>()
    val text = extras.text(Notification.EXTRA_TEXT)
    val bigText = extras.text(Notification.EXTRA_BIG_TEXT)
    parts += if (bigText.length > text.length) bigText else text
    extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
      ?.mapTo(parts) { it.toString() }
    extras.getParcelableArrayCompat(Notification.EXTRA_MESSAGES)?.forEach { message ->
      (message as? Bundle)?.getCharSequence("text")?.let { parts += it.toString() }
    }
    parts += extras.text(Notification.EXTRA_SUB_TEXT)
    parts += extras.text(Notification.EXTRA_SUMMARY_TEXT)
    return parts
      .map { it.trim() }
      .filter { it.isNotEmpty() }
      .distinct()
      .joinToString(" · ")
  }

  private fun hasGroupChildren(sbn: StatusBarNotification): Boolean =
    try {
      activeNotifications.orEmpty().any {
        it.packageName == sbn.packageName &&
          it.groupKey == sbn.groupKey &&
          it.key != sbn.key &&
          it.notification.flags and Notification.FLAG_GROUP_SUMMARY == 0
      }
    } catch (_: Exception) {
      // Sem acesso à lista, trata como resumo comum e ignora.
      true
    }

  private fun appLabel(packageName: String): String =
    try {
      val info = packageManager.getApplicationInfo(packageName, 0)
      packageManager.getApplicationLabel(info).toString()
    } catch (_: PackageManager.NameNotFoundException) {
      packageName
    }

  companion object {
    /**
     * "R$ 45,90", "R$45", "R$ 1.234,56". Os apps formatam valores com espaço
     * não separável (U+00A0 ou U+202F) entre "R$" e o número, que o `\s` do
     * Java não reconhece.
     */
    private val MONEY = Regex("""R\$[\s  ]*\d""")

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

private fun Bundle.text(key: String): String = getCharSequence(key)?.toString().orEmpty()

@Suppress("DEPRECATION")
private fun Bundle.getParcelableArrayCompat(key: String): Array<Parcelable>? =
  getParcelableArray(key)
