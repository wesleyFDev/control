jest.mock('@op-engineering/op-sqlite', () =>
  require('../testing/fakeOpSqlite'),
);

const { migrate } = jest.requireActual('drizzle-orm/op-sqlite/migrator');

import { matchCategory } from '../../ai/parsers/categoryMatcher';
import { getCategory } from '../../features/expenses/categories';
import { db } from '../client';
import migrations from '../migrations/migrations';
import {
  CategoryValidationError,
  createCategory,
  deleteCategory,
  getCategoryWithKeywords,
  listCategoriesWithKeywords,
  refreshCategoryRegistry,
  updateCategory,
} from '../repositories/categoriesRepository';
import { ensureSeedData } from '../seed';

describe('categorias e palavras-chave', () => {
  beforeAll(async () => {
    await migrate(db, migrations);
    await ensureSeedData();
    await refreshCategoryRegistry();
  });

  it('o seed grava as palavras-chave padrão, com "Outros" por último', async () => {
    const list = await listCategoriesWithKeywords();
    expect(list[list.length - 1].id).toBe('outros');
    expect(list.find(c => c.id === 'mercado')?.keywords).toContain('mercado');
    expect(matchCategory('45 no supermercado')).toBe('mercado');
  });

  it('cria uma categoria nova e o chat passa a reconhecê-la', async () => {
    const id = await createCategory({
      name: 'Pets',
      icon: 'github',
      keywords: ['Ração', 'veterinário', ' petshop ', 'ração'],
    });

    const created = await getCategoryWithKeywords(id);
    expect(created).toMatchObject({ name: 'Pets' });
    expect(created?.keywords.sort()).toEqual([
      'petshop',
      'racao',
      'veterinario',
    ]);
    expect(matchCategory('comprei ração por 80')).toBe(id);
    expect(getCategory(id).label).toBe('Pets');
  });

  it('recusa uma palavra que já está em outra categoria', async () => {
    await expect(
      createCategory({ name: 'Carro', icon: 'truck', keywords: ['gasolina'] }),
    ).rejects.toThrow(
      new CategoryValidationError(
        'A palavra "gasolina" já está na categoria Transporte.',
      ),
    );
  });

  it('recusa nome vazio e nome repetido', async () => {
    await expect(
      createCategory({ name: '  ', icon: 'tag', keywords: [] }),
    ).rejects.toThrow('Dê um nome para a categoria.');
    await expect(
      createCategory({ name: 'mércado', icon: 'tag', keywords: [] }),
    ).rejects.toThrow('Já existe uma categoria chamada "Mercado".');
  });

  it('edita as palavras-chave e libera as removidas para outra categoria', async () => {
    const mercado = await getCategoryWithKeywords('mercado');
    const keywords = (mercado?.keywords ?? []).filter(k => k !== 'feira');
    await updateCategory('mercado', {
      name: 'Mercado',
      icon: 'shopping-cart',
      keywords: [...keywords, 'hortifruti', 'quitanda'],
    });

    const updated = await getCategoryWithKeywords('mercado');
    expect(updated?.keywords).toContain('quitanda');
    expect(updated?.keywords).not.toContain('feira');
    expect(matchCategory('gastei 20 na quitanda')).toBe('mercado');

    const id = await createCategory({
      name: 'Feiras',
      icon: 'sun',
      keywords: ['feira'],
    });
    expect(matchCategory('feira 30')).toBe(id);
  });

  it('apaga uma categoria e o chat deixa de usá-la', async () => {
    const id = await createCategory({
      name: 'Viagens',
      icon: 'map',
      keywords: ['hotel'],
    });
    await deleteCategory(id);

    const list = await listCategoriesWithKeywords();
    expect(list.find(c => c.id === id)).toBeUndefined();
    expect(matchCategory('hotel 300')).toBeNull();

    // A palavra da categoria apagada fica livre para outra.
    await expect(
      createCategory({ name: 'Hospedagem', icon: 'home', keywords: ['hotel'] }),
    ).resolves.toEqual(expect.any(String));
  });

  it('não deixa apagar "Outros"', async () => {
    await expect(deleteCategory('outros')).rejects.toThrow(
      CategoryValidationError,
    );
  });

  it('rodar o seed de novo não recoloca palavras apagadas', async () => {
    await ensureSeedData();
    const mercado = await getCategoryWithKeywords('mercado');
    expect(mercado?.keywords).not.toContain('feira');
  });
});
