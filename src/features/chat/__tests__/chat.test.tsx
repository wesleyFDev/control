import React from 'react';
import { Text, TextInput } from 'react-native';
import ReactTestRenderer, {
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import Chat from '../../../screens/chat/chat';

jest.mock('@react-navigation/native', () => ({
  DrawerActions: { openDrawer: () => ({ type: 'OPEN_DRAWER' }) },
  useNavigation: () => ({ dispatch: jest.fn() }),
}));

const mockCreateExpense = jest.fn(async (_input: unknown) => 'new-id');

jest.mock('../../../db/repositories/expensesRepository', () => ({
  createExpense: (input: unknown) => mockCreateExpense(input),
}));

jest.mock('../../../db/repositories/lookupsRepository', () => ({
  getSelfMemberId: jest.fn(async () => 'm-self'),
}));

beforeEach(() => mockCreateExpense.mockClear());

function allText(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map(node => {
      const children = ([] as unknown[]).concat(node.props.children);
      return children.filter(c => typeof c === 'string').join('');
    })
    .join('\n');
}

async function pressByText(root: ReactTestInstance, label: string) {
  const target = root.find(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAllByType(Text).some(t => t.props.children === label),
  );
  await ReactTestRenderer.act(async () => {
    await target.props.onPress();
  });
}

async function sendMessage(renderer: Renderer, text: string) {
  const input = renderer.root.findByType(TextInput);
  await ReactTestRenderer.act(() => input.props.onChangeText(text));
  const sendButton = renderer.root.find(
    node =>
      node.props.accessibilityLabel === 'Enviar' &&
      typeof node.props.onPress === 'function',
  );
  await ReactTestRenderer.act(() => sendButton.props.onPress());
}

let mounted: Renderer | undefined;

async function renderChat(): Promise<Renderer> {
  await ReactTestRenderer.act(() => {
    mounted = ReactTestRenderer.create(<Chat />);
  });
  return mounted as Renderer;
}

afterEach(async () => {
  // Desmonta dentro do act para a FlatList não atualizar depois do teste.
  await ReactTestRenderer.act(async () => {
    mounted?.unmount();
    await new Promise<void>(resolve => setTimeout(resolve, 0));
  });
  mounted = undefined;
});

describe('Chat', () => {
  it('mostra o cartão de confirmação e salva ao confirmar', async () => {
    const renderer = await renderChat();
    await sendMessage(renderer, 'gastei 87,50 no mercado, compra da casa');

    const text = allText(renderer.root);
    expect(text).toContain('Entendi este gasto:');
    expect(text).toContain('R$ 87,50');
    expect(text).toContain('Mercado');

    await pressByText(renderer.root, 'Confirmar');
    expect(allText(renderer.root)).toContain('Salvo: R$ 87,50 em Mercado');
    expect(mockCreateExpense).toHaveBeenCalledTimes(1);
    expect(mockCreateExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 8750,
        categoryId: 'mercado',
        scope: 'family',
        memberId: null,
        source: 'chat',
        rawText: 'gastei 87,50 no mercado, compra da casa',
      }),
    );
  });

  it('pergunta o tipo quando a frase não diz e salva com a resposta', async () => {
    const renderer = await renderChat();
    await sendMessage(renderer, 'corrida pro trabalho, vinte e três reais');

    expect(allText(renderer.root)).toContain('Foi um gasto seu ou da família?');

    await pressByText(renderer.root, 'Meu');
    expect(allText(renderer.root)).toContain(
      'Salvo: R$ 23,00 em Transporte, meu',
    );
    expect(mockCreateExpense).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 2300,
        categoryId: 'transporte',
        scope: 'personal',
        memberId: 'm-self',
      }),
    );
  });

  it('avisa e deixa confirmar de novo quando o banco falha', async () => {
    mockCreateExpense.mockRejectedValueOnce(new Error('disco cheio'));
    const renderer = await renderChat();
    await sendMessage(renderer, 'mercado 50 da família');

    await pressByText(renderer.root, 'Confirmar');
    const text = allText(renderer.root);
    expect(text).toContain('Não consegui salvar esse gasto. disco cheio');
    expect(text).not.toContain('Salvo:');

    await pressByText(renderer.root, 'Confirmar');
    expect(allText(renderer.root)).toContain('Salvo: R$ 50,00 em Mercado');
  });

  it('responde quando não encontra valor', async () => {
    const renderer = await renderChat();
    await sendMessage(renderer, 'oi, tudo bem?');
    expect(allText(renderer.root)).toContain('Não encontrei o valor');
  });

  it('permite corrigir o valor antes de confirmar', async () => {
    const renderer = await renderChat();
    await sendMessage(renderer, 'mercado 50 da família');

    await pressByText(renderer.root, 'Editar');
    const amountInput = renderer.root.find(
      node =>
        node.type === TextInput &&
        node.props.accessibilityLabel === 'Valor em reais',
    );
    await ReactTestRenderer.act(() => amountInput.props.onChangeText('62,30'));
    await pressByText(renderer.root, 'Salvar');
    await pressByText(renderer.root, 'Confirmar');

    expect(allText(renderer.root)).toContain('Salvo: R$ 62,30 em Mercado');
  });
});
