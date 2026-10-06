module.exports = {
  root: true,
  extends: '@react-native',
  // supabase/ roda no Deno, com outro TypeScript e outros imports.
  ignorePatterns: ['src/db/migrations/', 'supabase/'],
};
