import {
  addMonths,
  dateInMonth,
  firstInvoiceMonth,
  monthLabel,
  scheduleBoletoInstallments,
  scheduleCardInstallments,
  splitAmount,
} from '../schedule';

describe('splitAmount', () => {
  it('divide igualmente e joga a sobra na última parcela', () => {
    expect(splitAmount(100000, 3)).toEqual([33333, 33333, 33334]);
    expect(splitAmount(120000, 10)).toEqual(Array(10).fill(12000));
    expect(splitAmount(500, 1)).toEqual([500]);
    expect(splitAmount(100000, 3).reduce((a, b) => a + b)).toBe(100000);
  });
});

describe('datas', () => {
  it('soma meses atravessando o ano', () => {
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('limita o dia ao fim do mês', () => {
    expect(dateInMonth('2026-02', 31)).toBe('2026-02-28');
    expect(dateInMonth('2028-02', 30)).toBe('2028-02-29');
    expect(dateInMonth('2026-10', 5)).toBe('2026-10-05');
  });

  it('nomeia o mês', () => {
    expect(monthLabel('2026-10')).toBe('Outubro 2026');
  });
});

describe('firstInvoiceMonth', () => {
  // Cartão que fecha dia 3 e vence dia 10: vence no mesmo mês em que fecha.
  it('fecha 3, vence 10', () => {
    expect(firstInvoiceMonth('2026-10-02', 3, 10)).toBe('2026-10');
    expect(firstInvoiceMonth('2026-10-03', 3, 10)).toBe('2026-11');
    expect(firstInvoiceMonth('2026-10-20', 3, 10)).toBe('2026-11');
  });

  // Cartão que fecha dia 28 e vence dia 5: vence no mês seguinte ao fechamento.
  it('fecha 28, vence 5', () => {
    expect(firstInvoiceMonth('2026-10-10', 28, 5)).toBe('2026-11');
    expect(firstInvoiceMonth('2026-10-28', 28, 5)).toBe('2026-12');
    expect(firstInvoiceMonth('2026-12-30', 28, 5)).toBe('2027-02');
  });
});

describe('parcelas', () => {
  it('3x e 4x no mesmo cartão geram 4 faturas de valores diferentes', () => {
    const card = { purchaseDate: '2026-10-02', closingDay: 3, dueDay: 10 };
    const tv = scheduleCardInstallments({
      ...card,
      totalCents: 90000,
      count: 3,
    });
    const sofa = scheduleCardInstallments({
      ...card,
      totalCents: 40000,
      count: 4,
    });

    const totals = new Map<string, number>();
    for (const i of [...tv, ...sofa]) {
      totals.set(
        i.referenceMonth,
        (totals.get(i.referenceMonth) ?? 0) + i.amountCents,
      );
    }
    expect([...totals.entries()]).toEqual([
      ['2026-10', 40000],
      ['2026-11', 40000],
      ['2026-12', 40000],
      ['2027-01', 10000],
    ]);
    expect(tv[0]).toMatchObject({ number: 1, dueDate: '2026-10-10' });
  });

  it('boleto parcelado vence todo mês no mesmo dia', () => {
    expect(
      scheduleBoletoInstallments({
        totalCents: 30000,
        count: 3,
        firstDueDate: '2026-11-30',
      }).map(i => i.dueDate),
    ).toEqual(['2026-11-30', '2026-12-30', '2027-01-30']);
  });
});
