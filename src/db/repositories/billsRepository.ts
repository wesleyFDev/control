import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

import {
  scheduleBoletoInstallments,
  scheduleCardInstallments,
  type YearMonth,
} from '../../features/bills/schedule';
import { toISODate } from '../../utils/dates';
import { uuidv4 } from '../../utils/uuid';
import {
  creditCards,
  payableInstallments,
  payables,
  type CreditCardRow,
  type PayableKind,
} from '../billsSchema';
import { db } from '../client';
import { categories } from '../schema';
import { createExpense } from './expensesRepository';

function nowIso(): string {
  return new Date().toISOString();
}

/** Erro com mensagem pronta para mostrar ao usuário. */
export class BillsValidationError extends Error {}

// ---------- Cartões ----------

export type CardInput = { name: string; closingDay: number; dueDay: number };

function validateCard({ name, closingDay, dueDay }: CardInput) {
  if (!name.trim()) {
    throw new BillsValidationError('Dê um nome para o cartão.');
  }
  for (const [label, day] of [
    ['fechamento', closingDay],
    ['vencimento', dueDay],
  ] as const) {
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      throw new BillsValidationError(
        `O dia de ${label} precisa ser um número de 1 a 31.`,
      );
    }
  }
}

export async function listCards(): Promise<CreditCardRow[]> {
  return db
    .select()
    .from(creditCards)
    .where(isNull(creditCards.deletedAt))
    .orderBy(asc(creditCards.name));
}

export async function createCard(input: CardInput): Promise<string> {
  validateCard(input);
  const id = uuidv4();
  const now = nowIso();
  await db.insert(creditCards).values({
    id,
    name: input.name.trim(),
    closingDay: input.closingDay,
    dueDay: input.dueDay,
    createdAt: now,
    updatedAt: now,
  });
  return id;
}

/**
 * Mudar o fechamento ou o vencimento vale para as compras novas. As
 * parcelas já criadas continuam nas faturas onde foram colocadas.
 */
export async function updateCard(id: string, input: CardInput): Promise<void> {
  validateCard(input);
  await db
    .update(creditCards)
    .set({
      name: input.name.trim(),
      closingDay: input.closingDay,
      dueDay: input.dueDay,
      updatedAt: nowIso(),
    })
    .where(eq(creditCards.id, id));
}

/** Só apaga cartão sem parcelas a pagar. */
export async function deleteCard(id: string): Promise<void> {
  const pending = await db
    .select({ id: payableInstallments.id })
    .from(payableInstallments)
    .innerJoin(payables, eq(payableInstallments.payableId, payables.id))
    .where(
      and(
        eq(payables.cardId, id),
        isNull(payables.deletedAt),
        isNull(payableInstallments.deletedAt),
        isNull(payableInstallments.paidAt),
      ),
    )
    .limit(1);
  if (pending.length > 0) {
    throw new BillsValidationError(
      'Este cartão ainda tem parcelas a pagar. Pague ou apague as compras antes.',
    );
  }
  const now = nowIso();
  await db
    .update(creditCards)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(creditCards.id, id));
}

// ---------- Compras e boletos ----------

export type PayableInput = {
  kind: PayableKind;
  cardId: string | null;
  description: string;
  categoryId: string;
  scope: 'personal' | 'family';
  memberId: string | null;
  totalCents: number;
  installmentsCount: number;
  /** Data da compra (cartão) ou do primeiro vencimento (boleto). */
  startDate: string;
};

/** Cria a compra ou o boleto e todas as parcelas. Nada vira gasto aqui. */
export async function createPayable(input: PayableInput): Promise<string> {
  if (!input.description.trim()) {
    throw new BillsValidationError('Descreva o que foi comprado.');
  }
  if (!(input.totalCents > 0)) {
    throw new BillsValidationError('Informe um valor maior que zero.');
  }
  if (
    !Number.isInteger(input.installmentsCount) ||
    input.installmentsCount < 1 ||
    input.installmentsCount > 48
  ) {
    throw new BillsValidationError('O número de parcelas vai de 1 a 48.');
  }
  if (input.totalCents < input.installmentsCount) {
    throw new BillsValidationError(
      'Cada parcela precisa valer pelo menos R$ 0,01.',
    );
  }
  if (input.scope === 'personal' && !input.memberId) {
    throw new BillsValidationError('Escolha de quem é o gasto.');
  }

  let schedule;
  if (input.kind === 'card') {
    const [card] = await db
      .select()
      .from(creditCards)
      .where(
        and(
          eq(creditCards.id, input.cardId ?? ''),
          isNull(creditCards.deletedAt),
        ),
      );
    if (!card) {
      throw new BillsValidationError('Escolha um cartão.');
    }
    schedule = scheduleCardInstallments({
      totalCents: input.totalCents,
      count: input.installmentsCount,
      purchaseDate: input.startDate,
      closingDay: card.closingDay,
      dueDay: card.dueDay,
    });
  } else {
    schedule = scheduleBoletoInstallments({
      totalCents: input.totalCents,
      count: input.installmentsCount,
      firstDueDate: input.startDate,
    });
  }

  const id = uuidv4();
  const now = nowIso();
  await db.insert(payables).values({
    id,
    kind: input.kind,
    cardId: input.kind === 'card' ? input.cardId : null,
    description: input.description.trim(),
    categoryId: input.categoryId,
    scope: input.scope,
    memberId: input.scope === 'family' ? null : input.memberId,
    totalCents: input.totalCents,
    installmentsCount: input.installmentsCount,
    startDate: input.startDate,
    createdAt: now,
    updatedAt: now,
  });
  await db.insert(payableInstallments).values(
    schedule.map(item => ({
      id: uuidv4(),
      payableId: id,
      number: item.number,
      amountCents: item.amountCents,
      referenceMonth: item.referenceMonth,
      dueDate: item.dueDate,
      createdAt: now,
      updatedAt: now,
    })),
  );
  return id;
}

/**
 * Apaga a compra ou o boleto e as parcelas ainda não pagas. As já pagas
 * continuam, porque já viraram gastos.
 */
export async function deletePayable(id: string): Promise<void> {
  const now = nowIso();
  await db
    .update(payableInstallments)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(payableInstallments.payableId, id),
        isNull(payableInstallments.paidAt),
        isNull(payableInstallments.deletedAt),
      ),
    );
  await db
    .update(payables)
    .set({ deletedAt: now, updatedAt: now })
    .where(eq(payables.id, id));
}

// ---------- Leitura ----------

export type InstallmentItem = {
  id: string;
  payableId: string;
  kind: PayableKind;
  cardId: string | null;
  description: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  scope: 'personal' | 'family';
  memberId: string | null;
  number: number;
  installmentsCount: number;
  amountCents: number;
  referenceMonth: YearMonth;
  dueDate: string;
  paidAt: string | null;
  expenseId: string | null;
};

const installmentFields = {
  id: payableInstallments.id,
  payableId: payables.id,
  kind: payables.kind,
  cardId: payables.cardId,
  description: payables.description,
  categoryId: payables.categoryId,
  categoryName: categories.name,
  categoryIcon: categories.icon,
  scope: payables.scope,
  memberId: payables.memberId,
  number: payableInstallments.number,
  installmentsCount: payables.installmentsCount,
  amountCents: payableInstallments.amountCents,
  referenceMonth: payableInstallments.referenceMonth,
  dueDate: payableInstallments.dueDate,
  paidAt: payableInstallments.paidAt,
  expenseId: payableInstallments.expenseId,
};

function activeInstallments() {
  return and(isNull(payableInstallments.deletedAt), isNull(payables.deletedAt));
}

async function selectInstallments(where: ReturnType<typeof and>) {
  return db
    .select(installmentFields)
    .from(payableInstallments)
    .innerJoin(payables, eq(payableInstallments.payableId, payables.id))
    .innerJoin(categories, eq(payables.categoryId, categories.id))
    .where(where)
    .orderBy(
      asc(payableInstallments.dueDate),
      asc(payables.description),
      asc(payableInstallments.number),
    ) as Promise<InstallmentItem[]>;
}

export type Invoice = {
  cardId: string;
  referenceMonth: YearMonth;
  dueDate: string;
  totalCents: number;
  paidCents: number;
  itemCount: number;
  /** Paga quando todas as parcelas dela estão pagas. */
  paid: boolean;
};

/** Faturas de um cartão, do mês mais antigo para o mais novo. */
export async function listInvoices(cardId: string): Promise<Invoice[]> {
  const rows = await db
    .select({
      referenceMonth: payableInstallments.referenceMonth,
      dueDate: sql<string>`max(${payableInstallments.dueDate})`,
      totalCents: sql<number>`sum(${payableInstallments.amountCents})`,
      paidCents: sql<number>`sum(case when ${payableInstallments.paidAt} is null then 0 else ${payableInstallments.amountCents} end)`,
      itemCount: sql<number>`count(*)`,
    })
    .from(payableInstallments)
    .innerJoin(payables, eq(payableInstallments.payableId, payables.id))
    .where(and(eq(payables.cardId, cardId), activeInstallments()))
    .groupBy(payableInstallments.referenceMonth)
    .orderBy(asc(payableInstallments.referenceMonth));

  return rows.map(row => ({
    cardId,
    referenceMonth: row.referenceMonth,
    dueDate: row.dueDate,
    totalCents: Number(row.totalCents),
    paidCents: Number(row.paidCents),
    itemCount: Number(row.itemCount),
    paid: Number(row.paidCents) >= Number(row.totalCents),
  }));
}

export async function listInvoiceItems(
  cardId: string,
  referenceMonth: YearMonth,
): Promise<InstallmentItem[]> {
  return selectInstallments(
    and(
      eq(payables.cardId, cardId),
      eq(payableInstallments.referenceMonth, referenceMonth),
      activeInstallments(),
    ),
  );
}

/** Parcelas de boletos, das que vencem antes para as que vencem depois. */
export async function listBoletoInstallments(): Promise<InstallmentItem[]> {
  return selectInstallments(
    and(eq(payables.kind, 'boleto'), activeInstallments()),
  );
}

// ---------- Pagamento ----------

function expenseDescription(item: InstallmentItem): string {
  return item.installmentsCount > 1
    ? `${item.description} (${item.number}/${item.installmentsCount})`
    : item.description;
}

/**
 * Marca as parcelas como pagas e cria um gasto para cada uma, com a
 * categoria e o dono da compra. A data do gasto é o dia do pagamento.
 * Parcelas já pagas são ignoradas.
 *
 * O driver do Drizzle para o op-sqlite não garante transação. Por isso cada
 * parcela grava o gasto e, logo depois, a ligação com ele: uma falha no meio
 * deixa as parcelas seguintes ainda a pagar, sem gasto duplicado.
 */
async function payItems(items: InstallmentItem[], paidOn: string) {
  const unpaid = items.filter(item => !item.paidAt);
  for (const item of unpaid) {
    const expenseId = await createExpense({
      amountCents: item.amountCents,
      categoryId: item.categoryId,
      date: paidOn,
      scope: item.scope,
      memberId: item.memberId,
      description: expenseDescription(item),
      source: 'installment',
      rawText: null,
    });
    const now = nowIso();
    await db
      .update(payableInstallments)
      .set({ paidAt: now, expenseId, updatedAt: now })
      .where(
        and(
          eq(payableInstallments.id, item.id),
          isNull(payableInstallments.paidAt),
        ),
      );
  }
  return unpaid.length;
}

/**
 * Paga a fatura inteira de um cartão num mês, inclusive uma fatura futura,
 * o que adianta aquelas parcelas. Devolve quantas parcelas foram pagas.
 */
export async function payInvoice(
  cardId: string,
  referenceMonth: YearMonth,
  paidOn: string = toISODate(new Date()),
): Promise<number> {
  return payItems(await listInvoiceItems(cardId, referenceMonth), paidOn);
}

/** Paga uma parcela de boleto. */
export async function payBoletoInstallment(
  installmentId: string,
  paidOn: string = toISODate(new Date()),
): Promise<void> {
  const items = await selectInstallments(
    and(
      eq(payableInstallments.id, installmentId),
      eq(payables.kind, 'boleto'),
      activeInstallments(),
    ),
  );
  if (items.length === 0) {
    throw new BillsValidationError('Parcela não encontrada.');
  }
  await payItems(items, paidOn);
}

/** Total por mês que ainda falta pagar, somando cartões e boletos. */
export async function listPendingByMonth(): Promise<
  { referenceMonth: YearMonth; totalCents: number }[]
> {
  const rows = await db
    .select({
      referenceMonth: payableInstallments.referenceMonth,
      totalCents: sql<number>`sum(${payableInstallments.amountCents})`,
    })
    .from(payableInstallments)
    .innerJoin(payables, eq(payableInstallments.payableId, payables.id))
    .where(and(activeInstallments(), isNull(payableInstallments.paidAt)))
    .groupBy(payableInstallments.referenceMonth)
    .orderBy(asc(payableInstallments.referenceMonth));
  return rows.map(r => ({ ...r, totalCents: Number(r.totalCents) }));
}

/** Usado nos testes e na tela de detalhe. */
export async function listInstallmentsOf(
  payableIds: string[],
): Promise<InstallmentItem[]> {
  if (payableIds.length === 0) {
    return [];
  }
  return selectInstallments(
    and(inArray(payables.id, payableIds), activeInstallments()),
  );
}
