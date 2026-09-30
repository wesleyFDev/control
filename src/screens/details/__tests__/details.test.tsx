import React from 'react';
import { Alert, Text } from 'react-native';
import ReactTestRenderer, {
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import Details from '../details';

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
    date: '2026-09-30',
    scope: 'family',
    description: 'Compra da casa',
    categoryId: 'mercado',
    categoryName: 'Mercado',
    categoryIcon: 'shopping-cart',
    memberId: null,
    memberName: null,
  },
  {
    id: 'e2',
    amountCents: 2300,
    date: '2026-09-30',
    scope: 'personal',
    description: null,
    categoryId: 'transporte',
    categoryName: 'Transporte',
    categoryIcon: 'navigation',
    memberId: 'm1',
    memberName: 'Wesley',
  },
];

const mockDelete = jest.fn(async (_id: string) => undefined);

jest.mock('../../../db/repositories/expensesRepository', () => ({
  listExpenses: jest.fn(async () => mockItems),
  deleteExpense: (id: string) => mockDelete(id),
  updateExpense: jest.fn(async () => undefined),
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

async function renderDetails(): Promise<Renderer> {
  let renderer: Renderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<Details />);
  });
  return renderer as Renderer;
}

describe('Detalhes', () => {
  it('lista os gastos agrupados por dia, com o total do dia', async () => {
    const renderer = await renderDetails();
    const text = allText(renderer.root);
    expect(text).toContain('Mercado');
    expect(text).toContain('Compra da casa');
    expect(text).toContain('Família');
    expect(text).toContain('Wesley');
    expect(text).toContain('R$ 110,50');
    await ReactTestRenderer.act(async () => renderer.unmount());
  });

  it('pede confirmação e apaga o gasto', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const renderer = await renderDetails();

    const deleteButton = renderer.root.find(
      node =>
        node.props.accessibilityLabel === 'Apagar gasto de Mercado' &&
        typeof node.props.onPress === 'function',
    );
    await ReactTestRenderer.act(async () => deleteButton.props.onPress());

    expect(alertSpy).toHaveBeenCalled();
    const buttons = alertSpy.mock.calls[0][2] ?? [];
    const confirm = buttons.find(b => b.text === 'Apagar');
    await ReactTestRenderer.act(async () => confirm?.onPress?.());

    expect(mockDelete).toHaveBeenCalledWith('e1');
    await ReactTestRenderer.act(async () => renderer.unmount());
  });
});
