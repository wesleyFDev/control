import type { DB } from '@op-engineering/op-sqlite';

import { withDrizzleCompat } from '../opsqliteCompat';

describe('withDrizzleCompat', () => {
  it('entrega as linhas em rows._array, como o driver do Drizzle espera', async () => {
    const rows = [{ id: 1, name: '20260930142752_init' }];
    const execute = jest.fn(async () => ({ rowsAffected: 0, rows }));
    const client = { execute, executeSync: jest.fn() } as unknown as DB;

    const compat = withDrizzleCompat(client) as DB & {
      executeAsync: (
        query: string,
        params?: unknown[],
      ) => Promise<{ rows: unknown[] & { _array: unknown[] } }>;
    };
    const result = await compat.executeAsync('SELECT 1', [1]);

    expect(execute).toHaveBeenCalledWith('SELECT 1', [1]);
    expect(result.rows._array).toEqual(rows);
    expect([...result.rows]).toEqual(rows);
  });

  it('devolve lista vazia quando a query não retorna linhas', async () => {
    const client = {
      execute: jest.fn(async () => ({ rowsAffected: 1 })),
    } as unknown as DB;
    const compat = withDrizzleCompat(client) as DB & {
      executeAsync: (q: string) => Promise<{ rows: { _array: unknown[] } }>;
    };
    expect((await compat.executeAsync('DELETE FROM x')).rows._array).toEqual(
      [],
    );
  });

  it('mantém os outros métodos do cliente', () => {
    const executeSync = jest.fn();
    const client = { execute: jest.fn(), executeSync } as unknown as DB;
    expect(withDrizzleCompat(client).executeSync).toBe(executeSync);
  });
});
