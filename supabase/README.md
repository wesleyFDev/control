# Backend (Supabase)

O que fica na nuvem:

- **Usuários e perfis** (`profiles`): nome que a família vê.
- **Famílias** (`families`, `family_members`): uma família por usuário, com código de convite.
- **Gastos de família** (`family_expenses`): só os gastos marcados como "Família". Os pessoais nunca saem do celular.
- **Pluggy** (`pluggy_items`, `pluggy_credentials`): conexões do Meu Pluggy e credenciais cifradas. As chamadas à Pluggy saem só das Edge Functions.

```
supabase/
  config.toml
  migrations/        tabelas, RLS e funções (create_family, join_family, leave_family, regenerate_invite_code)
  functions/
    bank-data/            busca contas e transações na Pluggy
    pluggy-credentials/   testa, cifra e guarda o Client ID e o Client Secret
    _shared/              autenticação, cifra AES-GCM e cliente da Pluggy
```

## Configurar

Pré-requisitos: um projeto criado em supabase.com e o Supabase CLI (`npx supabase ...` funciona sem instalar).

1. Entrar e ligar esta pasta ao projeto (o ref está na URL do painel):

   ```
   npx supabase login
   npx supabase link --project-ref <ref-do-projeto>
   ```

2. Criar as tabelas:

   ```
   npx supabase db push
   ```

3. Criar a chave que cifra as credenciais da Pluggy (32 bytes em base64) e guardar como secret:

   ```
   openssl rand -base64 32
   npx supabase secrets set PLUGGY_CREDENTIALS_KEY=<valor gerado>
   ```

   Se essa chave mudar, as credenciais já guardadas deixam de abrir: é só cadastrá-las de novo no app.

4. Publicar as funções:

   ```
   npx supabase functions deploy bank-data
   npx supabase functions deploy pluggy-credentials
   ```

5. No painel, em **Authentication → Sign In / Providers → Email**, desligar **Confirm email** para uso pessoal. Com a confirmação ligada, o cadastro pede para abrir o link do e-mail antes de entrar.

6. No app, preencher `src/config/backend.ts` com a **Project URL** e a **anon key** (ou a publishable key), em **Project Settings → API**. Essas duas são públicas; quem protege os dados é a RLS.

## Como a sincronização funciona

- O app envia os gastos de família criados, editados ou apagados desde o último envio (`expenses.pushed_at`). Um gasto que deixou de ser de família sobe como apagado.
- O app recebe as linhas da família com `updated_at` maior que o último cursor (`sync_state`). Num conflito, vence a edição mais recente do aparelho (`client_updated_at`).
- Roda ao entrar na conta, ao voltar para o app, alguns segundos depois de mudar um gasto e ao abrir a tela Família.
