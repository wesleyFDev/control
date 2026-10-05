import type { ISODate } from '../../utils/dates';

/** Mês no formato AAAA-MM. Identifica a fatura de um cartão. */
export type YearMonth = string;

export function toYearMonth(year: number, monthIndex: number): YearMonth {
  const date = new Date(year, monthIndex, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0',
  )}`;
}

export function addMonths(month: YearMonth, count: number): YearMonth {
  const [year, monthNumber] = month.split('-').map(Number);
  return toYearMonth(year, monthNumber - 1 + count);
}

/** Dia do mês, limitado ao último dia: dia 31 em fevereiro vira 28 ou 29. */
export function dateInMonth(month: YearMonth, day: number): ISODate {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const safeDay = Math.min(Math.max(day, 1), lastDay);
  return `${month}-${String(safeDay).padStart(2, '0')}`;
}

/**
 * Divide o total em parcelas iguais, em centavos. A sobra da divisão vai
 * para a última, para a soma bater com o total: 1000 em 3x vira 333, 333 e 334.
 */
export function splitAmount(totalCents: number, count: number): number[] {
  const base = Math.floor(totalCents / count);
  const parts = Array.from({ length: count }, () => base);
  parts[count - 1] += totalCents - base * count;
  return parts;
}

/**
 * Mês da fatura em que uma compra no cartão cai pela primeira vez.
 *
 * - Compra antes do dia de fechamento entra na fatura que fecha naquele mês.
 *   No dia do fechamento ou depois, entra na que fecha no mês seguinte.
 * - A fatura é identificada pelo mês do vencimento. Se o vencimento vem
 *   depois do fechamento no calendário (fecha 3, vence 10), vence no mesmo
 *   mês em que fecha. Se vem antes ou no mesmo dia (fecha 28, vence 5),
 *   vence no mês seguinte.
 */
export function firstInvoiceMonth(
  purchaseDate: ISODate,
  closingDay: number,
  dueDay: number,
): YearMonth {
  const [year, month, day] = purchaseDate.split('-').map(Number);
  const closingMonthOffset = day >= closingDay ? 1 : 0;
  const dueOffset = dueDay > closingDay ? 0 : 1;
  return toYearMonth(year, month - 1 + closingMonthOffset + dueOffset);
}

export type ScheduledInstallment = {
  number: number;
  amountCents: number;
  /** Mês da fatura (cartão) ou do vencimento (boleto). */
  referenceMonth: YearMonth;
  dueDate: ISODate;
};

/** Parcelas de uma compra no cartão, cada uma na fatura de um mês. */
export function scheduleCardInstallments(input: {
  totalCents: number;
  count: number;
  purchaseDate: ISODate;
  closingDay: number;
  dueDay: number;
}): ScheduledInstallment[] {
  const first = firstInvoiceMonth(
    input.purchaseDate,
    input.closingDay,
    input.dueDay,
  );
  return splitAmount(input.totalCents, input.count).map((amountCents, i) => {
    const referenceMonth = addMonths(first, i);
    return {
      number: i + 1,
      amountCents,
      referenceMonth,
      dueDate: dateInMonth(referenceMonth, input.dueDay),
    };
  });
}

/** Parcelas de um boleto ou carnê: uma por mês, a partir do primeiro vencimento. */
export function scheduleBoletoInstallments(input: {
  totalCents: number;
  count: number;
  firstDueDate: ISODate;
}): ScheduledInstallment[] {
  const firstMonth = input.firstDueDate.slice(0, 7);
  const day = Number(input.firstDueDate.slice(8, 10));
  return splitAmount(input.totalCents, input.count).map((amountCents, i) => {
    const referenceMonth = addMonths(firstMonth, i);
    return {
      number: i + 1,
      amountCents,
      referenceMonth,
      dueDate: dateInMonth(referenceMonth, day),
    };
  });
}

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export function monthLabel(month: YearMonth): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${MONTHS[monthNumber - 1]} ${year}`;
}
