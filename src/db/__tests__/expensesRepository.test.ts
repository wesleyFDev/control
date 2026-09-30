/**
 * Testa os repositórios de verdade contra um SQLite em memória, com o
 * op-sqlite imitado em src/db/testing/fakeOpSqlite.ts. Assim o teste também
 * cobre o adaptador de compatibilidade com o Drizzle.
 */

jest.mock('@op-engineering/op-sqlite', () =>
  require('../testing/fakeOpSqlite'),
);

const { migrate } = jest.requireActual('drizzle-orm/op-sqlite/migrator');

import { db, sqlite } from '../client';
import { ensureSeedData } from '../seed';
import {
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from '../repositories/expensesRepository';
import { listCategories, listMembers } from '../repositories/lookupsRepository';
import migrations from '../migrations/migrations';

const NOW = '2026-09-30T12:00:00.000Z';

function seed() {
  const exec = (query: string, params: unknown[] = []) =>
    sqlite.executeSync(query, params as never);
  exec(
    "INSERT INTO members VALUES ('m-self', 'Wesley', 1, ?, ?, NULL), ('m-ana', 'Ana', 0, ?, ?, NULL)",
    [NOW, NOW, NOW, NOW],
  );
  exec(
    "INSERT INTO categories (id, name, icon, sort_order, created_at, updated_at) VALUES ('mercado', 'Mercado', 'shopping-cart', 1, ?, ?), ('transporte', 'Transporte', 'navigation', 2, ?, ?)",
    [NOW, NOW, NOW, NOW],
  );
  const insert =
    'INSERT INTO expenses (id, amount_cents, category_id, date, scope, member_id, description, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
  exec(insert, [
    'e1',
    8750,
    'mercado',
    '2026-09-30',
    'family',
    null,
    'Compra da casa',
    'chat',
    NOW,
    NOW,
  ]);
  exec(insert, [
    'e2',
    2300,
    'transporte',
    '2026-09-29',
    'personal',
    'm-self',
    null,
    'chat',
    NOW,
    NOW,
  ]);
}

describe('repositórios de gastos', () => {
  beforeAll(async () => {
    await migrate(db, migrations);
    seed();
  });

  it('o migrator enxerga a migration já aplicada e não roda de novo', async () => {
    await expect(migrate(db, migrations)).resolves.not.toThrow();
  });

  it('lista os gastos com categoria e membro, do mais recente ao mais antigo', async () => {
    const items = await listExpenses();
    expect(items.map(i => i.id)).toEqual(['e1', 'e2']);
    expect(items[0]).toMatchObject({
      categoryName: 'Mercado',
      scope: 'family',
      memberName: null,
    });
    expect(items[1]).toMatchObject({
      categoryName: 'Transporte',
      scope: 'personal',
      memberName: 'Wesley',
    });
  });

  it('lista categorias em ordem e membros com você primeiro', async () => {
    expect((await listCategories()).map(c => c.id)).toEqual([
      'mercado',
      'transporte',
    ]);
    expect((await listMembers()).map(m => m.id)).toEqual(['m-self', 'm-ana']);
  });

  it('edita um gasto e troca o dono para outro membro', async () => {
    await updateExpense('e1', {
      amountCents: 9000,
      categoryId: 'transporte',
      date: '2026-09-28',
      scope: 'personal',
      memberId: 'm-ana',
      description: 'Uber',
    });
    const edited = (await listExpenses()).find(i => i.id === 'e1');
    expect(edited).toMatchObject({
      amountCents: 9000,
      categoryName: 'Transporte',
      memberName: 'Ana',
      description: 'Uber',
    });
  });

  it('ao virar gasto de família, o membro é removido', async () => {
    await updateExpense('e1', {
      amountCents: 9000,
      categoryId: 'mercado',
      date: '2026-09-28',
      scope: 'family',
      memberId: 'm-ana',
      description: null,
    });
    const edited = (await listExpenses()).find(i => i.id === 'e1');
    expect(edited).toMatchObject({ scope: 'family', memberId: null });
  });

  it('apagar esconde o gasto da lista, mas mantém a linha no banco', async () => {
    await deleteExpense('e2');
    expect((await listExpenses()).map(i => i.id)).toEqual(['e1']);
    const row = sqlite.executeSync(
      "SELECT deleted_at FROM expenses WHERE id = 'e2'",
    );
    expect(row.rows[0]?.deleted_at).toBeTruthy();
  });

  it('grava um gasto novo com id UUID', async () => {
    const id = await createExpense({
      amountCents: 4500,
      categoryId: 'mercado',
      date: '2026-09-30',
      scope: 'family',
      memberId: 'm-self',
      description: null,
      source: 'chat',
      rawText: '45 no mercado',
    });
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    const created = (await listExpenses()).find(i => i.id === id);
    expect(created).toMatchObject({ amountCents: 4500, memberId: null });
  });
});

describe('dados iniciais', () => {
  it('cria as categorias que faltam sem sobrescrever as existentes', async () => {
    sqlite.executeSync(
      "UPDATE categories SET name = 'Supermercado' WHERE id = 'mercado'",
    );
    await ensureSeedData();
    await ensureSeedData();

    const list = await listCategories();
    expect(list.map(c => c.id)).toEqual(
      expect.arrayContaining(['mercado', 'restaurantes', 'saude', 'outros']),
    );
    expect(list.find(c => c.id === 'mercado')?.name).toBe('Supermercado');
  });

  it('não cria um segundo membro "você"', async () => {
    await ensureSeedData();
    const selves = (await listMembers()).filter(m => m.isSelf);
    expect(selves.map(m => m.id)).toEqual(['m-self']);
  });
});
