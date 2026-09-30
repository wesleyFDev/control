import type { DB } from '@op-engineering/op-sqlite';

type Params = Parameters<DB['execute']>[1];
type RawResult = unknown[][] | { rawRows?: unknown[][] };

/**
 * O driver op-sqlite do drizzle-orm 1.0.0-rc.4 foi escrito para a API antiga
 * do op-sqlite. Ele espera dois formatos que o op-sqlite 18 não entrega mais:
 *
 * 1. `executeAsync` com as linhas em `rows._array`. No op-sqlite 18, as linhas
 *    vêm em `rows`, como lista simples. Sem o ajuste, todo SELECT em modo
 *    objeto voltava vazio, e o migrator tentava recriar as tabelas.
 *
 * 2. `executeRawAsync` devolvendo a lista de linhas, cada uma uma lista de
 *    valores. No op-sqlite 18, ele devolve um objeto com `rawRows` e
 *    `columnNames`. Sem o ajuste, todo SELECT com colunas escolhidas quebrava
 *    com "undefined is not a function", porque o Drizzle tentava percorrer
 *    esse objeto como lista.
 *
 * Este adaptador entrega ao Drizzle os dois formatos que ele espera.
 */
export function withDrizzleCompat(client: DB): DB {
  const executeRawAsync = async (query: string, params?: Params) => {
    const result = (await client.executeRaw(query, params)) as RawResult;
    return Array.isArray(result) ? result : result.rawRows ?? [];
  };

  return {
    ...client,
    executeAsync: async (query: string, params?: Params) => {
      const result = await client.execute(query, params);
      const rows = result.rows ?? [];
      return { ...result, rows: Object.assign([...rows], { _array: rows }) };
    },
    executeRawAsync,
  } as DB;
}
