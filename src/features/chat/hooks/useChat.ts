import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { interpretMessage } from '../../../ai/expensePipeline';
import { createExpense } from '../../../db/repositories/expensesRepository';
import { getSelfMemberId } from '../../../db/repositories/lookupsRepository';
import type { ExpenseDraft, ExpenseScope } from '../../expenses/types';
import { createLocalId } from '../../../utils/id';
import type { ChatMessage, ExpenseMessage } from '../types';

const GREETING =
  'Oi! Me conte um gasto do jeito que você falaria. Por exemplo: “gastei 45 no mercado ontem”.';

const NOT_UNDERSTOOD =
  'Não encontrei o valor nessa mensagem. Tente algo como “paguei 120 de luz” ou “uber 23,50”.';

type State = { messages: ChatMessage[] };

type Action =
  | { type: 'send'; text: string; now: Date }
  | { type: 'setScope'; id: string; scope: ExpenseScope }
  | { type: 'saving'; id: string; scope: ExpenseScope }
  | { type: 'saved'; id: string }
  | { type: 'saveFailed'; id: string; reason: string }
  | { type: 'startEdit'; id: string }
  | { type: 'cancelEdit'; id: string }
  | { type: 'saveEdit'; id: string; draft: ExpenseDraft };

function updateExpense(
  state: State,
  id: string,
  update: (message: ExpenseMessage) => ExpenseMessage,
): State {
  return {
    messages: state.messages.map(message =>
      message.kind === 'expense' && message.id === id
        ? update(message)
        : message,
    ),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'send': {
      const text = action.text.trim();
      if (!text) {
        return state;
      }
      const userMessage: ChatMessage = {
        kind: 'user',
        id: createLocalId('msg'),
        text,
      };
      const result = interpretMessage(text, action.now);
      const replies: ChatMessage[] =
        result.kind === 'expenses'
          ? result.drafts.map(draft => ({
              kind: 'expense',
              id: createLocalId('msg'),
              draft,
              status: 'pending',
              askScope: draft.scope === null,
              sourceText: text,
            }))
          : [
              {
                kind: 'assistant',
                id: createLocalId('msg'),
                text: NOT_UNDERSTOOD,
              },
            ];
      return { messages: [...state.messages, userMessage, ...replies] };
    }

    case 'setScope':
      return updateExpense(state, action.id, message => ({
        ...message,
        draft: { ...message.draft, scope: action.scope },
      }));

    case 'saving':
      return updateExpense(state, action.id, message => ({
        ...message,
        draft: { ...message.draft, scope: action.scope },
        status: 'saving',
      }));

    case 'saved':
      return updateExpense(state, action.id, message => ({
        ...message,
        status: 'saved',
      }));

    case 'saveFailed': {
      const reverted = updateExpense(state, action.id, message => ({
        ...message,
        status: 'pending',
      }));
      return {
        messages: [
          ...reverted.messages,
          {
            kind: 'assistant',
            id: createLocalId('msg'),
            text: `Não consegui salvar esse gasto. ${action.reason}`,
          },
        ],
      };
    }

    case 'startEdit':
      return updateExpense(state, action.id, message => ({
        ...message,
        status: 'editing',
      }));

    case 'cancelEdit':
      return updateExpense(state, action.id, message => ({
        ...message,
        status: 'pending',
      }));

    case 'saveEdit':
      return updateExpense(state, action.id, message => ({
        ...message,
        draft: action.draft,
        status: 'pending',
        askScope: false,
      }));
  }
}

const initialState: State = {
  messages: [{ kind: 'assistant', id: 'greeting', text: GREETING }],
};

/** Grava o gasto do cartão no banco local. "Meu" vira gasto pessoal seu. */
async function persist(message: ExpenseMessage, scope: ExpenseScope) {
  const { draft } = message;
  const memberId = scope === 'me' ? await getSelfMemberId() : null;
  if (scope === 'me' && !memberId) {
    throw new Error('O seu perfil ainda não foi criado no aparelho.');
  }
  await createExpense({
    amountCents: draft.amountCents,
    categoryId: draft.categoryId,
    date: draft.date,
    scope: scope === 'family' ? 'family' : 'personal',
    memberId,
    description: null,
    source: 'chat',
    rawText: message.sourceText,
  });
}

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useChat() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  // Evita gravar o mesmo cartão duas vezes com toques rápidos seguidos.
  const savingIds = useRef(new Set<string>());
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const send = useCallback(
    (text: string) => dispatch({ type: 'send', text, now: new Date() }),
    [],
  );

  const actions = useMemo(() => {
    const findPending = (id: string) =>
      stateRef.current.messages.find(
        (m): m is ExpenseMessage =>
          m.kind === 'expense' && m.id === id && m.status === 'pending',
      );

    const save = async (id: string, scope: ExpenseScope | null) => {
      const message = findPending(id);
      if (!message || !scope || savingIds.current.has(id)) {
        return;
      }
      savingIds.current.add(id);
      dispatch({ type: 'saving', id, scope });
      try {
        await persist(message, scope);
        dispatch({ type: 'saved', id });
      } catch (error) {
        dispatch({ type: 'saveFailed', id, reason: reasonOf(error) });
      } finally {
        savingIds.current.delete(id);
      }
    };

    return {
      setScope: (id: string, scope: ExpenseScope) =>
        dispatch({ type: 'setScope', id, scope }),
      /** Resposta da pergunta "seu ou da família?": já salva o gasto. */
      answerScope: (id: string, scope: ExpenseScope) => save(id, scope),
      confirm: (id: string) => save(id, findPending(id)?.draft.scope ?? null),
      startEdit: (id: string) => dispatch({ type: 'startEdit', id }),
      cancelEdit: (id: string) => dispatch({ type: 'cancelEdit', id }),
      saveEdit: (id: string, draft: ExpenseDraft) =>
        dispatch({ type: 'saveEdit', id, draft }),
    };
  }, []);

  return { messages: state.messages, send, actions };
}

export type ChatActions = ReturnType<typeof useChat>['actions'];
