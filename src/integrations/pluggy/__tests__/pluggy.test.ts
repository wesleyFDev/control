import { classifyTransaction } from '../classifyTransaction';
import {
  createApiKey,
  listAccounts,
  listTransactions,
  PluggyError,
  type PluggyAccount,
  type PluggyTransaction,
} from '../pluggyClient';

const mockFetch = jest.fn();

beforeEach(() => {
  mockFetch.mockReset();
  (globalThis as { fetch: unknown }).fetch = mockFetch;
});

function respond(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    statusText: 'x',
    json: () => Promise.resolve(body),
  });
}

describe('pluggyClient', () => {
  it('troca as credenciais pela API key', async () => {
    mockFetch.mockReturnValueOnce(respond(200, { apiKey: 'chave' }));
    await expect(createApiKey('id', 'segredo')).resolves.toBe('chave');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.pluggy.ai/auth');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      clientId: 'id',
      clientSecret: 'segredo',
    });
  });

  it('explica o erro de credencial recusada', async () => {
    mockFetch.mockReturnValueOnce(respond(401, { message: 'invalid' }));
    await expect(createApiKey('id', 'errado')).rejects.toThrow(
      'Confira o Client ID',
    );
  });

  it('avisa quando não há internet', async () => {
    mockFetch.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(createApiKey('id', 's')).rejects.toBeInstanceOf(PluggyError);
  });

  it('lista as contas com a API key no cabeçalho', async () => {
    mockFetch.mockReturnValueOnce(
      respond(200, { results: [{ id: 'a1', name: 'Conta' }] }),
    );
    const accounts = await listAccounts('chave', 'item 1');
    expect(accounts).toEqual([{ id: 'a1', name: 'Conta' }]);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.pluggy.ai/accounts?itemId=item%201');
    expect(init.headers['X-API-KEY']).toBe('chave');
  });

  it('junta todas as páginas de transações', async () => {
    mockFetch
      .mockReturnValueOnce(
        respond(200, { totalPages: 2, page: 1, results: [{ id: 't1' }] }),
      )
      .mockReturnValueOnce(
        respond(200, { totalPages: 2, page: 2, results: [{ id: 't2' }] }),
      );
    const list = await listTransactions(
      'chave',
      'a1',
      '2026-09-01',
      '2026-09-30',
    );
    expect(list.map(t => t.id)).toEqual(['t1', 't2']);
    expect(mockFetch.mock.calls[1][0]).toContain('page=2');
    expect(mockFetch.mock.calls[0][0]).toContain('from=2026-09-01');
  });
});

describe('classifyTransaction', () => {
  const bank = { type: 'BANK' } as PluggyAccount;
  const card = { type: 'CREDIT' } as PluggyAccount;
  const tx = (partial: Partial<PluggyTransaction>) =>
    ({
      id: 't',
      description: 'Compra',
      amount: 10,
      type: 'DEBIT',
      operationType: null,
      ...partial,
    } as PluggyTransaction);

  it('compra no cartão vira gasto, com o valor em centavos', () => {
    expect(classifyTransaction(tx({ amount: 87.5 }), card)).toEqual({
      expense: true,
      amountCents: 8750,
    });
  });

  it('pagamento e estorno no cartão não viram gasto', () => {
    expect(classifyTransaction(tx({ amount: -500 }), card).expense).toBe(false);
    expect(
      classifyTransaction(tx({ amount: 30, operationType: 'ESTORNO' }), card)
        .expense,
    ).toBe(false);
  });

  it('saída da conta vira gasto e entrada não', () => {
    expect(
      classifyTransaction(tx({ amount: -45, operationType: 'PIX' }), bank),
    ).toEqual({ expense: true, amountCents: 4500 });
    expect(
      classifyTransaction(tx({ type: 'CREDIT', amount: 3000 }), bank).expense,
    ).toBe(false);
  });

  it('pagamento da fatura e transferência entre contas suas não viram gasto', () => {
    expect(
      classifyTransaction(
        tx({ amount: -900, description: 'PAGAMENTO DE FATURA' }),
        bank,
      ).expense,
    ).toBe(false);
    expect(
      classifyTransaction(
        tx({ amount: -100, operationType: 'TRANSFERENCIA_MESMA_INSTITUICAO' }),
        bank,
      ).expense,
    ).toBe(false);
  });
});
