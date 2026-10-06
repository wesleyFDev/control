/**
 * Schema do banco local (Drizzle + op-sqlite).
 * Depois de mudar este arquivo, rode `npm run db:generate` para gerar as
 * migrations em src/db/migrations.
 *
 * Convenções:
 * - `id` é um UUID gerado no aparelho, para não colidir entre celulares no sync.
 * - Valores em centavos inteiros.
 * - `date` é o dia local do gasto, no formato AAAA-MM-DD.
 * - `created_at`, `updated_at` e `deleted_at` em texto ISO 8601 UTC.
 * - Nada é apagado de verdade: `deleted_at` marca a exclusão.
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const timestamps = {
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  deletedAt: text('deleted_at'),
};

/**
 * Pessoas da família cadastradas no aparelho.
 * A linha com `is_self = 1` é o próprio usuário, o "você".
 */
export const members = sqliteTable(
  'members',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    isSelf: integer('is_self', { mode: 'boolean' }).notNull().default(false),
    /** Id do usuário no Supabase, para membros da família na nuvem. */
    userId: text('user_id'),
    ...timestamps,
  },
  table => [
    index('members_is_self_idx').on(table.isSelf),
    uniqueIndex('members_user_id_idx')
      .on(table.userId)
      .where(sql`${table.userId} IS NOT NULL`),
  ],
);

/** Categorias de gasto. Os gastos apontam para elas pelo `id`. */
export const categories = sqliteTable(
  'categories',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    /** Nome do ícone do Feather, como "shopping-cart". */
    icon: text('icon').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    ...timestamps,
  },
  table => [index('categories_sort_order_idx').on(table.sortOrder)],
);

/**
 * Palavras-chave que ligam uma frase do chat a uma categoria.
 * Guardadas em minúsculas e sem acento, como o categoryMatcher compara.
 * Uma palavra ativa pertence a uma única categoria.
 */
export const categoryKeywords = sqliteTable(
  'category_keywords',
  {
    id: text('id').primaryKey(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    keyword: text('keyword').notNull(),
    ...timestamps,
  },
  table => [
    index('category_keywords_category_id_idx').on(table.categoryId),
    uniqueIndex('category_keywords_active_keyword_idx')
      .on(table.keyword)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

export const EXPENSE_SCOPES = ['personal', 'family'] as const;
/**
 * installment: parcela de cartão ou boleto paga.
 * bank: transação do banco, vinda da Pluggy, passada para os gastos.
 */
export const EXPENSE_SOURCES = [
  'chat',
  'manual',
  'installment',
  'bank',
] as const;

/**
 * Gastos.
 * - `scope = 'personal'`: o gasto é de uma pessoa, indicada em `member_id`
 *   (você ou outro membro).
 * - `scope = 'family'`: o gasto é de todos. `member_id` fica vazio e o valor
 *   conta para a família inteira.
 */
export const expenses = sqliteTable(
  'expenses',
  {
    id: text('id').primaryKey(),
    amountCents: integer('amount_cents').notNull(),
    categoryId: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    date: text('date').notNull(),
    scope: text('scope', { enum: EXPENSE_SCOPES }).notNull(),
    memberId: text('member_id').references(() => members.id, {
      onDelete: 'restrict',
    }),
    description: text('description'),
    source: text('source', { enum: EXPENSE_SOURCES }).notNull(),
    /** Frase original do chat, para revisar e melhorar a interpretação. */
    rawText: text('raw_text'),
    /**
     * `updated_at` da última versão enviada para a nuvem. Só gastos de
     * família sobem; um gasto com `updated_at` maior que este tem mudança
     * a enviar.
     */
    pushedAt: text('pushed_at'),
    ...timestamps,
  },
  table => [
    index('expenses_date_idx').on(table.date),
    index('expenses_category_id_idx').on(table.categoryId),
    index('expenses_member_id_idx').on(table.memberId),
    check('expenses_amount_positive', sql`${table.amountCents} > 0`),
    check(
      'expenses_scope_member',
      sql`(${table.scope} = 'family' AND ${table.memberId} IS NULL) OR (${table.scope} = 'personal' AND ${table.memberId} IS NOT NULL)`,
    ),
  ],
);

export type MemberRow = typeof members.$inferSelect;
export type NewMemberRow = typeof members.$inferInsert;
export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;
export type CategoryKeywordRow = typeof categoryKeywords.$inferSelect;
export type ExpenseRow = typeof expenses.$inferSelect;
export type NewExpenseRow = typeof expenses.$inferInsert;
