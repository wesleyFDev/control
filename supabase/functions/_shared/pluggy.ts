/**
 * Cliente mínimo da API da Pluggy para o Meu Pluggy (uso pessoal).
 * Referência: https://docs.pluggy.ai/en/docs/guides/meu-pluggy-personal-use
 *
 * 1. POST /auth troca Client ID e Client Secret por uma API key (2 horas).
 * 2. GET /items/{id} traz o nome do banco e quando ele atualizou os dados.
 * 3. GET /accounts?itemId= lista as contas e os cartões.
 * 4. GET /v2/transactions?accountId= lista as transações, paginadas por cursor.
 */
import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

import { decrypt } from './crypto.ts';
import { HttpError } from './http.ts';

const BASE_URL = 'https://api.pluggy.ai';

export type PluggyCredentials = { clientId: string; clientSecret: string };

type Page<T> = { results?: T[] };

/** Resposta dos endpoints v2, paginados por cursor. */
type CursorPage<T> = { results?: T[]; next?: string | null };

export class PluggyError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

async function request<T>(
  path: string,
  init: RequestInit & { apiKey?: string } = {},
): Promise<T> {
  const { apiKey, headers, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey ? { 'X-API-KEY': apiKey } : {}),
        ...(headers ?? {}),
      },
    });
  } catch {
    throw new PluggyError('A Pluggy não respondeu.');
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      body && typeof body === 'object' && 'message' in body
        ? String(body.message)
        : response.statusText;
    if (response.status === 401 || response.status === 403) {
      throw new PluggyError(
        `A Pluggy recusou o acesso (${response.status}). Confira o Client ID, o Client Secret e se o item está vinculado à aplicação. ${detail}`,
        response.status,
      );
    }
    if (response.status === 404) {
      throw new PluggyError(
        `Não encontrado na Pluggy (404). Confira o itemId. ${detail}`,
        404,
      );
    }
    throw new PluggyError(
      `Erro ${response.status} da Pluggy: ${detail}`,
      response.status,
    );
  }
  return body as T;
}

export async function createApiKey({
  clientId,
  clientSecret,
}: PluggyCredentials): Promise<string> {
  const body = await request<{ apiKey?: string }>('/auth', {
    method: 'POST',
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!body?.apiKey) {
    throw new PluggyError('A Pluggy não devolveu a API key.');
  }
  return body.apiKey;
}

export type PluggyItem = {
  id: string;
  connector?: { name?: string | null } | null;
  lastUpdatedAt?: string | null;
};

export function getItem(apiKey: string, itemId: string): Promise<PluggyItem> {
  return request<PluggyItem>(`/items/${encodeURIComponent(itemId)}`, {
    apiKey,
  });
}

export async function listAccounts(
  apiKey: string,
  itemId: string,
): Promise<{ id: string }[]> {
  const page = await request<Page<{ id: string }>>(
    `/accounts?itemId=${encodeURIComponent(itemId)}`,
    { apiKey },
  );
  return page.results ?? [];
}

/**
 * Todas as transações do intervalo (AAAA-MM-DD), juntando as páginas.
 * GET /v2/transactions pagina por cursor: cada resposta traz `next`, a
 * query string pronta da página seguinte, ou null na última. O GET
 * /transactions antigo, por número de página, foi descontinuado (410).
 */
export async function listTransactions(
  apiKey: string,
  accountId: string,
  from: string,
  to: string,
): Promise<unknown[]> {
  const all: unknown[] = [];
  const first = new URLSearchParams({ accountId, dateFrom: from, dateTo: to });
  let query: string | null = `?${first.toString()}`;
  while (query) {
    const page: CursorPage<unknown> = await request<CursorPage<unknown>>(
      `/v2/transactions${query}`,
      { apiKey },
    );
    all.push(...(page.results ?? []));
    // O cursor é opaco: usa a query devolvida exatamente como veio.
    const next = page.next ?? null;
    query = next && !next.startsWith('?') ? `?${next}` : next;
  }
  return all;
}

/** Credenciais do usuário, decifradas. */
export async function loadCredentials(
  admin: SupabaseClient,
  userId: string,
): Promise<PluggyCredentials> {
  const { data, error } = await admin
    .from('pluggy_credentials')
    .select('ciphertext, iv')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new HttpError(
      400,
      'Cadastre o Client ID e o Client Secret da Pluggy primeiro.',
    );
  }
  return JSON.parse(await decrypt(data.ciphertext, data.iv));
}
