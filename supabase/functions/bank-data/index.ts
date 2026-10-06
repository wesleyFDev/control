/**
 * Busca na Pluggy os dados dos bancos do usuário.
 *
 * POST { "items": [{ "id": "<itemId>", "from": "AAAA-MM-DD" | null }] }
 *
 * Devolve todas as conexões cadastradas em pluggy_items. Para cada uma, as
 * transações começam em `from` (quando o app informou) ou 365 dias atrás,
 * o máximo da Pluggy.
 *
 * Resposta:
 * { "items": [{ "id", "connectorName", "lastUpdatedAt",
 *               "accounts": [...], "transactions": [...], "error" }] }
 * Contas e transações vão como a Pluggy manda. Um item com erro não impede
 * os outros.
 */
import { adminClient, requireUser } from '../_shared/auth.ts';
import { errorResponse, HttpError, json } from '../_shared/http.ts';
import {
  createApiKey,
  getItem,
  listAccounts,
  listTransactions,
  loadCredentials,
  PluggyError,
} from '../_shared/pluggy.ts';

const FIRST_SYNC_DAYS = 365;
const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

Deno.serve(async req => {
  try {
    if (req.method !== 'POST') {
      throw new HttpError(405, 'Use POST.');
    }
    const admin = adminClient();
    const userId = await requireUser(req, admin);

    const body = await req.json().catch(() => ({}));
    const requested = new Map<string, string | null>();
    for (const entry of Array.isArray(body?.items) ? body.items : []) {
      if (typeof entry?.id === 'string') {
        const from =
          typeof entry.from === 'string' && DAY_PATTERN.test(entry.from)
            ? entry.from
            : null;
        requested.set(entry.id, from);
      }
    }

    const { data: rows, error } = await admin
      .from('pluggy_items')
      .select('item_id')
      .eq('user_id', userId)
      .order('created_at');
    if (error) {
      throw error;
    }
    if (!rows || rows.length === 0) {
      return json({ items: [] });
    }

    const credentials = await loadCredentials(admin, userId);
    let apiKey: string;
    try {
      apiKey = await createApiKey(credentials);
    } catch (err) {
      if (err instanceof PluggyError) {
        throw new HttpError(400, err.message);
      }
      throw err;
    }

    const today = new Date();
    const firstSync = isoDay(
      new Date(today.getTime() - FIRST_SYNC_DAYS * 86_400_000),
    );

    const items = [];
    for (const { item_id: itemId } of rows) {
      try {
        // O Meu Pluggy pode não liberar este endpoint: sem ele, o app usa
        // um nome genérico para o banco.
        const item = await getItem(apiKey, itemId).catch(() => null);
        const accounts = await listAccounts(apiKey, itemId);
        const from = requested.get(itemId) ?? firstSync;
        const transactions = [];
        for (const account of accounts) {
          transactions.push(
            ...(await listTransactions(apiKey, account.id, from, isoDay(today))),
          );
        }
        items.push({
          id: itemId,
          connectorName: item?.connector?.name ?? null,
          lastUpdatedAt: item?.lastUpdatedAt ?? null,
          accounts,
          transactions,
          error: null,
        });
      } catch (err) {
        items.push({
          id: itemId,
          connectorName: null,
          lastUpdatedAt: null,
          accounts: [],
          transactions: [],
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return json({ items });
  } catch (error) {
    return errorResponse(error);
  }
});
