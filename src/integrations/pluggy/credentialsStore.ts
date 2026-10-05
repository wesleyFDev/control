import * as Keychain from 'react-native-keychain';

/**
 * Client ID e Client Secret da Pluggy, guardados no Keychain do iOS e no
 * Keystore do Android. Nunca vão para o SQLite nem para o código.
 */
const SERVICE = 'pluggy-credentials';

export type PluggyCredentials = {
  clientId: string;
  clientSecret: string;
};

export async function loadCredentials(): Promise<PluggyCredentials | null> {
  const saved = await Keychain.getGenericPassword({ service: SERVICE });
  if (!saved) {
    return null;
  }
  return { clientId: saved.username, clientSecret: saved.password };
}

export async function saveCredentials({
  clientId,
  clientSecret,
}: PluggyCredentials): Promise<void> {
  const result = await Keychain.setGenericPassword(clientId, clientSecret, {
    service: SERVICE,
  });
  if (!result) {
    throw new Error('Não foi possível guardar as credenciais no aparelho.');
  }
}

export async function clearCredentials(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE });
}
