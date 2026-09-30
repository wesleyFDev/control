import type { ExpenseScope } from '../../features/expenses/types';
import { normalize } from './normalize';

const FAMILY =
  /(^|[^a-z])(familia|nosso|nossa|nossos|nossas|da gente|das criancas|dos filhos|(da|de|pra|para a|pro) casa)(?![a-z])/;
const ME =
  /(^|[^a-z])(meu|minha|meus|minhas|pra mim|para mim|pessoal)(?![a-z])/;

/** Decide se o gasto é do usuário ou da família. null quando não dá para saber. */
export function parseScope(text: string): ExpenseScope | null {
  const t = normalize(text);
  if (FAMILY.test(t)) {
    return 'family';
  }
  if (ME.test(t)) {
    return 'me';
  }
  return null;
}
