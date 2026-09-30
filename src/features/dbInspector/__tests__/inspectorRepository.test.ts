jest.mock('@op-engineering/op-sqlite', () =>
  require('../../../db/testing/fakeOpSqlite'),
);

const { migrate } = jest.requireActual('drizzle-orm/op-sqlite/migrator');

import { db, sqlite } from '../../../db/client';
import migrations from '../../../db/migrations/migrations';
import { ensureSeedData } from '../../../db/seed';
import {
  formatCell,
  getColumns,
  getRows,
  listTables,
} from '../inspectorRepository';

describe('inspetor do banco', () => {
  beforeAll(async () => {
    await migrate(db, migrations);
    await ensureSeedData();
  });

  it('lista as tabelas do banco com a contagem de linhas', async () => {
    const tables = await listTables();
    const names = tables.map(t => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        '__drizzle_migrations',
        'categories',
        'category_keywords',
        'expenses',
        'members',
      ]),
    );
    expect(tables.find(t => t.name === 'categories')?.rowCount).toBe(7);
    expect(tables.find(t => t.name === 'expenses')?.rowCount).toBe(0);
  });

  it('lê as colunas direto do banco, sem depender do schema do app', async () => {
    sqlite.executeSync(
      'CREATE TABLE teste_nova (codigo INTEGER PRIMARY KEY, nota TEXT NOT NULL)',
    );
    sqlite.executeSync("INSERT INTO teste_nova VALUES (1, 'primeira')");

    expect((await listTables()).map(t => t.name)).toContain('teste_nova');
    const columns = await getColumns('teste_nova');
    expect(columns).toEqual([
      { name: 'codigo', type: 'INTEGER', notNull: false, primaryKey: true },
      { name: 'nota', type: 'TEXT', notNull: true, primaryKey: false },
    ]);
    expect(await getRows('teste_nova', columns, 50, 0)).toEqual([
      [1, 'primeira'],
    ]);
  });

  it('pagina as linhas na ordem das colunas', async () => {
    const columns = await getColumns('categories');
    const first = await getRows('categories', columns, 3, 0);
    const second = await getRows('categories', columns, 3, 3);
    expect(first).toHaveLength(3);
    expect(second).toHaveLength(3);
    expect(first[0][columns.findIndex(c => c.name === 'id')]).toBe('mercado');
  });

  it('recusa um nome de tabela que não existe', async () => {
    await expect(getColumns('x"; DROP TABLE expenses; --')).rejects.toThrow(
      'não existe',
    );
    expect((await listTables()).map(t => t.name)).toContain('expenses');
  });

  it('formata valores especiais', () => {
    expect(formatCell(null)).toBe('NULL');
    expect(formatCell(new ArrayBuffer(4))).toBe('[blob 4 bytes]');
    expect(formatCell(42)).toBe('42');
  });
});
