package com.control.notifications

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray

/** Ponte entre o JavaScript e a leitura de notificações. */
class BankNotificationsModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context) {

  override fun getName() = "BankNotifications"

  private fun permissionGranted(): Boolean =
    NotificationManagerCompat.getEnabledListenerPackages(context)
      .contains(context.packageName)

  /** Permissão, filtros e o histórico de conexão do serviço, para diagnóstico. */
  @ReactMethod
  fun getStatus(promise: Promise) {
    val status = Arguments.createMap()
    status.putBoolean("permissionGranted", permissionGranted())
    status.putBoolean("moneyFromAnyApp", BankNotificationStore.moneyFromAnyApp(context))
    status.putDouble("lastConnectedAt", BankNotificationStore.lastConnectedAt(context).toDouble())
    status.putDouble(
      "lastDisconnectedAt",
      BankNotificationStore.lastDisconnectedAt(context).toDouble(),
    )
    status.putDouble("lastCapturedAt", BankNotificationStore.lastCapturedAt(context).toDouble())
    val allowed = Arguments.createArray()
    BankNotificationStore.allowedPackages(context).sorted().forEach { allowed.pushString(it) }
    status.putArray("allowedPackages", allowed)
    val blocked = Arguments.createArray()
    BankNotificationStore.blockedPackages(context).sorted().forEach { blocked.pushString(it) }
    status.putArray("blockedPackages", blocked)
    promise.resolve(status)
  }

  @ReactMethod
  fun openPermissionSettings(promise: Promise) {
    openSettings(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS), promise)
  }

  /**
   * Abre os detalhes do app no sistema. Em celulares Xiaomi é ali que ficam
   * "Início automático" e a economia de bateria, que derrubam o serviço.
   */
  @ReactMethod
  fun openAppSettings(promise: Promise) {
    openSettings(
      Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
        .setData(Uri.parse("package:${context.packageName}")),
      promise,
    )
  }

  private fun openSettings(intent: Intent, promise: Promise) {
    try {
      context.startActivity(intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
      promise.resolve(true)
    } catch (error: Exception) {
      promise.reject("open_settings_failed", error)
    }
  }

  /** Pede ao sistema para reconectar o serviço, caso ele tenha sido derrubado. */
  @ReactMethod
  fun requestRebind(promise: Promise) {
    if (permissionGranted()) {
      BankNotificationListener.requestRebind(context)
    }
    promise.resolve(true)
  }

  @ReactMethod
  fun setAllowedPackages(packages: ReadableArray, promise: Promise) {
    BankNotificationStore.setAllowedPackages(context, packages.toStringSet())
    promise.resolve(true)
  }

  @ReactMethod
  fun setBlockedPackages(packages: ReadableArray, promise: Promise) {
    BankNotificationStore.setBlockedPackages(context, packages.toStringSet())
    promise.resolve(true)
  }

  @ReactMethod
  fun setMoneyFromAnyApp(enabled: Boolean, promise: Promise) {
    BankNotificationStore.setMoneyFromAnyApp(context, enabled)
    promise.resolve(true)
  }

  /** Devolve as notificações capturadas desde a última leitura e esvazia a fila. */
  @ReactMethod
  fun drainQueue(promise: Promise) {
    val array = Arguments.createArray()
    BankNotificationStore.drain(context).forEach { array.pushString(it) }
    promise.resolve(array)
  }

  private fun ReadableArray.toStringSet(): Set<String> =
    (0 until size()).mapNotNull { getString(it) }.toSet()
}
