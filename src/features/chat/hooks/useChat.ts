import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';

import { aiLog, startTimer } from '../../../ai/aiLog';
import { interpretMessage } from '../../../ai/expensePipeline';
import {
  needsAiCategory,
  refineWithAi,
  type CategoryClassifier,
} from '../../../ai/refineWithAi';
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
  | { type: 'append'; messages: ChatMessage[] }
  | { type: 'replace'; id: string; messages: ChatMessage[] }
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
    case 'append':
      return { messages: [...state.messages, ...action.messages] };

    case 'replace':
      return {
        messages: state.messages.flatMap(message =>
          message.id === action.id ? action.messages : [message],
        ),
      };

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

/** Cartões de gasto, ou o aviso de que não encontrou valor. */
function repliesFor(
  result: ReturnType<typeof interpretMessage>,
  sourceText: string,
): ChatMessage[] {
  if (result.kind !== 'expenses') {
    return [
      { kind: 'assistant', id: createLocalId('msg'), text: NOT_UNDERSTOOD },
    ];
  }
  return result.drafts.map(draft => ({
    kind: 'expense',
    id: createLocalId('msg'),
    draft,
    status: 'pending',
    askScope: draft.scope === null,
    sourceText,
  }));
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

type UseChatOptions = {
  /** Classificador de categoria da IA. Sem ele, o chat usa só as regras. */
  classify?: CategoryClassifier | null;
};

export function useChat({ classify = null }: UseChatOptions = {}) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  // Evita gravar o mesmo cartão duas vezes com toques rápidos seguidos.
  const savingIds = useRef(new Set<string>());
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const classifyRef = useRef(classify);
  useEffect(() => {
    classifyRef.current = classify;
  }, [classify]);

  /**
   * As regras montam o gasto na hora. Se alguma categoria ficar em "Outros"
   * por falta de palavra-chave e a IA estiver disponível, um indicador
   * aparece enquanto a IA escolhe a categoria.
   */
  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    const userMessage: ChatMessage = {
      kind: 'user',
      id: createLocalId('msg'),
      text: trimmed,
    };
    aiLog(`chat: mensagem recebida "${trimmed}"`);
    const result = interpretMessage(trimmed, new Date());
    aiLog(
      'chat: resultado das regras',
      result.kind === 'expenses'
        ? result.drafts.map(d => ({
            trecho: d.description,
            valorCentavos: d.amountCents,
            categoria: d.categoryId,
            origemCategoria: d.categorySource,
            data: d.date,
            tipo: d.scope,
          }))
        : 'nenhum valor encontrado',
    );
    const classifier = classifyRef.current;

    if (
      result.kind !== 'expenses' ||
      !classifier ||
      !needsAiCategory(result.drafts)
    ) {
      aiLog(
        result.kind !== 'expenses'
          ? 'chat: sem gasto, respondendo com a dica'
          : !classifier
          ? 'chat: sem IA disponível, mostrando o resultado das regras'
          : 'chat: regras resolveram tudo, a IA não foi chamada',
      );
      dispatch({
        type: 'append',
        messages: [userMessage, ...repliesFor(result, trimmed)],
      });
      return;
    }

    aiLog('chat: chamando a IA para as categorias que faltam');
    const elapsed = startTimer();
    const typingId = createLocalId('msg');
    dispatch({
      type: 'append',
      messages: [userMessage, { kind: 'typing', id: typingId }],
    });
    const drafts = await refineWithAi(result.drafts, classifier);
    aiLog(
      `chat: IA terminou em ${elapsed()} ms`,
      drafts.map(d => d.categoryId),
    );
    dispatch({
      type: 'replace',
      id: typingId,
      messages: repliesFor({ kind: 'expenses', drafts }, trimmed),
    });
  }, []);

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
