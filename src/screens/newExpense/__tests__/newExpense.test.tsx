import React from 'react';
import { Platform, Text, TextInput } from 'react-native';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
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
    await type(renderer.root, 'Outra data', '05092026');
    const dateInput = renderer.root.find(
      node =>
        node.type === TextInput &&
        node.props.accessibilityLabel === 'Outra data',
    );
    expect(dateInput.props.value).toBe('05/09/2026');
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

  it('abre o calendário e usa a data escolhida', async () => {
    const renderer = await renderScreen();
    await type(renderer.root, 'Valor em reais', '30');
    await press(renderer.root, 'Mercado');

    const calendarButton = renderer.root.find(
      node =>
        node.props.accessibilityLabel === 'Abrir calendário' &&
        typeof node.props.onPress === 'function',
    );
    await ReactTestRenderer.act(async () => calendarButton.props.onPress());

    const picker = renderer.root.find(
      node =>
        typeof node.props.onValueChange === 'function' &&
        node.props.mode === 'date',
    );
    await ReactTestRenderer.act(async () =>
      picker.props.onValueChange({}, new Date(2026, 8, 12)),
    );
    await press(renderer.root, 'Salvar gasto');

    expect(mockCreateExpense).toHaveBeenCalledWith(
      expect.objectContaining({ date: '2026-09-12' }),
    );
  });

  it('no Android, abre o diálogo nativo de data', async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, 'OS', {
      value: 'android',
      configurable: true,
    });
    const open = jest
      .spyOn(DateTimePickerAndroid, 'open')
      .mockImplementation(params =>
        params.onValueChange?.({} as never, new Date(2026, 8, 3)),
      );
    try {
      const renderer = await renderScreen();
      await type(renderer.root, 'Valor em reais', '30');
      await press(renderer.root, 'Mercado');
      const calendarButton = renderer.root.find(
        node =>
          node.props.accessibilityLabel === 'Abrir calendário' &&
          typeof node.props.onPress === 'function',
      );
      await ReactTestRenderer.act(async () => calendarButton.props.onPress());
      await press(renderer.root, 'Salvar gasto');

      expect(open).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'date' }),
      );
      expect(mockCreateExpense).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2026-09-03' }),
      );
    } finally {
      open.mockRestore();
      Object.defineProperty(Platform, 'OS', {
        value: originalOS,
        configurable: true,
      });
    }
  });
});
