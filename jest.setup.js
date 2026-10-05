/* eslint-env jest */
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
);

// O drawer nativo usa o reanimated 4, que não roda no Jest.
// Nos testes, o drawer vira uma View simples que mostra só a tela atual.
jest.mock('react-native-drawer-layout', () => {
  const React = require('react');
  const DrawerProgressContext = React.createContext(undefined);
  return {
    Drawer: ({ children }) => children,
    DrawerProgressContext,
    useDrawerProgress: () => ({ value: 0 }),
  };
});

// O op-sqlite é nativo e não roda no Jest. Nos testes, o banco é falso
// e as migrations são dadas como aplicadas.
jest.mock('@op-engineering/op-sqlite', () => ({
  open: () => ({
    executeSync: jest.fn(() => ({ rows: [], rowsAffected: 0 })),
    execute: jest.fn(async () => ({ rows: [], rowsAffected: 0 })),
    executeRaw: jest.fn(async () => []),
    close: jest.fn(),
  }),
}));

jest.mock('drizzle-orm/op-sqlite/migrator', () => ({
  useMigrations: () => ({ success: true }),
  migrate: jest.fn(async () => undefined),
}));

// llama.rn: mock oficial da biblioteca.
jest.mock('llama.rn', () => require('llama.rn/jest/mock'));

// react-native-blob-util é nativo. Nos testes, a pasta do modelo começa vazia.
jest.mock('react-native-blob-util', () => {
  const files = new Map();
  const fs = {
    dirs: { DocumentDir: '/docs', CacheDir: '/cache' },
    isDir: jest.fn(async () => true),
    mkdir: jest.fn(async () => undefined),
    exists: jest.fn(async path => files.has(path)),
    readFile: jest.fn(async path => files.get(path)),
    writeFile: jest.fn(async (path, content) => {
      files.set(path, content);
    }),
    unlink: jest.fn(async path => {
      files.delete(path);
    }),
    stat: jest.fn(async () => ({ size: 0 })),
    hash: jest.fn(async () => ''),
    mv: jest.fn(async () => true),
    df: jest.fn(async () => ({ free: 0 })),
  };
  return {
    __esModule: true,
    default: {
      fs,
      android: { getSDCardApplicationDir: jest.fn(async () => '/sdcard/app') },
      config: jest.fn(() => ({ fetch: jest.fn() })),
    },
  };
});

// react-native-keychain é nativo. Nos testes, guarda as credenciais em memória.
jest.mock('react-native-keychain', () => {
  const store = new Map();
  return {
    setGenericPassword: jest.fn(async (username, password, options) => {
      store.set(options?.service ?? 'default', { username, password });
      return { service: options?.service, storage: 'memory' };
    }),
    getGenericPassword: jest.fn(async options => {
      const saved = store.get(options?.service ?? 'default');
      return saved ? { ...saved, service: options?.service } : false;
    }),
    resetGenericPassword: jest.fn(async options => {
      store.delete(options?.service ?? 'default');
      return true;
    }),
  };
});
