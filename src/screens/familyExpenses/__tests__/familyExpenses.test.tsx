import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, {
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import FamilyExpenses from '../familyExpenses';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

const mockItems = [
  {
    id: 'e1',
    amountCents: 8750,
    date: '2026-10-05',
    scope: 'family',
    description: 'Compra da casa',
    categoryId: 'mercado',
    categoryName: 'Mercado',
    categoryIcon: 'shopping-cart',
    memberId: null,
    memberName: null,
    createdByUserId: null,
  },
  {
    id: 'e2',
    amountCents: 2500,
    date: '2026-10-05',
    scope: 'family',
    description: null,
    categoryId: 'lazer',
    categoryName: 'Lazer',
    categoryIcon: 'film',
    memberId: null,
    memberName: null,
    createdByUserId: null,
  },
];

const mockList = jest.fn(async (_from: string, _to: string) => mockItems);

jest.mock('../../../db/repositories/familyExpensesRepository', () => ({
  listFamilyExpenses: (from: string, to: string) => mockList(from, to),
  listDisputesFor: jest.fn(async () => []),
}));

jest.mock('../../../db/repositories/lookupsRepository', () => ({
  listCategories: jest.fn(async () => []),
  listMembers: jest.fn(async () => []),
}));

function allText(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map(node =>
      ([] as unknown[])
        .concat(node.props.children)
        .filter(c => typeof c === 'string' || typeof c === 'number')
        .join(''),
    )
    .join('\n');
}

describe('Gastos da família', () => {
  it('mostra o total do mês, a divisão por categoria e a lista', async () => {
    let renderer: Renderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<FamilyExpenses />);
    });
    const text = allText((renderer as Renderer).root);

    expect(text).toContain('R$ 112,50');
    expect(text).toContain('2 gastos');
    expect(text).toContain('Mercado · 78%');
    expect(text).toContain('Compra da casa');
    expect(text).toContain('Lançado por você');
    // Sem backend configurado nos testes, os gastos ficam só no celular.
    expect(text).toContain('Sem conta conectada: só neste celular');

    // Busca o mês inteiro.
    const [from, to] = mockList.mock.calls[0];
    expect(from.endsWith('-01')).toBe(true);
    expect(to > from).toBe(true);
    await ReactTestRenderer.act(async () => (renderer as Renderer).unmount());
  });
});
