import { invokeFunction } from '../../backend/supabase';
import type { PluggyAccount, PluggyTransaction } from '../pluggy/pluggyTypes';

/**
 * Contrato com a Edge Function `bank-data` (supabase/functions/bank-data).
 *
 * O app envia, para cada banco já baixado, a partir de que dia buscar:
 *   { "items": [{ "id": "<itemId>", "from": "AAAA-MM-DD" | null }] }
 * O backend devolve todas as conexões do usuário, com contas e transações
 * como a Pluggy manda. Um banco novo vem desde o início que a Pluggy permite.
 */
export type BankDataRequest = {
  items: { id: string; from: string | null }[];
};

export type BankDataItem = {
  id: string;
  /** Nome do banco (`connector.name` na Pluggy). */
  connectorName: string | null;
  /** Quando o banco atualizou os dados na Pluggy, ISO 8601 UTC. */
  lastUpdatedAt: string | null;
  accounts: PluggyAccount[];
  transactions: PluggyTransaction[];
  /** Erro deste item, sem impedir os outros. */
  error?: string | null;
};

export type BankDataResponse = {
  items: BankDataItem[];
};

export async function fetchBankData(
  request: BankDataRequest,
): Promise<BankDataResponse> {
  const body = await invokeFunction<BankDataResponse>('bank-data', {
    body: request,
  });
  if (!body || !Array.isArray(body.items)) {
    throw new Error('Resposta do backend em formato inesperado.');
  }
  return body;
}
