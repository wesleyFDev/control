import type { ExpenseDraft } from '../expenses/types';

export type ExpenseCardStatus = 'pending' | 'editing' | 'saving' | 'saved';

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
      /** Mensagem do usuário que gerou o gasto. Vai para o banco como raw_text. */
      sourceText: string;
    };

export type ExpenseMessage = Extract<ChatMessage, { kind: 'expense' }>;
