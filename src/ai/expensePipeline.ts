import { DEFAULT_CATEGORY_ID } from '../features/expenses/categories';
import type { ExpenseDraft } from '../features/expenses/types';
import { createLocalId } from '../utils/id';
import { matchCategory } from './parsers/categoryMatcher';
import { parseDate } from './parsers/dateParser';
import { parseAmount } from './parsers/moneyParser';
import { parseScope } from './parsers/scopeParser';

export type InterpretResult =
  | { kind: 'expenses'; drafts: ExpenseDraft[] }
  | { kind: 'not-understood' };

/**
 * Separa "45 no mercado e 20 de uber" em partes. Só corta em "e" ou vírgula
 * quando logo depois vem um número, para não quebrar "vinte e três".
 */
function splitParts(text: string): string[] {
  return text
    .split(/\s+e\s+(?=(?:r\$\s*)?\d)|,\s+(?=(?:r\$\s*)?\d)|;\s*/i)
    .map(part => part.trim())
    .filter(Boolean);
}

/**
 * Interpreta a mensagem só com regras. O LLM local entra depois como
 * segunda tentativa, quando as regras não conseguirem montar o gasto.
 */
export function interpretMessage(
  text: string,
  now: Date = new Date(),
): InterpretResult {
  const wholeDate = parseDate(text, now);
  const wholeScope = parseScope(text);
  const parts = splitParts(text);
  const drafts: ExpenseDraft[] = [];

  for (const part of parts) {
    const amount = parseAmount(part);
    if (!amount || amount.cents <= 0) {
      continue;
    }
    const date = parseDate(part, now);
    const matched = matchCategory(part);
    drafts.push({
      id: createLocalId('draft'),
      amountCents: amount.cents,
      categoryId: matched ?? DEFAULT_CATEGORY_ID,
      categorySource: matched ? 'keyword' : 'default',
      date: date.found ? date.date : wholeDate.date,
      scope: parseScope(part) ?? wholeScope,
      description: part,
    });
  }

  return drafts.length > 0
    ? { kind: 'expenses', drafts }
    : { kind: 'not-understood' };
}
