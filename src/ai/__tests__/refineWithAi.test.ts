import {
  buildClassifierRequest,
  parseClassifierResponse,
} from '../llm/categoryClassifier';
import { interpretMessage } from '../expensePipeline';
import { needsAiCategory, refineWithAi } from '../refineWithAi';
import { DEFAULT_CATEGORIES } from '../../features/expenses/categories';

const NOW = new Date(2026, 8, 30, 10, 0, 0);

function draftsOf(text: string) {
  const result = interpretMessage(text, NOW);
  if (result.kind !== 'expenses') {
    throw new Error('sem gastos');
  }
  return result.drafts;
}

describe('refineWithAi', () => {
  it('só chama a IA para gastos sem palavra-chave', async () => {
    const drafts = draftsOf('45 no mercado e 20 de maçã');
    expect(drafts.map(d => d.categorySource)).toEqual(['keyword', 'default']);
    expect(needsAiCategory(drafts)).toBe(true);

    const classify = jest.fn(async () => 'mercado');
    const refined = await refineWithAi(drafts, classify);

    expect(classify).toHaveBeenCalledTimes(1);
    expect(classify).toHaveBeenCalledWith('20 de maçã');
    expect(refined[1]).toMatchObject({
      categoryId: 'mercado',
      categorySource: 'ai',
      amountCents: 2000,
    });
  });

  it('não precisa da IA quando todas as categorias vieram das regras', () => {
    expect(needsAiCategory(draftsOf('uber 20'))).toBe(false);
  });

  it('mantém o gasto das regras quando a IA falha', async () => {
    const drafts = draftsOf('presente 70');
    const refined = await refineWithAi(drafts, async () => {
      throw new Error('sem memória');
    });
    expect(refined[0]).toMatchObject({
      categoryId: 'outros',
      categorySource: 'default',
    });
  });

  it('mantém o gasto das regras quando a IA demora demais', async () => {
    const drafts = draftsOf('presente 70');
    const refined = await refineWithAi(
      drafts,
      () => new Promise(() => undefined),
      10,
    );
    expect(refined[0].categoryId).toBe('outros');
  });

  it('mantém o gasto quando a IA devolve uma categoria inválida', async () => {
    const drafts = draftsOf('presente 70');
    const refined = await refineWithAi(drafts, async () => null);
    expect(refined[0].categorySource).toBe('default');
  });
});

describe('categoryClassifier', () => {
  it('monta o prompt com as categorias do aparelho e "Outros" por último', () => {
    const custom = {
      id: 'pets',
      label: 'Pets',
      icon: 'gift' as const,
      keywords: ['racao', 'petshop'],
    };
    const { messages, schema, idByLabel } = buildClassifierRequest(
      'banho no cachorro 60',
      [...DEFAULT_CATEGORIES, custom],
    );

    const system = messages[0].content;
    expect(system).toContain('- Pets: racao, petshop');
    expect(system.trim().split('\n').pop()).toContain('Outros');
    expect(messages[messages.length - 1]).toEqual({
      role: 'user',
      content: 'banho no cachorro 60',
    });
    expect((schema.properties.categoria as { enum: string[] }).enum).toContain(
      'Pets',
    );
    expect(idByLabel.get('Pets')).toBe('pets');
  });

  it('só usa exemplos de categorias que existem', () => {
    const onlyTwo = DEFAULT_CATEGORIES.filter(c =>
      ['mercado', 'outros'].includes(c.id),
    );
    const { messages } = buildClassifierRequest('x', onlyTwo);
    const answers = messages
      .filter(m => m.role === 'assistant')
      .map(m => JSON.parse(m.content).categoria);
    expect(answers).toEqual(['Mercado', 'Outros']);
  });

  it('lê a resposta e ignora JSON inválido ou categoria desconhecida', () => {
    const ids = new Map([['Mercado', 'mercado']]);
    expect(parseClassifierResponse('{"categoria":"Mercado"}', ids)).toBe(
      'mercado',
    );
    expect(parseClassifierResponse('{"categoria":"Viagem"}', ids)).toBeNull();
    expect(parseClassifierResponse('não é json', ids)).toBeNull();
    // Formato visto no celular: marcador do template antes do JSON.
    expect(
      parseClassifierResponse(
        '<|im_start|>assistant\n{"categoria":"Mercado"}',
        ids,
      ),
    ).toBe('mercado');
  });
});
