import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  // "expo" também é o driver indicado para o op-sqlite: gera um migrations.js
  // que o Metro consegue empacotar no app.
  driver: 'expo',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
});
