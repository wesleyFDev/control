-- Usuários, famílias e gastos de família.
--
-- Gastos pessoais nunca sobem: ficam só no celular. Na nuvem ficam apenas
-- os gastos de família, visíveis para todos os membros da família.
-- Cada usuário participa de no máximo uma família.

-- ---------- Perfis ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cria o perfil junto com o usuário, com o nome informado no cadastro.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        split_part(new.email, '@', 1)
      ),
      60
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Famílias ----------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 60),
  invite_code text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id),
  -- Uma família por usuário.
  constraint family_members_one_family unique (user_id)
);

-- ---------- Gastos de família ----------

-- O id é o mesmo do gasto no celular, para a sincronização ser idempotente.
-- A categoria vai com nome e ícone, porque as categorias são locais de cada
-- aparelho: quem recebe o gasto cria a categoria se não tiver.
create table public.family_expenses (
  id uuid primary key,
  family_id uuid not null references public.families (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  category_id text not null,
  category_name text not null,
  category_icon text not null,
  date date not null,
  description text,
  source text not null,
  -- Quando o gasto foi alterado no aparelho. Decide o conflito entre edições.
  client_updated_at timestamptz not null,
  created_at timestamptz not null default now(),
  -- Quando a linha mudou no servidor. Cursor da sincronização.
  updated_at timestamptz not null default now(),
  -- Exclusão lógica, para a exclusão chegar aos outros aparelhos.
  deleted_at timestamptz
);

create index family_expenses_family_updated_idx
  on public.family_expenses (family_id, updated_at);

create or replace function public.touch_family_expense()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_op = 'UPDATE' then
    -- Quem criou e quando não mudam numa edição.
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger family_expenses_touch
  before insert or update on public.family_expenses
  for each row execute function public.touch_family_expense();

-- ---------- Funções de apoio às políticas ----------

-- security definer evita recursão nas políticas de family_members.
create or replace function public.my_family_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select family_id from public.family_members where user_id = auth.uid()
$$;

create or replace function public.new_invite_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))
$$;

-- ---------- RLS ----------

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.family_expenses enable row level security;

-- Perfis: o próprio e os da mesma família.
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or id in (
      select user_id from public.family_members
      where family_id = public.my_family_id()
    )
  );

create policy profiles_update on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;

-- Família: só quem participa vê. Só o dono renomeia.
create policy families_select on public.families
  for select to authenticated
  using (id = public.my_family_id());

create policy families_update on public.families
  for update to authenticated
  using (
    exists (
      select 1 from public.family_members
      where family_id = families.id
        and user_id = auth.uid()
        and role = 'owner'
    )
  )
  with check (id = public.my_family_id());

revoke update on public.families from authenticated;
grant update (name, updated_at) on public.families to authenticated;

-- Membros: só leitura. Entrar e sair é pelas funções abaixo.
create policy family_members_select on public.family_members
  for select to authenticated
  using (family_id = public.my_family_id());

-- Gastos de família: todos da família leem e editam; ninguém apaga a linha.
create policy family_expenses_select on public.family_expenses
  for select to authenticated
  using (family_id = public.my_family_id());

create policy family_expenses_insert on public.family_expenses
  for insert to authenticated
  with check (family_id = public.my_family_id() and created_by = auth.uid());

create policy family_expenses_update on public.family_expenses
  for update to authenticated
  using (family_id = public.my_family_id())
  with check (family_id = public.my_family_id());

-- ---------- Funções chamadas pelo app ----------

create or replace function public.create_family(p_name text)
returns public.families
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.families;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta primeiro.';
  end if;
  if public.my_family_id() is not null then
    raise exception 'Você já participa de uma família.';
  end if;
  if char_length(trim(coalesce(p_name, ''))) = 0 then
    raise exception 'Dê um nome para a família.';
  end if;

  insert into public.families (name, invite_code, created_by)
  values (left(trim(p_name), 60), public.new_invite_code(), auth.uid())
  returning * into result;

  insert into public.family_members (family_id, user_id, role)
  values (result.id, auth.uid(), 'owner');

  return result;
end;
$$;

create or replace function public.join_family(p_code text)
returns public.families
language plpgsql
security definer
set search_path = ''
as $$
declare
  result public.families;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta primeiro.';
  end if;
  if public.my_family_id() is not null then
    raise exception 'Você já participa de uma família. Saia dela antes.';
  end if;

  select * into result
  from public.families
  where invite_code = upper(trim(coalesce(p_code, '')));

  if result.id is null then
    raise exception 'Código de convite inválido.';
  end if;

  insert into public.family_members (family_id, user_id, role)
  values (result.id, auth.uid(), 'member');

  return result;
end;
$$;

-- Sai da família. Se o dono sair, o membro mais antigo vira dono. Se não
-- sobrar ninguém, a família e os gastos dela são apagados.
create or replace function public.leave_family()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  fid uuid := public.my_family_id();
  was_owner boolean;
  next_owner uuid;
begin
  if fid is null then
    return;
  end if;

  delete from public.family_members
  where family_id = fid and user_id = auth.uid()
  returning role = 'owner' into was_owner;

  select user_id into next_owner
  from public.family_members
  where family_id = fid
  order by joined_at
  limit 1;

  if next_owner is null then
    delete from public.families where id = fid;
  elsif was_owner then
    update public.family_members
    set role = 'owner'
    where family_id = fid and user_id = next_owner;
  end if;
end;
$$;

-- Gera um código novo, invalidando o anterior. Só o dono.
create or replace function public.regenerate_invite_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  code text := public.new_invite_code();
begin
  update public.families f
  set invite_code = code, updated_at = now()
  where f.id = public.my_family_id()
    and exists (
      select 1 from public.family_members
      where family_id = f.id and user_id = auth.uid() and role = 'owner'
    );
  if not found then
    raise exception 'Só o dono da família pode gerar um código novo.';
  end if;
  return code;
end;
$$;

revoke execute on function
  public.create_family(text),
  public.join_family(text),
  public.leave_family(),
  public.regenerate_invite_code(),
  public.my_family_id(),
  public.new_invite_code(),
  public.handle_new_user()
from public, anon;

grant execute on function
  public.create_family(text),
  public.join_family(text),
  public.leave_family(),
  public.regenerate_invite_code(),
  public.my_family_id()
to authenticated;

-- Permissões explícitas da API para usuários logados. A RLS acima decide
-- quais linhas cada um alcança.
grant select on public.profiles, public.families, public.family_members
  to authenticated;
grant select, insert, update on public.family_expenses to authenticated;
revoke all on public.profiles, public.families, public.family_members,
  public.family_expenses from anon;
