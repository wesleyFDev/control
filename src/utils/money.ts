/** Formata centavos no padrão brasileiro: 421840 -> "R$ 4.218,40". */
export function formatBRL(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const reais = Math.floor(abs / 100);
  const centavos = abs % 100;
  const reaisText = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}R$ ${reaisText},${String(centavos).padStart(2, '0')}`;
}

/** Converte o que o usuário digitou ("87,50", "1.200", "12.5") em centavos. */
export function parseBRLInput(input: string): number | null {
  const clean = input.replace(/[^\d.,]/g, '');
  if (!clean) {
    return null;
  }
  const match = clean.match(/^(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,](\d{1,2}))?$/);
  if (!match) {
    return null;
  }
  const reais = Number(match[1].replace(/\./g, ''));
  const centavos = match[2] ? Number(match[2].padEnd(2, '0')) : 0;
  return reais * 100 + centavos;
}

/** Centavos para o texto de um campo editável: 8750 -> "87,50". */
export function centsToInput(cents: number): string {
  return formatBRL(cents).replace('R$ ', '');
}
