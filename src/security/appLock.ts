import { NativeModules } from 'react-native';
import * as Keychain from 'react-native-keychain';

/**
 * Bloqueio do app com a digital ou a senha do celular.
 *
 * O Android só libera um item do Keystore protegido por autenticação depois
 * que o usuário passa pela tela padrão de digital/PIN. O app guarda um item
 * assim e, para desbloquear, pede para lê-lo: se a leitura deu certo, quem
 * está com o celular é o dono. Os tokens do Supabase não ficam protegidos
 * por isso, para a renovação automática não pedir a digital.
 */

const LOCK_SERVICE = 'app-lock.key';
const CONFIG_SERVICE = 'app-lock.config';

const PROMPT = {
  title: 'Desbloquear o app',
  subtitle: 'Use a digital ou a senha do celular',
  cancel: 'Cancelar',
};

const protectedOptions = {
  service: LOCK_SERVICE,
  accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
  storage: Keychain.STORAGE_TYPE.AES_GCM,
  authenticationPrompt: PROMPT,
};

type NativeAppSecurity = {
  setSecureScreen(enabled: boolean): Promise<boolean>;
};

/** Esconde o app na tela de recentes e bloqueia prints. Só existe no Android. */
export async function setSecureScreen(enabled: boolean): Promise<void> {
  const native: NativeAppSecurity | undefined = NativeModules.AppSecurity;
  await native?.setSecureScreen(enabled);
}

/** O celular tem digital, PIN, padrão ou senha configurados. */
export async function isLockAvailable(): Promise<boolean> {
  try {
    return await Keychain.isPasscodeAuthAvailable();
  } catch {
    return false;
  }
}

export async function isLockEnabled(): Promise<boolean> {
  return Boolean(
    await Keychain.getGenericPassword({ service: CONFIG_SERVICE }),
  );
}

/** Mostra a tela de digital/senha. Devolve false se o usuário cancelar. */
export async function authenticate(): Promise<boolean> {
  try {
    return Boolean(await Keychain.getGenericPassword(protectedOptions));
  } catch {
    return false;
  }
}

/** Liga o bloqueio. Pede a digital/senha para confirmar que funciona. */
export async function enableLock(): Promise<void> {
  if (!(await isLockAvailable())) {
    throw new Error(
      'Configure uma digital, PIN ou senha no bloqueio de tela do celular primeiro.',
    );
  }
  const token = `${Date.now()}-${Math.random()}`;
  try {
    await Keychain.setGenericPassword('app-lock', token, protectedOptions);
  } catch {
    throw new Error('Não foi possível ativar o bloqueio. Tente de novo.');
  }
  if (!(await authenticate())) {
    await Keychain.resetGenericPassword({ service: LOCK_SERVICE });
    throw new Error('Bloqueio não ativado: a confirmação foi cancelada.');
  }
  await Keychain.setGenericPassword('app-lock', 'on', {
    service: CONFIG_SERVICE,
  });
  await setSecureScreen(true);
}

/** Desliga o bloqueio. Só quem passar pela digital/senha consegue. */
export async function disableLock(): Promise<void> {
  if (!(await authenticate())) {
    throw new Error('Bloqueio mantido: a confirmação foi cancelada.');
  }
  await Keychain.resetGenericPassword({ service: CONFIG_SERVICE });
  await Keychain.resetGenericPassword({ service: LOCK_SERVICE });
  await setSecureScreen(false);
}
