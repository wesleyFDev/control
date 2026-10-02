import type { LlamaContext } from 'llama.rn';

import { aiLog, startTimer } from '../aiLog';
import {
  DEFAULT_CATEGORY_ID,
  type Category,
} from '../../features/expenses/categories';

/**
 * Pede ao modelo só a categoria do gasto. Valor, data e tipo continuam
 * com as regras, que acertam mais e não inventam números.
 *
 * Nos testes no computador, o modelo de 1,5B acertou 12 de 15 frases com
 * este formato. Pedir o gasto inteiro em JSON piorava as categorias,
 * demorava o dobro e fazia o modelo inventar gastos em perguntas.
 */

/** Descrições das categorias padrão. As criadas pelo usuário usam as palavras-chave. */
const DEFAULT_HINTS: Record<string, string> = {
  mercado:
    'comida e produtos comprados para casa (frutas, carne, arroz, limpeza, ração de animais)',
  restaurantes:
    'comer fora ou pedir comida pronta (almoço, jantar, lanche, pizza, ifood, café na padaria)',
  transporte: 'uber, táxi, ônibus, gasolina, posto, estacionamento',
  casa: 'aluguel, luz, água, internet, gás, conta de celular, condomínio',
  lazer:
    'diversão e assinaturas (cinema, netflix, spotify, bar, viagem, jogos)',
  saude: 'farmácia, remédio, médico, exame, dentista',
  outros: 'roupas, presentes e tudo que não for das anteriores',
};

/** Exemplos usados só quando a categoria existe no aparelho. */
const EXAMPLES: [string, string][] = [
  ['comprei banana por 8', 'mercado'],
  ['pizza 60', 'restaurantes'],
  ['enchi o tanque 200', 'transporte'],
  ['paguei a internet 100', 'casa'],
  ['ingresso do show 150', 'lazer'],
  ['consulta no dentista 200', 'saude'],
  ['camiseta 50', 'outros'],
];

function hintFor(category: Category): string {
  if (DEFAULT_HINTS[category.id]) {
    return DEFAULT_HINTS[category.id];
  }
  return category.keywords.length > 0
    ? category.keywords.slice(0, 8).join(', ')
    : category.label;
}

/** "Outros" sempre por último, para o modelo ler as específicas antes. */
function ordered(categories: Category[]): Category[] {
  return [
    ...categories.filter(c => c.id !== DEFAULT_CATEGORY_ID),
    ...categories.filter(c => c.id === DEFAULT_CATEGORY_ID),
  ];
}

export function buildClassifierRequest(text: string, categories: Category[]) {
  const list = ordered(categories);
  const nameById = new Map(list.map(c => [c.id, c.label]));

  const system = `Classifique o gasto em uma categoria. Responda só com JSON.
Categorias:
${list.map(c => `- ${c.label}: ${hintFor(c)}`).join('\n')}`;

  const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] =
    [{ role: 'system', content: system }];
  for (const [example, id] of EXAMPLES) {
    const label = nameById.get(id);
    if (label) {
      messages.push(
        { role: 'user', content: example },
        { role: 'assistant', content: JSON.stringify({ categoria: label }) },
      );
    }
  }
  messages.push({ role: 'user', content: text });

  const schema = {
    type: 'object',
    properties: {
      categoria: { type: 'string', enum: list.map(c => c.label) },
    },
    required: ['categoria'],
  };

  return {
    messages,
    schema,
    idByLabel: new Map(list.map(c => [c.label, c.id])),
  };
}

/** Lê a resposta do modelo e devolve o id da categoria, ou null se vier algo inválido. */
export function parseClassifierResponse(
  raw: string,
  idByLabel: Map<string, string>,
): string | null {
  try {
    // No celular o texto pode vir com marcadores do template de chat antes
    // do JSON, como "<|im_start|>assistant\n". Lê só o trecho entre chaves.
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end < start) {
      throw new Error('sem JSON');
    }
    const parsed = JSON.parse(raw.slice(start, end + 1));
    const id = idByLabel.get(String(parsed?.categoria)) ?? null;
    if (!id) {
      aiLog('classificador: categoria fora da lista, ignorando', parsed);
    }
    return id;
  } catch {
    aiLog('classificador: resposta não é JSON válido, ignorando', raw);
    return null;
  }
}

export async function classifyCategory(
  context: LlamaContext,
  text: string,
  categories: Category[],
): Promise<string | null> {
  const { messages, schema, idByLabel } = buildClassifierRequest(
    text,
    categories,
  );
  aiLog(`classificador: perguntando a categoria de "${text}"`, {
    categorias: [...idByLabel.keys()],
    mensagensNoPrompt: messages.length,
  });
  aiLog('classificador: prompt do sistema\n' + messages[0].content);
  const elapsed = startTimer();
  const result = await context.completion({
    messages,
    n_predict: 24,
    temperature: 0,
    response_format: {
      type: 'json_schema',
      json_schema: { strict: true, schema },
    },
  });
  aiLog(`classificador: resposta em ${elapsed()} ms`, {
    texto: result.text,
    tokensPrompt: result.timings?.prompt_n,
    tokensGerados: result.timings?.predicted_n,
    tokensPorSegundo: result.timings?.predicted_per_second,
  });
  const id = parseClassifierResponse(result.text, idByLabel);
  aiLog('classificador: categoria escolhida', id);
  return id;
}
