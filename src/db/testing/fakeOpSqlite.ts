/**
 * Imitação do op-sqlite 18 sobre o node:sqlite, só para testes no Jest.
 * Reproduz os formatos de resposta da versão 18, que o adaptador
 * de compatibilidade com o Drizzle precisa converter:
 * - `execute` e `executeAsync` devolvem as linhas em `rows`, lista simples.
 * - `executeRaw` e `executeRawAsync` devolvem `{ rawRows, columnNames }`.
 */
const { DatabaseSync } = require('node:sqlite');

const returnsRows = (query: string) =>
  /^\s*(select|pragma|with)\b/i.test(query) || /\breturning\b/i.test(query);

/**
 * O node:sqlite desta versão do Node não devolve linhas como listas, e
 * colunas com o mesmo nome (como "name" de duas tabelas) se sobrescrevem.
 * Cada coluna do SELECT ganha um apelido único, preservando a ordem.
 */
function withUniqueAliases(query: string) {
  const match = query.match(/^\s*select\s+([\s\S]*?)\s+from\s/i);
  if (!match) {
    return query;
  }
  const columns = match[1].split(/,\s*/);
  const aliased = columns.map((c: string, i: number) => `${c} as "__c${i}"`);
  return query.replace(match[1], aliased.join(', '));
}

export function open() {
  const database = new DatabaseSync(':memory:');

  const run = (query: string, params: unknown[] = []) => {
    const statement = database.prepare(query);
    if (returnsRows(query)) {
      return { rows: statement.all(...params), rowsAffected: 0 };
    }
    const info = statement.run(...params);
    return { rows: [], rowsAffected: Number(info.changes) };
  };

  const runRaw = async (query: string, params: unknown[] = []) => {
    const rows = database
      .prepare(withUniqueAliases(query))
      .all(...params) as object[];
    return {
      rowsAffected: 0,
      rawRows: rows.map(row => Object.values(row)),
      columnNames: rows[0] ? Object.keys(rows[0]) : [],
    };
  };

  return {
    executeSync: (query: string, params?: unknown[]) => run(query, params),
    execute: async (query: string, params?: unknown[]) => run(query, params),
    executeAsync: async (query: string, params?: unknown[]) =>
      run(query, params),
    executeRaw: runRaw,
    executeRawAsync: runRaw,
  };
}
