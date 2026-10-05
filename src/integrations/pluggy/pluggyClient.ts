/**
 * Cliente mínimo da API da Pluggy para uso pessoal com o Meu Pluggy.
 * Referência: https://docs.pluggy.ai/en/docs/guides/meu-pluggy-personal-use
 *
 * Fluxo:
 * 1. POST /auth troca Client ID e Client Secret por uma API key, válida por 2 horas.
 * 2. GET /accounts?itemId= lista as contas de uma conexão. No Meu Pluggy, o
 *    itemId é copiado do Dashboard, porque GET /v2/items não está disponível.
 * 3. GET /transactions?accountId= lista as transações, em páginas de até 500.
 *
 * Itens do Meu Pluggy são atualizados a cada 24 horas e não aceitam
 * atualização manual.
 */

const BASE_URL = 'https://api.pluggy.ai';

export type PluggyAccount = {
  id: string;
  itemId: string;
  name: string;
  marketingName?: string | null;
  type: 'BANK' | 'CREDIT' | string;
  subtype: string;
  number: string;
  balance: number;
  currencyCode: string;
};

export type PluggyTransaction = {
  id: string;
  accountId: string;
  date: string;
  description: string;
  amount: number;
  currencyCode: string;
  type: 'DEBIT' | 'CREDIT';
  status: 'PENDING' | 'POSTED';
  category?: string | null;
  operationType?: string | null;
  creditCardMetadata?: {
    installmentNumber?: number;
    totalInstallments?: number;
  } | null;
};

type Page<T> = {
  total: number;
  totalPages: number;
  page: number;
  results: T[];
};

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
    throw new PluggyError(
      'Sem conexão com a internet ou a Pluggy não respondeu.',
    );
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail =
      (body && typeof body === 'object' && 'message' in body
        ? String(body.message)
        : null) ?? response.statusText;
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

export async function createApiKey(
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const body = await request<{ apiKey: string }>('/auth', {
    method: 'POST',
    body: JSON.stringify({ clientId, clientSecret }),
  });
  if (!body?.apiKey) {
    throw new PluggyError('A Pluggy não devolveu a API key.');
  }
  return body.apiKey;
}

export async function listAccounts(
  apiKey: string,
  itemId: string,
): Promise<PluggyAccount[]> {
  const page = await request<Page<PluggyAccount>>(
    `/accounts?itemId=${encodeURIComponent(itemId)}`,
    { apiKey },
  );
  return page.results ?? [];
}

/** Todas as transações do intervalo, juntando as páginas. Datas em AAAA-MM-DD. */
export async function listTransactions(
  apiKey: string,
  accountId: string,
  from: string,
  to: string,
): Promise<PluggyTransaction[]> {
  const all: PluggyTransaction[] = [];
  for (let page = 1; ; page += 1) {
    const params = new URLSearchParams({
      accountId,
      from,
      to,
      pageSize: '500',
      page: String(page),
    });
    const result = await request<Page<PluggyTransaction>>(
      `/transactions?${params.toString()}`,
      { apiKey },
    );
    all.push(...(result.results ?? []));
    if (!result.totalPages || page >= result.totalPages) {
      return all;
    }
  }
}
