module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // Embute o conteúdo dos .sql das migrations do Drizzle no bundle.
    ['inline-import', { extensions: ['.sql'] }],
    // Precisa ser o último plugin da lista (exigência do reanimated 4).
    'react-native-worklets/plugin',
  ],
};
