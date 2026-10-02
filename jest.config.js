module.exports = {
  preset: '@react-native/jest-preset',
  // A primeira execução sem cache transforma muitos módulos e passa dos 5 s padrão.
  testTimeout: 20000,
  setupFiles: [
    require.resolve('@react-native/jest-preset/jest/setup.js'),
    'react-native-gesture-handler/jestSetup',
    './jest.setup.js',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native(-[a-z-]+)?|@react-native(-community)?|@react-navigation|@react-native-vector-icons|llama\\.rn)/)',
  ],
};
