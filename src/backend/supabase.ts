import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import * as Keychain from 'react-native-keychain';

import { backendConfig, backendConfigured } from '../config/backend';

/**
 * A sessão do Supabase (tokens de acesso) fica no Keychain do iOS e no
 * Keystore do Android, como as outras credenciais do app.
 */
const keychainStorage = {
  async getItem(key: string): Promise<string | null> {
    const saved = await Keychain.getGenericPassword({
      service: `supabase.${key}`,
    });
    return saved ? saved.password : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    await Keychain.setGenericPassword('supabase', value, {
      service: `supabase.${key}`,
    });
  },
  async removeItem(key: string): Promise<void> {
    await Keychain.resetGenericPassword({ service: `supabase.${key}` });
  },
};

/** Cliente do Supabase, ou null enquanto src/config/backend.ts estiver vazio. */
export const supabase: SupabaseClient | null = backendConfigured
  ? createClient(backendConfig.supabaseUrl, backendConfig.supabaseAnonKey, {
      auth: {
        storage: keychainStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Renova o token só com o app aberto, como o Supabase recomenda no React Native.
if (supabase) {
  AppState.addEventListener('change', state => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'O backend ainda não foi configurado. Preencha src/config/backend.ts.',
    );
  }
  return supabase;
}

/**
 * Chama uma Edge Function e devolve o JSON. Os erros das funções vêm como
 * `{ error }` e viram a mensagem da exceção.
 */
export async function invokeFunction<T>(
  name: string,
  options: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {},
): Promise<T> {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke(name, {
    method: options.method ?? 'POST',
    body: options.body as Record<string, unknown> | undefined,
  });
  if (error) {
    const context = (error as { context?: Response }).context;
    const detail = await context
      ?.json()
      .then((b: { error?: string }) => b?.error)
      .catch(() => null);
    throw new Error(detail ?? error.message ?? 'Falha ao falar com o backend.');
  }
  return data as T;
}
