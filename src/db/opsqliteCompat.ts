import type { DB } from '@op-engineering/op-sqlite';

type Params = Parameters<DB['execute']>[1];

/**
 * O driver op-sqlite do drizzle-orm 1.0.0-rc.4 foi escrito para a API antiga
 * do op-sqlite: ele chama `executeAsync` e lê as linhas em `rows._array`.
 *
 * No op-sqlite 18, `executeAsync` ainda existe só por compatibilidade, mas
 * devolve o resultado cru, sem `rows`. Com isso todo SELECT feito pelo
 * Drizzle voltava vazio. Um efeito visível: o migrator não enxergava as
 * migrations já aplicadas e tentava criar as tabelas de novo a cada abertura.
 *
 * Este adaptador entrega ao Drizzle o formato que ele espera, usando o
 * `execute` atual do op-sqlite, que já monta `rows`.
 */
export function withDrizzleCompat(client: DB): DB {
  return {
    ...client,
    executeAsync: async (query: string, params?: Params) => {
      const result = await client.execute(query, params);
      const rows = result.rows ?? [];
      return { ...result, rows: Object.assign([...rows], { _array: rows }) };
    },
  } as DB;
}
