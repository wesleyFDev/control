import type { FeatherIconName } from '@react-native-vector-icons/feather/static';

/** Id da categoria no banco. As padrão usam nomes fixos, como "mercado". */
export type CategoryId = string;

export type Category = {
  id: CategoryId;
  label: string;
  icon: FeatherIconName;
  /** Palavras sem acento e em minúsculas, usadas pelo categoryMatcher. */
  keywords: string[];
};

/**
 * Categorias padrão. O seed grava estas no banco na primeira abertura.
 * Depois disso, o app usa o que estiver no banco, pelo registro abaixo.
 */
export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: 'mercado',
    label: 'Mercado',
    icon: 'shopping-cart',
    keywords: [
      'mercado',
      'supermercado',
      'feira',
      'hortifruti',
      'sacolao',
      'acougue',
      'atacadao',
      'assai',
      'carrefour',
    ],
  },
  {
    id: 'restaurantes',
    label: 'Restaurantes',
    icon: 'coffee',
    keywords: [
      'restaurante',
      'lanche',
      'lanchonete',
      'ifood',
      'pizza',
      'hamburguer',
      'almoco',
      'jantar',
      'cafe',
      'padaria',
      'sorvete',
    ],
  },
  {
    id: 'transporte',
    label: 'Transporte',
    icon: 'navigation',
    keywords: [
      'uber',
      '99',
      'taxi',
      'corrida',
      'onibus',
      'metro',
      'gasolina',
      'combustivel',
      'etanol',
      'posto',
      'estacionamento',
      'pedagio',
    ],
  },
  {
    id: 'casa',
    label: 'Casa e contas',
    icon: 'home',
    keywords: [
      'aluguel',
      'condominio',
      'luz',
      'energia',
      'agua',
      'internet',
      'gas',
      'iptu',
      'faxina',
      'diarista',
    ],
  },
  {
    id: 'lazer',
    label: 'Lazer',
    icon: 'film',
    keywords: [
      'cinema',
      'show',
      'netflix',
      'spotify',
      'streaming',
      'bar',
      'viagem',
      'passeio',
      'jogo',
      'festa',
    ],
  },
  {
    id: 'saude',
    label: 'Saúde',
    icon: 'heart',
    keywords: [
      'farmacia',
      'remedio',
      'consulta',
      'medico',
      'dentista',
      'exame',
      'hospital',
      'academia',
    ],
  },
  {
    id: 'outros',
    label: 'Outros',
    icon: 'tag',
    keywords: [],
  },
];

/** Categoria usada quando nada na frase indica outra. Não pode ser apagada. */
export const DEFAULT_CATEGORY_ID: CategoryId = 'outros';

/**
 * Registro em memória das categorias do banco, com as palavras-chave.
 * O chat e o categoryMatcher leem daqui, de forma síncrona. O registro é
 * recarregado do banco na abertura do app e depois de cada alteração nas
 * configurações. Até lá, valem as categorias padrão.
 */
let registry: Category[] = DEFAULT_CATEGORIES;
const listeners = new Set<() => void>();

export function getCategories(): Category[] {
  return registry;
}

export function setCategories(categories: Category[]): void {
  registry = categories.length > 0 ? categories : DEFAULT_CATEGORIES;
  listeners.forEach(listener => listener());
}

export function subscribeCategories(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Categoria pelo id. Uma categoria apagada ou desconhecida vira "Outros". */
export function getCategory(id: CategoryId): Category {
  return (
    registry.find(c => c.id === id) ??
    registry.find(c => c.id === DEFAULT_CATEGORY_ID) ??
    DEFAULT_CATEGORIES[DEFAULT_CATEGORIES.length - 1]
  );
}
