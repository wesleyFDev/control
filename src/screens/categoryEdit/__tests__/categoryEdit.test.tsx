import React from 'react';
import { Text, TextInput } from 'react-native';
import ReactTestRenderer, {
  type ReactTestInstance,
  type ReactTestRenderer as Renderer,
} from 'react-test-renderer';

import CategoryEdit from '../categoryEdit';

const mockGoBack = jest.fn();
let mockParams: { categoryId?: string } | undefined;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockParams }),
}));

const mockCreate = jest.fn(async (_input: unknown) => 'new-id');
const mockUpdate = jest.fn(async (_id: string, _input: unknown) => undefined);

jest.mock('../../../db/repositories/categoriesRepository', () => {
  const actual = jest.requireActual(
    '../../../db/repositories/categoriesRepository',
  );
  return {
    normalizeKeyword: actual.normalizeKeyword,
    createCategory: (input: unknown) => mockCreate(input),
    updateCategory: (id: string, input: unknown) => mockUpdate(id, input),
    deleteCategory: jest.fn(async () => undefined),
    getCategoryWithKeywords: jest.fn(async (id: string) => ({
      id,
      name: id === 'outros' ? 'Outros' : 'Mercado',
      icon: 'shopping-cart',
      sortOrder: 0,
      keywords: ['mercado', 'feira'],
    })),
  };
});

jest.mock('../../../db/client', () => ({ db: {}, sqlite: {} }));

beforeEach(() => {
  mockCreate.mockClear();
  mockUpdate.mockClear();
  mockGoBack.mockClear();
});

function allText(root: ReactTestInstance): string {
  return root
    .findAllByType(Text)
    .map(node =>
      ([] as unknown[])
        .concat(node.props.children)
        .filter(c => typeof c === 'string')
        .join(''),
    )
    .join('\n');
}

function findByLabel(root: ReactTestInstance, label: string) {
  return root.find(
    node =>
      node.props.accessibilityLabel === label &&
      (typeof node.props.onPress === 'function' ||
        typeof node.props.onChangeText === 'function'),
  );
}

async function pressText(root: ReactTestInstance, label: string) {
  const target = root.find(
    node =>
      typeof node.props.onPress === 'function' &&
      node.findAllByType(Text).some(t => t.props.children === label),
  );
  await ReactTestRenderer.act(async () => {
    await target.props.onPress();
  });
}

async function renderScreen(): Promise<Renderer> {
  let renderer: Renderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<CategoryEdit />);
  });
  return renderer as Renderer;
}

describe('Editar categoria', () => {
  it('cria uma categoria com palavras-chave normalizadas', async () => {
    mockParams = undefined;
    const renderer = await renderScreen();

    await ReactTestRenderer.act(async () =>
      findByLabel(renderer.root, 'Nome da categoria').props.onChangeText(
        'Pets',
      ),
    );
    await ReactTestRenderer.act(async () =>
      findByLabel(renderer.root, 'Ícone gift').props.onPress(),
    );
    const keywordInput = renderer.root.find(
      node =>
        node.type === TextInput &&
        node.props.accessibilityLabel === 'Nova palavra-chave',
    );
    await ReactTestRenderer.act(async () =>
      keywordInput.props.onChangeText('Ração'),
    );
    await ReactTestRenderer.act(async () =>
      findByLabel(renderer.root, 'Adicionar palavra-chave').props.onPress(),
    );
    expect(allText(renderer.root)).toContain('racao');

    // Palavra digitada mas não adicionada também entra ao salvar.
    await ReactTestRenderer.act(async () =>
      keywordInput.props.onChangeText('Veterinário'),
    );
    await pressText(renderer.root, 'Salvar');

    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Pets',
      icon: 'gift',
      keywords: ['racao', 'veterinario'],
    });
    expect(mockGoBack).toHaveBeenCalled();
    expect(allText(renderer.root)).not.toContain('Apagar categoria');
  });

  it('edita uma categoria existente e remove uma palavra', async () => {
    mockParams = { categoryId: 'mercado' };
    const renderer = await renderScreen();
    expect(allText(renderer.root)).toContain('feira');

    await ReactTestRenderer.act(async () =>
      findByLabel(renderer.root, 'Remover feira').props.onPress(),
    );
    await pressText(renderer.root, 'Salvar');

    expect(mockUpdate).toHaveBeenCalledWith('mercado', {
      name: 'Mercado',
      icon: 'shopping-cart',
      keywords: ['mercado'],
    });
    expect(allText(renderer.root)).toContain('Apagar categoria');
  });

  it('mostra o erro de validação e não volta', async () => {
    mockParams = undefined;
    mockCreate.mockRejectedValueOnce(new Error('Dê um nome para a categoria.'));
    const renderer = await renderScreen();
    await pressText(renderer.root, 'Salvar');

    expect(allText(renderer.root)).toContain('Dê um nome para a categoria.');
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('não oferece apagar a categoria "Outros"', async () => {
    mockParams = { categoryId: 'outros' };
    const renderer = await renderScreen();
    expect(allText(renderer.root)).not.toContain('Apagar categoria');
  });
});
