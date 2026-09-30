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
