import type { ExpenseDisputeRow } from '../../db/disputeSchema';
import type { FamilyExpenseRow } from '../../db/repositories/familyExpensesRepository';
import type { MemberRow } from '../../db/schema';

export type DisputeView = ExpenseDisputeRow & {
  openedByName: string;
  resolvedByName: string | null;
};

/** Gasto de família pronto para a tela: quem lançou e a contestação. */
export type FamilyExpenseView = FamilyExpenseRow & {
  createdByName: string;
  /** Lançado pelo usuário deste celular. */
  createdByMe: boolean;
  openDispute: DisputeView | null;
  /** Última contestação encerrada, para mostrar o que foi combinado. */
  lastResolved: DisputeView | null;
  /** Pode contestar: gasto de outra pessoa, sem contestação aberta. */
  canDispute: boolean;
  /** Pode encerrar: quem contestou ou quem lançou. */
  canResolve: boolean;
};

/** Nome de um usuário da família: "você", o nome do membro ou um genérico. */
export function userName(
  userId: string | null,
  myUserId: string | null,
  members: MemberRow[],
): string {
  if (!userId) {
    return 'alguém que saiu da família';
  }
  if (userId === myUserId) {
    return 'você';
  }
  return members.find(m => m.userId === userId)?.name ?? 'outro membro';
}

export function buildFamilyExpenseViews(
  rows: FamilyExpenseRow[],
  disputes: ExpenseDisputeRow[],
  members: MemberRow[],
  myUserId: string | null,
  online: boolean,
): FamilyExpenseView[] {
  const toView = (d: ExpenseDisputeRow): DisputeView => ({
    ...d,
    openedByName: userName(d.openedByUserId, myUserId, members),
    resolvedByName: d.resolvedByUserId
      ? userName(d.resolvedByUserId, myUserId, members)
      : null,
  });

  return rows.map(row => {
    // Sem dono: gasto feito neste celular que ainda não subiu.
    const createdByMe =
      row.createdByUserId === null || row.createdByUserId === myUserId;
    const mine = disputes.filter(d => d.expenseId === row.id);
    const open = mine.find(d => d.status === 'open');
    const resolved = mine.find(d => d.status === 'resolved');
    return {
      ...row,
      createdByName: createdByMe
        ? 'você'
        : userName(row.createdByUserId, myUserId, members),
      createdByMe,
      openDispute: open ? toView(open) : null,
      lastResolved: resolved ? toView(resolved) : null,
      canDispute: online && !createdByMe && !open,
      canResolve:
        online &&
        Boolean(open) &&
        myUserId !== null &&
        (open?.openedByUserId === myUserId || row.createdByUserId === myUserId),
    };
  });
}
