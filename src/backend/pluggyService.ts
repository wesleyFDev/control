import { invokeFunction, requireSupabase } from './supabase';

/**
 * Configuração da Pluggy na nuvem. As credenciais vão para a Edge Function
 * `pluggy-credentials`, que testa, cifra e guarda; o app nunca as lê de volta.
 * As conexões (itemIds) ficam na tabela `pluggy_items`, uma por banco.
 */

export type CredentialsStatus = {
  configured: boolean;
  updatedAt: string | null;
};

export function getCredentialsStatus(): Promise<CredentialsStatus> {
  return invokeFunction<CredentialsStatus>('pluggy-credentials', {
    method: 'GET',
  });
}

export async function saveCredentials(
  clientId: string,
  clientSecret: string,
): Promise<void> {
  await invokeFunction('pluggy-credentials', {
    method: 'POST',
    body: { clientId: clientId.trim(), clientSecret: clientSecret.trim() },
  });
}

export async function deleteCredentials(): Promise<void> {
  await invokeFunction('pluggy-credentials', { method: 'DELETE' });
}

export type CloudPluggyItem = { itemId: string; createdAt: string };

export async function listCloudItems(): Promise<CloudPluggyItem[]> {
  const { data, error } = await requireSupabase()
    .from('pluggy_items')
    .select('item_id, created_at')
    .order('created_at');
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []).map(row => ({
    itemId: row.item_id,
    createdAt: row.created_at,
  }));
}

const ITEM_ID = /^[0-9a-fA-F-]{36}$/;

export async function addCloudItem(itemId: string): Promise<void> {
  const id = itemId.trim();
  if (!ITEM_ID.test(id)) {
    throw new Error('itemId inválido. Copie o id completo do Dashboard.');
  }
  const { error } = await requireSupabase()
    .from('pluggy_items')
    .insert({ item_id: id });
  if (error) {
    throw new Error(
      error.code === '23505' ? 'Este item já foi adicionado.' : error.message,
    );
  }
}

export async function removeCloudItem(itemId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('pluggy_items')
    .delete()
    .eq('item_id', itemId);
  if (error) {
    throw new Error(error.message);
  }
}
