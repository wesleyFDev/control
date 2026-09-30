import { normalize } from './normalize';

const UNITS: Record<string, number> = {
  zero: 0,
  um: 1,
  uma: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  catorze: 14,
  quatorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
  cem: 100,
  cento: 100,
  duzentos: 200,
  duzentas: 200,
  trezentos: 300,
  trezentas: 300,
  quatrocentos: 400,
  quatrocentas: 400,
  quinhentos: 500,
  quinhentas: 500,
  seiscentos: 600,
  seiscentas: 600,
  setecentos: 700,
  setecentas: 700,
  oitocentos: 800,
  oitocentas: 800,
  novecentos: 900,
  novecentas: 900,
};

const CURRENCY_WORDS = /^(reais|real|conto|contos|pila|pilas)$/;
const CENTS_WORDS = /^centavos?$/;

export type AmountMatch = {
  cents: number;
  start: number;
  end: number;
};

/**
 * Extrai o valor de uma frase em centavos.
 * Aceita "87,50", "R$ 12,90", "1.200", "12.5" e "vinte e três reais".
 */
export function parseAmount(text: string): AmountMatch | null {
  const normalized = normalize(text);
  return parseDigits(normalized) ?? parseWords(normalized);
}

function parseDigits(text: string): AmountMatch | null {
  const regex =
    /(r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:[,.](\d{1,2}))?(?![\d/])(\s*(?:reais|real|contos?|pilas?)(?![a-z]))?/g;
  const candidates: (AmountMatch & { strong: boolean })[] = [];

  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    const before = text.slice(0, match.index);
    const isDate = /(dia\s*|\/)$/.test(before);
    if (isDate) {
      continue;
    }
    const reais = Number(match[2].replace(/\./g, ''));
    const centavos = match[3] ? Number(match[3].padEnd(2, '0')) : 0;
    candidates.push({
      cents: reais * 100 + centavos,
      start: match.index,
      end: match.index + match[0].length,
      strong: Boolean(match[1] || match[3] || match[4]),
    });
  }

  const chosen = candidates.find(c => c.strong) ?? candidates[0];
  return chosen
    ? { cents: chosen.cents, start: chosen.start, end: chosen.end }
    : null;
}

type Token = { word: string; start: number; end: number };

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const regex = /[a-z]+/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    tokens.push({
      word: match[0],
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return tokens;
}

/** Lê uma sequência como "trezentos e vinte e cinco" a partir de tokens[i]. */
function readNumber(
  tokens: Token[],
  i: number,
): { value: number; next: number } | null {
  let total = 0;
  let current = 0;
  let j = i;
  let read = false;

  while (j < tokens.length) {
    const word = tokens[j].word;
    if (word in UNITS) {
      current += UNITS[word];
      read = true;
      j += 1;
    } else if (word === 'mil') {
      total += (current || 1) * 1000;
      current = 0;
      read = true;
      j += 1;
    } else if (
      word === 'e' &&
      read &&
      j + 1 < tokens.length &&
      tokens[j + 1].word in UNITS
    ) {
      j += 1;
    } else {
      break;
    }
  }

  return read ? { value: total + current, next: j } : null;
}

function parseWords(text: string): AmountMatch | null {
  const tokens = tokenize(text);

  for (let i = 0; i < tokens.length; i += 1) {
    const number = readNumber(tokens, i);
    if (!number) {
      continue;
    }

    const after = tokens[number.next];
    const hasCurrency = Boolean(after && CURRENCY_WORDS.test(after.word));
    const isCents = Boolean(after && CENTS_WORDS.test(after.word));
    const loneArticle =
      number.next === i + 1 && /^(um|uma)$/.test(tokens[i].word);

    if (isCents) {
      return { cents: number.value, start: tokens[i].start, end: after.end };
    }
    if (loneArticle && !hasCurrency) {
      // "comprei um lanche": "um" aqui é artigo, não valor.
      continue;
    }

    let cents = number.value * 100;
    let end = hasCurrency ? after.end : tokens[number.next - 1].end;
    const k = hasCurrency ? number.next + 1 : number.next;

    // "vinte reais e cinquenta centavos"
    if (hasCurrency && tokens[k]?.word === 'e') {
      const centsNumber = readNumber(tokens, k + 1);
      const centsWord = centsNumber ? tokens[centsNumber.next] : undefined;
      if (centsNumber && centsWord && CENTS_WORDS.test(centsWord.word)) {
        cents += centsNumber.value;
        end = centsWord.end;
      }
    }

    return { cents, start: tokens[i].start, end };
  }

  return null;
}
