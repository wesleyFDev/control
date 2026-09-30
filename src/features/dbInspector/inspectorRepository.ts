import { sqlite } from '../../db/client';

export type TableSummary = {
  name: string;
  rowCount: number;
};

export type ColumnInfo = {
  name: string;
  type: string;
  notNull: boolean;
  primaryKey: boolean;
};

export type CellValue = string | number | boolean | null | ArrayBuffer;

/** Nome de tabela entre aspas, com aspas internas escapadas. */
function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function query(sql: string, params: (string | number)[] = []) {
  const result = await sqlite.execute(sql, params);
  return (result.rows ?? []) as Record<string, CellValue>[];
}

/** Tabelas do banco, com a quantidade de linhas. Ignora as internas do SQLite. */
export async function listTables(): Promise<TableSummary[]> {
  const rows = await query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  );
  const tables: TableSummary[] = [];
  for (const row of rows) {
    const name = String(row.name);
    const [count] = await query(
      `SELECT COUNT(*) AS count FROM ${quoteIdentifier(name)}`,
    );
    tables.push({ name, rowCount: Number(count?.count ?? 0) });
  }
  return tables;
}

/**
 * Garante que o nome veio da lista de tabelas do banco antes de montar a
 * consulta. Como o nome entra no SQL, isso impede consultar algo arbitrário.
 */
async function assertTableExists(table: string): Promise<void> {
  const rows = await query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [table],
  );
  if (rows.length === 0) {
    throw new Error(`A tabela "${table}" não existe.`);
  }
}

export async function getColumns(table: string): Promise<ColumnInfo[]> {
  await assertTableExists(table);
  const rows = await query(`PRAGMA table_info(${quoteIdentifier(table)})`);
  return rows.map(row => ({
    name: String(row.name),
    type: String(row.type ?? ''),
    notNull: Number(row.notnull) === 1,
    primaryKey: Number(row.pk) > 0,
  }));
}

/** Uma página de linhas, cada uma com os valores na ordem das colunas. */
export async function getRows(
  table: string,
  columns: ColumnInfo[],
  limit: number,
  offset: number,
): Promise<CellValue[][]> {
  await assertTableExists(table);
  const rows = await query(
    `SELECT * FROM ${quoteIdentifier(table)} LIMIT ? OFFSET ?`,
    [limit, offset],
  );
  return rows.map(row => columns.map(column => row[column.name] ?? null));
}

/** Texto de uma célula para exibição. */
export function formatCell(value: CellValue): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (value instanceof ArrayBuffer) {
    return `[blob ${value.byteLength} bytes]`;
  }
  return String(value);
}
