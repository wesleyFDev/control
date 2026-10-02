import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer, {
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import { toISODate } from '../../../utils/dates';
import Reports from '../reports';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
  };
});

const mockToday = toISODate(new Date());

jest.mock('../../../db/repositories/reportsRepository', () => ({
  listExpensesBetween: jest.fn(async () => [
    {
      id: '1',
      amountCents: 8750,
      date: mockToday,
      scope: 'family',
      description: null,
      categoryId: 'mercado',
      categoryName: 'Mercado',
      categoryIcon: 'shopping-cart',
      memberId: null,
      memberName: null,
    },
    {
      id: '2',
      amountCents: 2300,
      date: mockToday,
      scope: 'personal',
      description: null,
      categoryId: 'transporte',
      categoryName: 'Transporte',
      categoryIcon: 'navigation',
      memberId: 'eu',
      memberName: 'Você',
    },
  ]),
}));

jest.mock('../../../db/repositories/lookupsRepository', () => ({
  getSelfMemberId: jest.fn(async () => 'eu'),
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

async function press(root: ReactTestInstance, label: string) {
  const target = root.find(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAllByType(Text).some(t => t.props.children === label),
  );
  await ReactTestRenderer.act(async () => target.props.onPress());
}

describe('Relatórios', () => {
  it('mostra os gastos seus e troca para os da família', async () => {
    let renderer: Renderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<Reports />);
    });
    const root = (renderer as Renderer).root;

    let text = allText(root);
    expect(text).toContain('R$ 23,00');
    expect(text).toContain('Transporte');
    expect(text).not.toContain('R$ 87,50');

    await press(root, 'Família');
    text = allText(root);
    expect(text).toContain('R$ 87,50');
    expect(text).toContain('Por categoria');

    await press(root, 'Transporte');
    expect(allText(root)).toContain('Nenhum gasto da família neste período.');

    await ReactTestRenderer.act(async () => (renderer as Renderer).unmount());
  });
});
