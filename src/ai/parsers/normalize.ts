/** Minúsculas e sem acentos, para comparar palavras com segurança. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Procura uma palavra inteira no texto normalizado e devolve a posição. */
export function findWord(normalizedText: string, word: string): number {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(^|[^a-z0-9])${escaped}(?![a-z0-9])`).exec(
    normalizedText,
  );
  return match ? match.index + match[1].length : -1;
}
