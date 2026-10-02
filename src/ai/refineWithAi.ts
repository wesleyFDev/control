import type { ExpenseDraft } from '../features/expenses/types';
import { aiLog, aiWarn, startTimer } from './aiLog';

/** Recebe o trecho da frase de um gasto e devolve o id da categoria, ou null. */
export type CategoryClassifier = (text: string) => Promise<string | null>;

/** Gastos em que as regras não acharam palavra-chave e a IA pode ajudar. */
export function needsAiCategory(drafts: ExpenseDraft[]): boolean {
  return drafts.some(draft => draft.categorySource === 'default');
}

/**
 * Segunda passada sobre os gastos montados pelas regras: só a categoria
 * dos que caíram em "Outros" por falta de palavra-chave é decidida pela IA.
 * Se a IA falhar ou demorar demais, o gasto fica como as regras montaram.
 */
export async function refineWithAi(
  drafts: ExpenseDraft[],
  classify: CategoryClassifier,
  timeoutMs = 45000,
): Promise<ExpenseDraft[]> {
  const refined: ExpenseDraft[] = [];
  aiLog(`refino: ${drafts.length} gasto(s) vindos das regras`);
  for (const [index, draft] of drafts.entries()) {
    const label = `refino: gasto ${index + 1}/${drafts.length} "${
      draft.description
    }"`;
    if (draft.categorySource !== 'default') {
      aiLog(
        `${label} já tem categoria pela palavra-chave (${draft.categoryId}), pulando a IA`,
      );
      refined.push(draft);
      continue;
    }
    aiLog(`${label} sem palavra-chave, chamando a IA`);
    const elapsed = startTimer();
    try {
      const categoryId = await withTimeout(
        classify(draft.description),
        timeoutMs,
      );
      if (categoryId) {
        aiLog(`${label} -> ${categoryId} em ${elapsed()} ms`);
        refined.push({ ...draft, categoryId, categorySource: 'ai' });
      } else {
        aiLog(
          `${label} a IA não deu uma categoria válida, fica "${draft.categoryId}"`,
        );
        refined.push(draft);
      }
    } catch (error) {
      aiWarn(
        `${label} falhou depois de ${elapsed()} ms, fica "${draft.categoryId}"`,
        error,
      );
      refined.push(draft);
    }
  }
  return refined;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('A IA demorou demais para responder.')),
      ms,
    );
    promise.then(
      value => {
        clearTimeout(timer);
        resolve(value);
      },
      error => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}
