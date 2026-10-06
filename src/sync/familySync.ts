import { and, eq, gt, inArray, isNotNull, or, sql } from 'drizzle-orm';

import { db } from '../db/client';
import { categories, expenses, members, EXPENSE_SOURCES } from '../db/schema';
import { syncState } from '../db/syncSchema';
import { uuidv4 } from '../utils/uuid';

/**
 * Sincronização dos gastos de família com a nuvem.
 *
 * - Gastos pessoais nunca sobem.
 * - Envio: gastos de família criados, editados ou apagados desde o último
 *   envio. Um gasto que deixou de ser de família sobe como apagado, para
 *   sumir dos outros aparelhos.
 * - Recebimento: linhas da família alteradas no servidor desde o último
 *   cursor. Num conflito, vence a edição mais recente (`client_updated_at`),
 *   e uma alteração local ainda não enviada não é sobrescrita por uma mais
 *   antiga.
 */

/** Linha de `family_expenses` como o Supabase devolve. */
export type RemoteExpense = {
  id: string;
  family_id: string;
  created_by: string | null;
  amount_cents: number;
  category_id: string;
  category_name: string;
  category_icon: string;
  date: string;
  description: string | null;
  source: string;
  client_updated_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type RemoteExpenseInput = Omit<
  RemoteExpense,
  'created_at' | 'updated_at'
>;

/** O que a sincronização precisa da nuvem. Nos testes, uma versão em memória. */
export interface FamilyRemote {
  upsertExpenses(rows: RemoteExpenseInput[]): Promise<void>;
  /** Linhas com `updated_at` maior que `since`, em ordem crescente. */
  pullExpenses(
    familyId: string,
    since: string | null,
  ): Promise<RemoteExpense[]>;
}

const PUSH_BATCH = 100;
/**
 * Transações que terminam fora de ordem no servidor podem gravar um
 * `updated_at` menor que o cursor. Voltar alguns minutos evita perder essas
 * linhas; receber de novo é inofensivo.
 */
const PULL_OVERLAP_MS = 5 * 60 * 1000;

const cursorKey = (familyId: string) => `family_pull_cursor:${familyId}`;

/** O Postgres devolve "2026-10-06T12:00:00.123+00:00"; aqui tudo é ISO com Z. */
function toIso(value: string): string {
  return new Date(value).toISOString();
}

async function readState(key: string): Promise<string | null> {
  const rows = await db
    .select({ value: syncState.value })
    .from(syncState)
    .where(eq(syncState.key, key));
  return rows[0]?.value ?? null;
}

async function writeState(key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(syncState)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: syncState.key,
      set: { value, updatedAt: now },
    });
}

/** Esquece o progresso, por exemplo ao sair da família ou da conta. */
export async function resetFamilySyncState(): Promise<void> {
  await db
    .delete(syncState)
    .where(sql`${syncState.key} LIKE 'family_pull_cursor:%'`);
}

export async function pushFamilyExpenses(
  ctx: { familyId: string; userId: string },
  remote: FamilyRemote,
): Promise<number> {
  const dirty = await db
    .select({
      expense: expenses,
      categoryName: categories.name,
      categoryIcon: categories.icon,
    })
    .from(expenses)
    .innerJoin(categories, eq(expenses.categoryId, categories.id))
    .where(
      and(
        or(
          eq(expenses.scope, 'family'),
          // Já esteve na nuvem: precisa subir como apagado.
          isNotNull(expenses.pushedAt),
        ),
        or(
          sql`${expenses.pushedAt} IS NULL`,
          gt(expenses.updatedAt, expenses.pushedAt),
        ),
      ),
    );

  // Gasto de família apagado antes de subir não precisa ir: só é marcado.
  const neverSent = ({ expense }: (typeof dirty)[number]) =>
    Boolean(expense.deletedAt) && !expense.pushedAt;
  for (const { expense } of dirty.filter(neverSent)) {
    await db
      .update(expenses)
      .set({ pushedAt: expense.updatedAt })
      .where(eq(expenses.id, expense.id));
  }
  const toSend = dirty.filter(row => !neverSent(row));

  for (let i = 0; i < toSend.length; i += PUSH_BATCH) {
    const batch = toSend.slice(i, i + PUSH_BATCH);
    await remote.upsertExpenses(
      batch.map(({ expense, categoryName, categoryIcon }) => ({
        id: expense.id,
        family_id: ctx.familyId,
        created_by: ctx.userId,
        amount_cents: expense.amountCents,
        category_id: expense.categoryId,
        category_name: categoryName,
        category_icon: categoryIcon,
        date: expense.date,
        description: expense.description,
        source: expense.source,
        client_updated_at: expense.updatedAt,
        deleted_at:
          expense.deletedAt ??
          (expense.scope === 'personal' ? expense.updatedAt : null),
      })),
    );
    for (const { expense } of batch) {
      await db
        .update(expenses)
        // Pessoal: saiu da nuvem, não sobe mais até voltar a ser de família.
        .set({
          pushedAt: expense.scope === 'family' ? expense.updatedAt : null,
        })
        // Se mudou durante o envio, continua pendente.
        .where(
          and(
            eq(expenses.id, expense.id),
            eq(expenses.updatedAt, expense.updatedAt),
          ),
        );
    }
  }
  return toSend.length;
}

export async function pullFamilyExpenses(
  familyId: string,
  remote: FamilyRemote,
): Promise<{ pulled: number; newCategories: number }> {
  const cursor = await readState(cursorKey(familyId));
  const since = cursor
    ? new Date(new Date(cursor).getTime() - PULL_OVERLAP_MS).toISOString()
    : null;
  const rows = await remote.pullExpenses(familyId, since);
  if (rows.length === 0) {
    return { pulled: 0, newCategories: 0 };
  }

  const ids = rows.map(r => r.id);
  const locals = await db
    .select({
      id: expenses.id,
      updatedAt: expenses.updatedAt,
      pushedAt: expenses.pushedAt,
    })
    .from(expenses)
    .where(inArray(expenses.id, ids));
  const knownCategories = new Set(
    (await db.select({ id: categories.id }).from(categories)).map(c => c.id),
  );

  let pulled = 0;
  let newCategories = 0;
  let maxCursor = cursor ?? '';
  for (const row of rows) {
    const remoteUpdatedAt = toIso(row.updated_at);
    if (remoteUpdatedAt > maxCursor) {
      maxCursor = remoteUpdatedAt;
    }
    const clientUpdatedAt = toIso(row.client_updated_at);
    const local = locals.find(l => l.id === row.id);
    if (local && local.updatedAt >= clientUpdatedAt) {
      // Igual ou mais nova aqui: nada a receber.
      continue;
    }

    // Categoria criada em outro aparelho: cria aqui com o mesmo id.
    if (!knownCategories.has(row.category_id)) {
      const now = new Date().toISOString();
      await db
        .insert(categories)
        .values({
          id: row.category_id,
          name: row.category_name,
          icon: row.category_icon,
          sortOrder: 999,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing({ target: categories.id });
      knownCategories.add(row.category_id);
      newCategories += 1;
    }

    const source = (EXPENSE_SOURCES as readonly string[]).includes(row.source)
      ? (row.source as (typeof EXPENSE_SOURCES)[number])
      : 'manual';
    const values = {
      amountCents: row.amount_cents,
      categoryId: row.category_id,
      date: row.date,
      scope: 'family' as const,
      memberId: null,
      description: row.description,
      source,
      updatedAt: clientUpdatedAt,
      deletedAt: row.deleted_at ? toIso(row.deleted_at) : null,
      // Recebido da nuvem: não precisa subir de novo.
      pushedAt: clientUpdatedAt,
    };
    await db
      .insert(expenses)
      .values({
        id: row.id,
        ...values,
        rawText: null,
        createdAt: toIso(row.created_at),
      })
      .onConflictDoUpdate({ target: expenses.id, set: values });
    pulled += 1;
  }

  await writeState(cursorKey(familyId), maxCursor);
  return { pulled, newCategories };
}

export type CloudMember = { userId: string; displayName: string };

/**
 * Espelha os membros da família na tabela local `members`. O "você" local
 * ganha o id do usuário logado; quem saiu da família é desativado.
 */
export async function syncFamilyMembers(
  cloudMembers: CloudMember[],
  myUserId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const local = await db.select().from(members);

  // Outro membro local com o meu userId (ex.: conta trocada) perde o vínculo.
  const self = local.find(m => m.isSelf);
  if (self && self.userId !== myUserId) {
    await db
      .update(members)
      .set({ userId: null, updatedAt: now })
      .where(and(eq(members.userId, myUserId), eq(members.isSelf, false)));
    await db
      .update(members)
      .set({ userId: myUserId, updatedAt: now })
      .where(eq(members.id, self.id));
  }

  for (const member of cloudMembers) {
    if (member.userId === myUserId) {
      continue;
    }
    const existing = local.find(m => m.userId === member.userId);
    if (existing) {
      if (existing.name !== member.displayName || existing.deletedAt) {
        await db
          .update(members)
          .set({ name: member.displayName, deletedAt: null, updatedAt: now })
          .where(eq(members.id, existing.id));
      }
    } else {
      await db.insert(members).values({
        id: uuidv4(),
        name: member.displayName,
        isSelf: false,
        userId: member.userId,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  const stillIn = new Set(cloudMembers.map(m => m.userId));
  for (const member of local) {
    if (
      !member.isSelf &&
      member.userId &&
      !member.deletedAt &&
      !stillIn.has(member.userId)
    ) {
      await db
        .update(members)
        .set({ deletedAt: now, updatedAt: now })
        .where(eq(members.id, member.id));
    }
  }
}
