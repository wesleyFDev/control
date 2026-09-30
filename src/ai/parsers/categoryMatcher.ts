import {
  CATEGORIES,
  type CategoryId,
} from '../../features/expenses/categories';
import { findWord, normalize } from './normalize';

/** Devolve a categoria cuja palavra-chave aparece primeiro na frase. */
export function matchCategory(text: string): CategoryId | null {
  const t = normalize(text);
  let best: { id: CategoryId; index: number } | null = null;

  for (const category of CATEGORIES) {
    for (const keyword of category.keywords) {
      const index = findWord(t, keyword);
      if (index >= 0 && (!best || index < best.index)) {
        best = { id: category.id, index };
      }
    }
  }

  return best?.id ?? null;
}
