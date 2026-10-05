import React from 'react';
import { Alert, Text } from 'react-native';
import ReactTestRenderer, {
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import InvoiceScreen from '../invoice';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
    useNavigation: () => ({ navigate: jest.fn() }),
    useRoute: () => ({ params: { cardId: 'c1', month: '2099-01' } }),
  };
});

const mockPayInvoice = jest.fn(async (..._args: unknown[]) => 2);

jest.mock('../../../db/repositories/billsRepository', () => ({
  listInvoiceItems: jest.fn(async () => [
    {
      id: 'i1',
      payableId: 'p1',
      description: 'TV',
      categoryName: 'Casa e contas',
      categoryIcon: 'home',
      number: 2,
      installmentsCount: 3,
      amountCents: 30000,
      dueDate: '2099-01-10',
      paidAt: null,
    },
    {
      id: 'i2',
      payableId: 'p2',
      description: 'Sofá',
      categoryName: 'Casa e contas',
      categoryIcon: 'home',
      number: 2,
      installmentsCount: 4,
      amountCents: 10000,
      dueDate: '2099-01-10',
      paidAt: null,
    },
  ]),
  payInvoice: (...args: unknown[]) => mockPayInvoice(...args),
  deletePayable: jest.fn(),
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

describe('Fatura', () => {
  it('mostra as parcelas e adianta a fatura futura inteira', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    let renderer: Renderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<InvoiceScreen />);
    });
    const root = (renderer as Renderer).root;

    const text = allText(root);
    expect(text).toContain('R$ 400,00');
    expect(text).toContain('TV (2/3)');
    expect(text).toContain('Sofá (2/4)');
    expect(text).toContain('Adiantar fatura');

    const button = root.find(
      node =>
        typeof node.props.onPress === 'function' &&
        node
          .findAllByType(Text)
          .some(t => t.props.children === 'Adiantar fatura'),
    );
    await ReactTestRenderer.act(async () => button.props.onPress());
    const actions = alertSpy.mock.calls[0][2] ?? [];
    await ReactTestRenderer.act(async () =>
      actions.find(a => a.text === 'Adiantar')?.onPress?.(),
    );

    expect(mockPayInvoice).toHaveBeenCalledWith('c1', '2099-01');
    await ReactTestRenderer.act(async () => (renderer as Renderer).unmount());
  });
});
