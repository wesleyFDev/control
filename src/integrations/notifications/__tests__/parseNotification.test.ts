import { parseNotification } from '../parseNotification';

describe('parseNotification', () => {
  it.each([
    [
      'Compra aprovada',
      'Compra de R$ 45,90 APROVADA em IFOOD *RESTAURANTE para o cartão com final 1234.',
      4590,
      'IFOOD *RESTAURANTE',
      'restaurantes',
    ],
    [
      'Itaú',
      'Compra aprovada no seu cartão final 1234: R$ 87,50 em SUPERMERCADO BOM PRECO.',
      8750,
      'SUPERMERCADO BOM PRECO',
      'mercado',
    ],
    [
      'Pix enviado',
      'Você enviou R$ 50,00 para Maria Souza.',
      5000,
      'Maria Souza',
      null,
    ],
    [
      'Compra no débito',
      'Compra no débito aprovada de R$ 1.230,00 em POSTO SHELL',
      123000,
      'POSTO SHELL',
      'transporte',
    ],
  ])('"%s: %s" vira gasto', (title, text, cents, merchant, category) => {
    expect(parseNotification(title, text)).toEqual({
      expense: true,
      amountCents: cents,
      merchant,
      categoryId: category,
    });
  });

  it.each([
    ['Pix recebido', 'Você recebeu R$ 200,00 de João.', 'Entrada de dinheiro'],
    ['Estorno', 'Estorno de R$ 30,00 em LOJA X.', 'Estorno ou cashback'],
    ['Fatura fechada', 'Sua fatura de R$ 1.234,56 fechou.', 'Aviso de fatura'],
    [
      'Compra negada',
      'Compra de R$ 99,00 em LOJA foi negada.',
      'Compra negada',
    ],
    ['Nubank', 'Seu código de verificação é 482913', 'Código de segurança'],
    ['Promoção', 'Aproveite o cashback de até 10%!', 'Estorno ou cashback'],
    ['Nubank', 'Seu saldo é R$ 500,00', 'Aviso de saldo ou limite'],
  ])('"%s: %s" é ignorada', (title, text, reason) => {
    const result = parseNotification(title, text);
    expect(result.expense).toBe(false);
    expect(result.expense === false && result.reason).toContain(reason);
  });

  it('ignora números sem "R$", como finais de cartão', () => {
    expect(
      parseNotification('Cartão', 'Seu cartão final 1234 foi enviado'),
    ).toMatchObject({ expense: false, reason: 'Sem valor em reais' });
  });
});
