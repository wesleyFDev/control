import type { ExpenseDisputeRow } from '../../../db/disputeSchema';
import type { FamilyExpenseRow } from '../../../db/repositories/familyExpensesRepository';
import type { MemberRow } from '../../../db/schema';
import { buildFamilyExpenseViews } from '../familyExpenseView';

const ME = 'u-me';
const ANA = 'u-ana';
const BIA = 'u-bia';

const members = [
  { id: 'm1', name: 'Wesley', isSelf: true, userId: ME },
  { id: 'm2', name: 'Ana', isSelf: false, userId: ANA },
  { id: 'm3', name: 'Bia', isSelf: false, userId: BIA },
] as MemberRow[];

const row = (id: string, createdByUserId: string | null) =>
  ({
    id,
    amountCents: 1000,
    date: '2026-10-05',
    scope: 'family',
    description: null,
    categoryId: 'mercado',
    categoryName: 'Mercado',
    categoryIcon: 'shopping-cart',
    memberId: null,
    memberName: null,
    createdByUserId,
  } as FamilyExpenseRow);

const dispute = (
  expenseId: string,
  openedByUserId: string,
  status: 'open' | 'resolved',
) =>
  ({
    id: `d-${expenseId}-${status}`,
    expenseId,
    familyId: 'f',
    openedByUserId,
    reason: 'Motivo',
    status,
    resolutionNote: status === 'resolved' ? 'Combinado' : null,
    resolvedByUserId: status === 'resolved' ? openedByUserId : null,
    resolvedAt: null,
    createdAt: '2026-10-05T10:00:00.000Z',
    updatedAt: '2026-10-05T10:00:00.000Z',
  } as ExpenseDisputeRow);

describe('visão dos gastos de família', () => {
  it('mostra quem lançou e só deixa contestar gasto de outra pessoa', () => {
    const [mine, unsent, ana] = buildFamilyExpenseViews(
      [row('a', ME), row('b', null), row('c', ANA)],
      [],
      members,
      ME,
      true,
    );
    expect(mine).toMatchObject({ createdByName: 'você', canDispute: false });
    expect(unsent).toMatchObject({ createdByName: 'você', canDispute: false });
    expect(ana).toMatchObject({ createdByName: 'Ana', canDispute: true });
  });

  it('sem conexão com a família não deixa contestar nem encerrar', () => {
    const [ana] = buildFamilyExpenseViews(
      [row('c', ANA)],
      [dispute('c', ME, 'open')],
      members,
      ME,
      false,
    );
    expect(ana.canDispute).toBe(false);
    expect(ana.canResolve).toBe(false);
  });

  it('só quem contestou ou quem lançou encerra a contestação', () => {
    const [byBiaOnAna, byAnaOnMine] = buildFamilyExpenseViews(
      [row('c', ANA), row('a', ME)],
      [dispute('c', BIA, 'open'), dispute('a', ANA, 'open')],
      members,
      ME,
      true,
    );
    expect(byBiaOnAna.openDispute?.openedByName).toBe('Bia');
    expect(byBiaOnAna.canResolve).toBe(false);
    expect(byBiaOnAna.canDispute).toBe(false);
    expect(byAnaOnMine.canResolve).toBe(true);
  });

  it('guarda a última contestação encerrada com o que foi combinado', () => {
    const [ana] = buildFamilyExpenseViews(
      [row('c', ANA)],
      [dispute('c', ME, 'resolved')],
      members,
      ME,
      true,
    );
    expect(ana.openDispute).toBeNull();
    expect(ana.lastResolved).toMatchObject({
      resolutionNote: 'Combinado',
      resolvedByName: 'você',
    });
    expect(ana.canDispute).toBe(true);
  });
});
