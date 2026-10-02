import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import type { CategoryClassifier } from '../../../ai/refineWithAi';
import { useChat } from '../hooks/useChat';
import type { ChatMessage } from '../types';

jest.mock('../../../db/repositories/expensesRepository', () => ({
  createExpense: jest.fn(async () => 'id'),
}));
jest.mock('../../../db/repositories/lookupsRepository', () => ({
  getSelfMemberId: jest.fn(async () => 'm-self'),
}));

type Hook = ReturnType<typeof useChat>;

async function renderHook(classify: CategoryClassifier | null) {
  const ref: { current: Hook | null } = { current: null };
  function Probe() {
    ref.current = useChat({ classify });
    return null;
  }
  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<Probe />);
  });
  return ref;
}

const kinds = (messages: ChatMessage[]) => messages.map(m => m.kind);

describe('useChat com a IA', () => {
  it('mostra o indicador e depois o cartão com a categoria da IA', async () => {
    let resolveAi: (id: string) => void = () => undefined;
    const classify = jest.fn(
      () =>
        new Promise<string | null>(resolve => {
          resolveAi = resolve;
        }),
    );
    const hook = await renderHook(classify);

    let sending: Promise<void> = Promise.resolve();
    await ReactTestRenderer.act(async () => {
      sending = hook.current!.send('comprei maçã por 20');
    });
    expect(kinds(hook.current!.messages)).toEqual([
      'assistant',
      'user',
      'typing',
    ]);

    await ReactTestRenderer.act(async () => {
      resolveAi('mercado');
      await sending;
    });
    const last = hook.current!.messages[hook.current!.messages.length - 1];
    expect(kinds(hook.current!.messages)).toEqual([
      'assistant',
      'user',
      'expense',
    ]);
    expect(last.kind === 'expense' && last.draft).toMatchObject({
      amountCents: 2000,
      categoryId: 'mercado',
      categorySource: 'ai',
    });
  });

  it('não chama a IA quando a palavra-chave já resolve', async () => {
    const classify = jest.fn(async () => 'lazer');
    const hook = await renderHook(classify);
    await ReactTestRenderer.act(async () => {
      await hook.current!.send('uber 20');
    });
    expect(classify).not.toHaveBeenCalled();
    expect(kinds(hook.current!.messages)).toEqual([
      'assistant',
      'user',
      'expense',
    ]);
  });

  it('sem modelo, responde só com as regras', async () => {
    const hook = await renderHook(null);
    await ReactTestRenderer.act(async () => {
      await hook.current!.send('presente 70');
    });
    const last = hook.current!.messages[hook.current!.messages.length - 1];
    expect(last.kind === 'expense' && last.draft.categoryId).toBe('outros');
  });
});
