jest.mock('@op-engineering/op-sqlite', () =>
  require('../../db/testing/fakeOpSqlite'),
);

const { migrate } = jest.requireActual('drizzle-orm/op-sqlite/migrator');

import { eq } from 'drizzle-orm';

import { db } from '../../db/client';
import migrations from '../../db/migrations/migrations';
import {
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from '../../db/repositories/expensesRepository';
import {
  getSelfMemberId,
  listMembers,
} from '../../db/repositories/lookupsRepository';
import { categories, expenses } from '../../db/schema';
import { ensureSeedData } from '../../db/seed';
import { expenseDisputes } from '../../db/disputeSchema';
import {
  pullDisputes,
  pullFamilyExpenses,
  pushFamilyExpenses,
  syncFamilyMembers,
  type FamilyRemote,
  type RemoteDispute,
  type RemoteExpense,
  type RemoteExpenseInput,
} from '../familySync';

const FAMILY = 'fam-1';
const ME = 'user-me';
const OTHER = 'user-ana';

/** family_expenses em memória, com o mesmo comportamento do trigger. */
function createFakeRemote() {
  const rows = new Map<string, RemoteExpense>();
  let clock = Date.parse('2026-10-06T10:00:00.000Z');
  const tick = () => {
    clock += 1000;
    // Mesmo formato que o Postgres devolve.
    return new Date(clock).toISOString().replace('Z', '+00:00');
  };
  const disputes = new Map<string, RemoteDispute>();
  const remote: FamilyRemote & {
    rows: typeof rows;
    disputes: typeof disputes;
    upserts: number;
  } = {
    rows,
    disputes,
    upserts: 0,
    async upsertExpenses(input: RemoteExpenseInput[]) {
      remote.upserts += input.length;
      for (const row of input) {
        const old = rows.get(row.id);
        rows.set(row.id, {
          ...row,
          created_by: old ? old.created_by : row.created_by,
          created_at: old ? old.created_at : tick(),
          updated_at: tick(),
        });
      }
    },
    async pullExpenses(familyId: string, since: string | null) {
      return [...rows.values()]
        .filter(
          r =>
            r.family_id === familyId &&
            (!since || new Date(r.updated_at) > new Date(since)),
        )
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    },
    async pullDisputes(familyId: string, since: string | null) {
      return [...disputes.values()]
        .filter(
          d =>
            d.family_id === familyId &&
            (!since || new Date(d.updated_at) > new Date(since)),
        )
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at));
    },
  };
  return { remote, tick };
}

const ctx = { familyId: FAMILY, userId: ME };
let selfId = '';

beforeAll(async () => {
  await migrate(db, migrations);
  await ensureSeedData();
  selfId = (await getSelfMemberId()) ?? '';
});

beforeEach(async () => {
  await db.delete(expenses);
});

const base = {
  categoryId: 'mercado',
  date: '2026-10-05',
  description: null,
  source: 'manual' as const,
  rawText: null,
};

describe('envio dos gastos de família', () => {
  it('só os gastos de família sobem; os pessoais ficam no celular', async () => {
    const { remote } = createFakeRemote();
    const familyId = await createExpense({
      ...base,
      amountCents: 5000,
      scope: 'family',
      memberId: null,
    });
    await createExpense({
      ...base,
      amountCents: 900,
      scope: 'personal',
      memberId: selfId,
    });

    expect(await pushFamilyExpenses(ctx, remote)).toBe(1);
    const sent = remote.rows.get(familyId);
    expect(sent).toMatchObject({
      family_id: FAMILY,
      created_by: ME,
      amount_cents: 5000,
      category_id: 'mercado',
      category_name: 'Mercado',
      deleted_at: null,
    });

    // Nada mudou: nada a enviar.
    expect(await pushFamilyExpenses(ctx, remote)).toBe(0);

    // Depois de subir, o gasto fica marcado como lançado por mim.
    const [local] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, familyId));
    expect(local.createdByUserId).toBe(ME);
  });

  it('edição sobe de novo; virar pessoal sobe como apagado, uma vez', async () => {
    const { remote } = createFakeRemote();
    const id = await createExpense({
      ...base,
      amountCents: 5000,
      scope: 'family',
      memberId: null,
    });
    await pushFamilyExpenses(ctx, remote);

    await new Promise<void>(resolve => setTimeout(resolve, 5));
    await updateExpense(id, {
      amountCents: 6000,
      categoryId: 'mercado',
      date: '2026-10-05',
      scope: 'family',
      memberId: null,
      description: null,
    });
    expect(await pushFamilyExpenses(ctx, remote)).toBe(1);
    expect(remote.rows.get(id)?.amount_cents).toBe(6000);

    await new Promise<void>(resolve => setTimeout(resolve, 5));
    await updateExpense(id, {
      amountCents: 6000,
      categoryId: 'mercado',
      date: '2026-10-05',
      scope: 'personal',
      memberId: selfId,
      description: null,
    });
    expect(await pushFamilyExpenses(ctx, remote)).toBe(1);
    expect(remote.rows.get(id)?.deleted_at).not.toBeNull();
    expect(await pushFamilyExpenses(ctx, remote)).toBe(0);
  });

  it('gasto de família apagado antes de subir não vai para a nuvem', async () => {
    const { remote } = createFakeRemote();
    const id = await createExpense({
      ...base,
      amountCents: 100,
      scope: 'family',
      memberId: null,
    });
    await deleteExpense(id);
    expect(await pushFamilyExpenses(ctx, remote)).toBe(0);
    expect(remote.rows.size).toBe(0);
  });
});

describe('recebimento dos gastos da família', () => {
  function remoteRow(
    tick: () => string,
    partial: Partial<RemoteExpense>,
  ): RemoteExpense {
    const at = tick();
    return {
      id: '6f1c2b1e-0000-4000-8000-000000000001',
      family_id: FAMILY,
      created_by: OTHER,
      amount_cents: 4200,
      category_id: 'pet-uuid',
      category_name: 'Pet',
      category_icon: 'heart',
      date: '2026-10-04',
      description: 'Ração',
      source: 'chat',
      client_updated_at: '2026-10-04T12:00:00.000Z',
      created_at: at,
      updated_at: at,
      deleted_at: null,
      ...partial,
    };
  }

  it('recebe o gasto de outro membro e cria a categoria que falta', async () => {
    const { remote, tick } = createFakeRemote();
    const row = remoteRow(tick, {});
    remote.rows.set(row.id, row);

    expect(await pullFamilyExpenses(FAMILY, remote)).toEqual({
      pulled: 1,
      newCategories: 1,
    });
    const [expense] = (await listExpenses()).filter(e => e.id === row.id);
    expect(expense).toMatchObject({
      amountCents: 4200,
      scope: 'family',
      memberId: null,
      categoryName: 'Pet',
      description: 'Ração',
    });
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, 'pet-uuid'));
    expect(category.icon).toBe('heart');
    const [local] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, row.id));
    expect(local.createdByUserId).toBe(OTHER);

    // O que veio da nuvem não volta para ela.
    expect(await pushFamilyExpenses(ctx, remote)).toBe(0);
  });

  it('não sobrescreve uma edição local mais nova; aceita uma remota mais nova', async () => {
    const { remote, tick } = createFakeRemote();
    const row = remoteRow(tick, {});
    remote.rows.set(row.id, row);
    await pullFamilyExpenses(FAMILY, remote);

    // Editado aqui depois, ainda não enviado.
    await db
      .update(expenses)
      .set({ amountCents: 9999, updatedAt: '2026-10-05T08:00:00.000Z' })
      .where(eq(expenses.id, row.id));
    remote.rows.set(
      row.id,
      remoteRow(tick, {
        amount_cents: 1111,
        client_updated_at: '2026-10-05T07:00:00.000Z',
      }),
    );
    await pullFamilyExpenses(FAMILY, remote);
    let [local] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, row.id));
    expect(local.amountCents).toBe(9999);

    remote.rows.set(
      row.id,
      remoteRow(tick, {
        amount_cents: 2222,
        client_updated_at: '2026-10-05T09:00:00.000Z',
      }),
    );
    await pullFamilyExpenses(FAMILY, remote);
    [local] = await db.select().from(expenses).where(eq(expenses.id, row.id));
    expect(local.amountCents).toBe(2222);
  });

  it('exclusão feita em outro celular chega aqui', async () => {
    const { remote, tick } = createFakeRemote();
    const row = remoteRow(tick, {});
    remote.rows.set(row.id, row);
    await pullFamilyExpenses(FAMILY, remote);

    remote.rows.set(
      row.id,
      remoteRow(tick, {
        client_updated_at: '2026-10-06T09:00:00.000Z',
        deleted_at: '2026-10-06T09:00:00.000+00:00',
      }),
    );
    await pullFamilyExpenses(FAMILY, remote);
    expect((await listExpenses()).some(e => e.id === row.id)).toBe(false);
  });
});

describe('contestações', () => {
  it('recebe a contestação aberta e depois o encerramento', async () => {
    const { remote, tick } = createFakeRemote();
    const opened = tick();
    const dispute: RemoteDispute = {
      id: 'd1',
      expense_id: 'e-1',
      family_id: FAMILY,
      opened_by: OTHER,
      reason: 'Foi compra pessoal',
      status: 'open',
      resolution_note: null,
      resolved_by: null,
      resolved_at: null,
      created_at: opened,
      updated_at: opened,
    };
    remote.disputes.set('d1', dispute);
    expect(await pullDisputes(FAMILY, remote)).toBe(1);
    let [local] = await db
      .select()
      .from(expenseDisputes)
      .where(eq(expenseDisputes.id, 'd1'));
    expect(local).toMatchObject({
      status: 'open',
      openedByUserId: OTHER,
      reason: 'Foi compra pessoal',
    });

    const closed = tick();
    remote.disputes.set('d1', {
      ...dispute,
      status: 'resolved',
      resolution_note: 'Corrigi para pessoal',
      resolved_by: ME,
      resolved_at: closed,
      updated_at: closed,
    });
    await pullDisputes(FAMILY, remote);
    [local] = await db
      .select()
      .from(expenseDisputes)
      .where(eq(expenseDisputes.id, 'd1'));
    expect(local).toMatchObject({
      status: 'resolved',
      resolutionNote: 'Corrigi para pessoal',
      resolvedByUserId: ME,
    });
  });
});

describe('membros da família', () => {
  it('liga o "você" ao usuário, cria os outros e desativa quem saiu', async () => {
    await syncFamilyMembers(
      [
        { userId: ME, displayName: 'Eu' },
        { userId: OTHER, displayName: 'Ana' },
      ],
      ME,
    );
    let rows = await listMembers();
    expect(rows.find(m => m.isSelf)?.userId).toBe(ME);
    expect(rows.find(m => m.userId === OTHER)?.name).toBe('Ana');

    await syncFamilyMembers([{ userId: ME, displayName: 'Eu' }], ME);
    rows = await listMembers();
    expect(rows.some(m => m.userId === OTHER)).toBe(false);
  });
});

describe('consulta dos gastos de família', () => {
  it('traz só os de família do período, sem os apagados', async () => {
    const { listFamilyExpenses } = jest.requireActual(
      '../../db/repositories/familyExpensesRepository',
    );
    const keep = await createExpense({
      ...base,
      amountCents: 1000,
      scope: 'family',
      memberId: null,
    });
    const removed = await createExpense({
      ...base,
      amountCents: 2000,
      scope: 'family',
      memberId: null,
    });
    await deleteExpense(removed);
    await createExpense({
      ...base,
      amountCents: 3000,
      scope: 'personal',
      memberId: selfId,
    });
    await createExpense({
      ...base,
      date: '2026-09-30',
      amountCents: 4000,
      scope: 'family',
      memberId: null,
    });

    const rows = await listFamilyExpenses('2026-10-01', '2026-10-31');
    expect(rows.map((r: { id: string }) => r.id)).toEqual([keep]);
    expect(rows[0]).toMatchObject({
      categoryName: 'Mercado',
      memberName: null,
    });
  });
});
