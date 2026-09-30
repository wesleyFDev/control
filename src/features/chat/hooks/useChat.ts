import { useCallback, useMemo, useReducer } from 'react';

import { interpretMessage } from '../../../ai/expensePipeline';
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
  | { type: 'answerScope'; id: string; scope: ExpenseScope }
  | { type: 'confirm'; id: string }
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

    case 'answerScope':
      return updateExpense(state, action.id, message => ({
        ...message,
        draft: { ...message.draft, scope: action.scope },
        status: 'saved',
      }));

    case 'confirm':
      return updateExpense(state, action.id, message =>
        message.draft.scope ? { ...message, status: 'saved' } : message,
      );

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

export function useChat() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const send = useCallback(
    (text: string) => dispatch({ type: 'send', text, now: new Date() }),
    [],
  );

  const actions = useMemo(
    () => ({
      setScope: (id: string, scope: ExpenseScope) =>
        dispatch({ type: 'setScope', id, scope }),
      answerScope: (id: string, scope: ExpenseScope) =>
        dispatch({ type: 'answerScope', id, scope }),
      confirm: (id: string) => dispatch({ type: 'confirm', id }),
      startEdit: (id: string) => dispatch({ type: 'startEdit', id }),
      cancelEdit: (id: string) => dispatch({ type: 'cancelEdit', id }),
      saveEdit: (id: string, draft: ExpenseDraft) =>
        dispatch({ type: 'saveEdit', id, draft }),
    }),
    [],
  );

  const savedExpenses = useMemo(
    () =>
      state.messages
        .filter(
          (m): m is ExpenseMessage =>
            m.kind === 'expense' && m.status === 'saved',
        )
        .map(m => m.draft),
    [state.messages],
  );

  return { messages: state.messages, savedExpenses, send, actions };
}

export type ChatActions = ReturnType<typeof useChat>['actions'];
