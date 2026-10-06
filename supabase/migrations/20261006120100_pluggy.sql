-- Integração com a Pluggy (Meu Pluggy). As chamadas à Pluggy são feitas só
-- pelas Edge Functions; o app nunca vê as credenciais depois de enviá-las.

-- Conexões (itemIds do Dashboard do Meu Pluggy) de cada usuário.
create table public.pluggy_items (
  user_id uuid not null default auth.uid()
    references auth.users (id) on delete cascade,
  item_id text not null check (item_id ~ '^[0-9a-fA-F-]{36}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.pluggy_items enable row level security;

create policy pluggy_items_own on public.pluggy_items
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Client ID e Client Secret cifrados com AES-GCM pela Edge Function, com a
-- chave do secret PLUGGY_CREDENTIALS_KEY. Sem políticas de RLS: nenhum
-- usuário lê esta tabela, só o service role das Edge Functions.
create table public.pluggy_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ciphertext text not null,
  iv text not null,
  updated_at timestamptz not null default now()
);

alter table public.pluggy_credentials enable row level security;
revoke all on public.pluggy_credentials from anon, authenticated;

grant select, insert, delete on public.pluggy_items to authenticated;
revoke all on public.pluggy_items from anon;
