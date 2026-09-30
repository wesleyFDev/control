import { interpretMessage } from '../../expensePipeline';
import { matchCategory } from '../categoryMatcher';
import { parseDate } from '../dateParser';
import { parseAmount } from '../moneyParser';
import { parseScope } from '../scopeParser';

// Quarta-feira, 30 de setembro de 2026.
const NOW = new Date(2026, 8, 30, 10, 0, 0);

describe('parseAmount', () => {
  it.each([
    ['gastei 87,50 no mercado', 8750],
    ['R$ 12,90 de pão', 1290],
    ['paguei 45 no uber', 4500],
    ['aluguel 1.200', 120000],
    ['aluguel 1.200,50', 120050],
    ['lanche 12.5', 1250],
    ['vinte e três reais de corrida', 2300],
    ['cinquenta reais na farmácia', 5000],
    ['trezentos e vinte e cinco reais', 32500],
    ['dois mil reais de aluguel', 200000],
    ['vinte reais e cinquenta centavos', 2050],
    ['50 conto no bar', 5000],
  ])('"%s" -> %i centavos', (text, cents) => {
    expect(parseAmount(text)?.cents).toBe(cents);
  });

  it('ignora números que são datas', () => {
    expect(parseAmount('dia 10 paguei 30 de luz')?.cents).toBe(3000);
    expect(parseAmount('10/09 mercado 80')?.cents).toBe(8000);
  });

  it('não trata "um" como valor', () => {
    expect(parseAmount('comprei um lanche de 20')?.cents).toBe(2000);
    expect(parseAmount('comprei um lanche')).toBeNull();
  });
});

describe('parseDate', () => {
  it.each([
    ['gastei 10 hoje', '2026-09-30'],
    ['gastei 10 ontem', '2026-09-29'],
    ['gastei 10 anteontem', '2026-09-28'],
    ['sexta paguei 10', '2026-09-25'],
    ['segunda-feira 10 de uber', '2026-09-28'],
    ['dia 10 paguei a luz', '2026-09-10'],
    ['dia 31 mercado', '2026-08-31'],
    ['15/09 farmácia 30', '2026-09-15'],
  ])('"%s" -> %s', (text, iso) => {
    expect(parseDate(text, NOW)).toEqual({ date: iso, found: true });
  });

  it('usa hoje quando a frase não fala de data', () => {
    expect(parseDate('mercado 50', NOW)).toEqual({
      date: '2026-09-30',
      found: false,
    });
  });
});

describe('matchCategory', () => {
  it.each([
    ['gastei 87,50 no mercado', 'mercado'],
    ['corrida pro trabalho', 'transporte'],
    ['uber 20', 'transporte'],
    ['conta de luz', 'casa'],
    ['remédio na farmácia', 'saude'],
    ['almoço no restaurante', 'restaurantes'],
  ])('"%s" -> %s', (text, id) => {
    expect(matchCategory(text)).toBe(id);
  });

  it('devolve null sem palavra-chave', () => {
    expect(matchCategory('presente 50')).toBeNull();
  });
});

describe('parseScope', () => {
  it.each([
    ['compra da casa', 'family'],
    ['mercado da família', 'family'],
    ['nosso aluguel', 'family'],
    ['meu almoço', 'me'],
    ['comprei pra mim', 'me'],
  ])('"%s" -> %s', (text, scope) => {
    expect(parseScope(text)).toBe(scope);
  });

  it('devolve null quando não dá para saber', () => {
    expect(parseScope('corrida pro trabalho')).toBeNull();
  });
});

describe('interpretMessage', () => {
  it('monta o gasto completo da frase do layout', () => {
    const result = interpretMessage(
      'gastei 87,50 no mercado, compra da casa',
      NOW,
    );
    expect(result.kind).toBe('expenses');
    if (result.kind !== 'expenses') {
      return;
    }
    expect(result.drafts).toHaveLength(1);
    expect(result.drafts[0]).toMatchObject({
      amountCents: 8750,
      categoryId: 'mercado',
      date: '2026-09-30',
      scope: 'family',
    });
  });

  it('deixa o tipo em aberto quando a frase não diz', () => {
    const result = interpretMessage(
      'corrida pro trabalho, vinte e três reais',
      NOW,
    );
    expect(result.kind === 'expenses' && result.drafts[0]).toMatchObject({
      amountCents: 2300,
      categoryId: 'transporte',
      scope: null,
    });
  });

  it('separa vários gastos na mesma mensagem', () => {
    const result = interpretMessage('45 no mercado e 20 de uber ontem', NOW);
    expect(result.kind === 'expenses' && result.drafts).toEqual([
      expect.objectContaining({ amountCents: 4500, categoryId: 'mercado' }),
      expect.objectContaining({
        amountCents: 2000,
        categoryId: 'transporte',
        date: '2026-09-29',
      }),
    ]);
  });

  it('usa a data da frase inteira em todas as partes', () => {
    const result = interpretMessage('ontem 45 no mercado e 20 de uber', NOW);
    const dates = result.kind === 'expenses' && result.drafts.map(d => d.date);
    expect(dates).toEqual(['2026-09-29', '2026-09-29']);
  });

  it('avisa quando não encontra valor', () => {
    expect(interpretMessage('oi, tudo bem?', NOW)).toEqual({
      kind: 'not-understood',
    });
  });
});
