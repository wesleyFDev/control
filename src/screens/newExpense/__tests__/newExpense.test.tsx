import React from 'react';
import { Text, TextInput } from 'react-native';
import ReactTestRenderer, {
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import NewExpense from '../newExpense';

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (effect: () => void) => useEffect(effect, [effect]),
    useNavigation: () => ({ navigate: jest.fn() }),
  };
});

const mockCreateExpense = jest.fn(async (_input: unknown) => 'new-id');

jest.mock('../../../db/repositories/expensesRepository', () => ({
  createExpense: (input: unknown) => mockCreateExpense(input),
}));

jest.mock('../../../db/repositories/lookupsRepository', () => ({
  listCategories: jest.fn(async () => [
    { id: 'mercado', name: 'Mercado', icon: 'shopping-cart', sortOrder: 0 },
    { id: 'transporte', name: 'Transporte', icon: 'navigation', sortOrder: 1 },
  ]),
  listMembers: jest.fn(async () => [
    { id: 'm-self', name: 'Wesley', isSelf: true },
    { id: 'm-ana', name: 'Ana', isSelf: false },
  ]),
}));

beforeEach(() => mockCreateExpense.mockClear());

function allText(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map(node =>
      ([] as unknown[])
        .concat(node.props.children)
        .filter(c => typeof c === 'string')
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
  await ReactTestRenderer.act(async () => {
    await target.props.onPress();
  });
}

async function type(root: ReactTestInstance, label: string, value: string) {
  const input = root.find(
    node => node.type === TextInput && node.props.accessibilityLabel === label,
  );
  await ReactTestRenderer.act(async () => input.props.onChangeText(value));
}

async function renderScreen(): Promise<Renderer> {
  let renderer: Renderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<NewExpense />);
  });
  return renderer as Renderer;
}

describe('Digitar gasto', () => {
  it('não salva sem valor e sem categoria', async () => {
    const renderer = await renderScreen();
    await press(renderer.root, 'Salvar gasto');

    const text = allText(renderer.root);
    expect(text).toContain('Informe um valor maior que zero.');
    expect(text).toContain('Escolha uma categoria.');
    expect(mockCreateExpense).not.toHaveBeenCalled();
  });

  it('salva um gasto pessoal seu por padrão e limpa o formulário', async () => {
    const renderer = await renderScreen();
    await type(renderer.root, 'Valor em reais', '45,90');
    await press(renderer.root, 'Mercado');
    await type(renderer.root, 'Descrição', 'Feira da semana');
    await press(renderer.root, 'Salvar gasto');

    expect(mockCreateExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 4590,
        categoryId: 'mercado',
        scope: 'personal',
        memberId: 'm-self',
        description: 'Feira da semana',
        source: 'manual',
        rawText: null,
      }),
    );
    expect(allText(renderer.root)).toContain('Salvo: R$ 45,90 em Mercado');

    const amount = renderer.root.find(
      node =>
        node.type === TextInput &&
        node.props.accessibilityLabel === 'Valor em reais',
    );
    expect(amount.props.value).toBe('');
  });

  it('salva como gasto da família e com outra data digitada', async () => {
    const renderer = await renderScreen();
    await type(renderer.root, 'Valor em reais', '120');
    await press(renderer.root, 'Transporte');
    await press(renderer.root, 'Família');
    await type(renderer.root, 'Outra data', '05/09/2026');
    await press(renderer.root, 'Salvar gasto');

    expect(mockCreateExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 12000,
        scope: 'family',
        memberId: null,
        date: '2026-09-05',
      }),
    );
  });

  it('recusa uma data digitada inválida', async () => {
    const renderer = await renderScreen();
    await type(renderer.root, 'Valor em reais', '10');
    await press(renderer.root, 'Mercado');
    await type(renderer.root, 'Outra data', '31/02/2026');
    await press(renderer.root, 'Salvar gasto');

    expect(allText(renderer.root)).toContain('Data inválida');
    expect(mockCreateExpense).not.toHaveBeenCalled();
  });
});
