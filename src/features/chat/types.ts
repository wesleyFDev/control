import type { ExpenseDraft } from '../expenses/types';

export type ExpenseCardStatus = 'pending' | 'editing' | 'saved';

export type ChatMessage =
  | { kind: 'user'; id: string; text: string }
  | { kind: 'assistant'; id: string; text: string }
  | {
      kind: 'expense';
      id: string;
      draft: ExpenseDraft;
      status: ExpenseCardStatus;
      /**
       * true quando a frase não disse se o gasto é "meu" ou da "família".
       * Nesse caso o app só pergunta o tipo, e a resposta já salva.
       */
      askScope: boolean;
    };

export type ExpenseMessage = Extract<ChatMessage, { kind: 'expense' }>;
