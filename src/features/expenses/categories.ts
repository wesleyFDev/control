import type { FeatherIconName } from '@react-native-vector-icons/feather/static';

export type CategoryId =
  | 'mercado'
  | 'restaurantes'
  | 'transporte'
  | 'casa'
  | 'lazer'
  | 'saude'
  | 'outros';

export type Category = {
  id: CategoryId;
  label: string;
  icon: FeatherIconName;
  /** Palavras sem acento e em minúsculas, usadas pelo categoryMatcher. */
  keywords: string[];
};

export const CATEGORIES: Category[] = [
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

export const DEFAULT_CATEGORY_ID: CategoryId = 'outros';

export function getCategory(id: CategoryId): Category {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}
