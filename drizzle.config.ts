import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  // "expo" também é o driver indicado para o op-sqlite: gera um migrations.js
  // que o Metro consegue empacotar no app.
  driver: 'expo',
  schema: [
    './src/db/schema.ts',
    './src/db/pluggySchema.ts',
    './src/db/notificationSchema.ts',
    './src/db/billsSchema.ts',
    './src/db/syncSchema.ts',
  ],
  out: './src/db/migrations',
});
