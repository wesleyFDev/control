import { NativeModules, Platform } from 'react-native';

/**
 * Ponte para o módulo nativo BankNotifications, em
 * android/app/src/main/java/com/control/notifications. Só existe no Android:
 * o iOS não deixa um app ler as notificações de outro.
 */
export type NotificationStatus = {
  permissionGranted: boolean;
  /** Captura de qualquer app as notificações com valor em R$. */
  moneyFromAnyApp: boolean;
  /** Milissegundos desde 1970. Zero quando nunca aconteceu. */
  lastConnectedAt: number;
  lastDisconnectedAt: number;
  lastCapturedAt: number;
  /** Sempre capturados, com ou sem valor em R$. */
  allowedPackages: string[];
  /** Nunca capturados. */
  blockedPackages: string[];
};

type NativeBankNotifications = {
  getStatus(): Promise<NotificationStatus>;
  openPermissionSettings(): Promise<boolean>;
  openAppSettings(): Promise<boolean>;
  requestRebind(): Promise<boolean>;
  setAllowedPackages(packages: string[]): Promise<boolean>;
  setBlockedPackages(packages: string[]): Promise<boolean>;
  setMoneyFromAnyApp(enabled: boolean): Promise<boolean>;
  drainQueue(): Promise<string[]>;
};

const native: NativeBankNotifications | undefined =
  Platform.OS === 'android' ? NativeModules.BankNotifications : undefined;

export const notificationsSupported = Boolean(native);

export type RawBankNotification = {
  packageName: string;
  appLabel?: string;
  key: string;
  /** Milissegundos desde 1970, como o Android informa. */
  postedAt: number;
  title: string;
  text: string;
  /** Por que passou no filtro: app marcado ou valor em R$. */
  matchedBy?: 'allowed' | 'money';
};

function requireNative(): NativeBankNotifications {
  if (!native) {
    throw new Error('A leitura de notificações só funciona no Android.');
  }
  return native;
}

export const bankNotifications = {
  getStatus: () => requireNative().getStatus(),
  openPermissionSettings: () => requireNative().openPermissionSettings(),
  openAppSettings: () => requireNative().openAppSettings(),
  requestRebind: () =>
    native ? native.requestRebind() : Promise.resolve(false),
  setAllowedPackages: (packages: string[]) =>
    requireNative().setAllowedPackages(packages),
  setBlockedPackages: (packages: string[]) =>
    requireNative().setBlockedPackages(packages),
  setMoneyFromAnyApp: (enabled: boolean) =>
    requireNative().setMoneyFromAnyApp(enabled),
  /** Lê e esvazia a fila de notificações guardada pelo serviço nativo. */
  async drainQueue(): Promise<RawBankNotification[]> {
    if (!native) {
      return [];
    }
    const lines = await native.drainQueue();
    return lines.flatMap(line => {
      try {
        return [JSON.parse(line) as RawBankNotification];
      } catch {
        return [];
      }
    });
  },
};
