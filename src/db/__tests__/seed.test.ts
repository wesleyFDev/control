jest.mock('@op-engineering/op-sqlite', () =>
  require('../testing/fakeOpSqlite'),
);

const { migrate } = jest.requireActual('drizzle-orm/op-sqlite/migrator');

import { db } from '../client';
import migrations from '../migrations/migrations';
import { listCategories, listMembers } from '../repositories/lookupsRepository';
import { DEFAULT_SELF_NAME, ensureSeedData } from '../seed';

describe('dados iniciais em um banco novo', () => {
  beforeAll(async () => {
    await migrate(db, migrations);
  });

  it('cria as categorias padrão e o membro "você"', async () => {
    await ensureSeedData();

    expect((await listCategories()).map(c => c.id)).toEqual([
      'mercado',
      'restaurantes',
      'transporte',
      'casa',
      'lazer',
      'saude',
      'outros',
    ]);
    const self = (await listMembers()).filter(m => m.isSelf);
    expect(self).toHaveLength(1);
    expect(self[0].name).toBe(DEFAULT_SELF_NAME);
  });

  it('rodar de novo não duplica nada', async () => {
    await ensureSeedData();
    expect(await listCategories()).toHaveLength(7);
    expect(await listMembers()).toHaveLength(1);
  });
});
