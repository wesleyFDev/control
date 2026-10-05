import { matchCategory } from '../../ai/parsers/categoryMatcher';
import { parseAmount } from '../../ai/parsers/moneyParser';
import { normalize } from '../../ai/parsers/normalize';

export type ParsedNotification =
  | {
      expense: true;
      amountCents: number;
      merchant: string | null;
      categoryId: string | null;
    }
  | { expense: false; reason: string; amountCents: number | null };

/** Notificações que mencionam dinheiro mas não são gasto. */
const NOT_EXPENSE: [RegExp, string][] = [
  [/\b(negad|recusad|nao aprovad|bloquead)/, 'Compra negada'],
  [
    /\b(recebid|recebeu|voce recebeu|caiu na sua conta|deposito)/,
    'Entrada de dinheiro',
  ],
  [/\b(estorn|reembols|cashback|devolu)/, 'Estorno ou cashback'],
  [/\bfatura\b/, 'Aviso de fatura: as compras do cartão já contam'],
  [
    /\b(limite disponivel|saldo disponivel|seu saldo)/,
    'Aviso de saldo ou limite',
  ],
  [/\b(codigo|token|senha)\b/, 'Código de segurança'],
  [/\b(agendad|vence|vencimento|lembrete)/, 'Agendamento ou lembrete'],
];

/** Palavras que indicam que o dinheiro saiu. */
const SPENT =
  /\b(compra|aprovad|pagamento|pagou|pago|paga|debito|debitad|pix enviado|voce enviou|enviou|transferencia enviada|transferiu|saque|gastou)/;

/**
 * Nome do estabelecimento: o trecho depois de "em", "no estabelecimento"
 * ou "para", até o fim da frase. Ex.: "R$ 45,90 em IFOOD *RESTAURANTE".
 */
function extractMerchant(text: string): string | null {
  const match = text.match(
    /(?:\bem\b|\bno estabelecimento\b|\bpara\b)\s+([^.,;\n]+?)(?=\s+(?:para o|no cart|com o cart|final\s+\d)|[.,;\n]|$)/i,
  );
  if (!match) {
    return null;
  }
  const merchant = match[1].trim().replace(/\s+/g, ' ');
  // "em 02/10" ou "para o cartão" não são estabelecimento.
  if (/^\d/.test(merchant) || /^(o|a|seu|sua)\b/i.test(merchant)) {
    return null;
  }
  return merchant.slice(0, 60);
}

/**
 * Interpreta a notificação de um app de banco só com regras.
 * O valor só é aceito com "R$" na frase, para códigos de verificação e
 * números de cartão não virarem gasto.
 */
export function parseNotification(
  title: string,
  text: string,
): ParsedNotification {
  const full = `${title}. ${text}`;
  const t = normalize(full);
  const amount = /r\$\s*\d/i.test(full) ? parseAmount(full) : null;
  const amountCents = amount?.cents ?? null;

  for (const [pattern, reason] of NOT_EXPENSE) {
    if (pattern.test(t)) {
      return { expense: false, reason, amountCents };
    }
  }
  if (!amountCents) {
    return { expense: false, reason: 'Sem valor em reais', amountCents: null };
  }
  if (!SPENT.test(t)) {
    return {
      expense: false,
      reason: 'Não parece uma saída de dinheiro',
      amountCents,
    };
  }

  const merchant = extractMerchant(text) ?? extractMerchant(title);
  return {
    expense: true,
    amountCents,
    merchant,
    categoryId: matchCategory(merchant ?? full),
  };
}
