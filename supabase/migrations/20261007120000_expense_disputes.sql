-- Contestação de gastos de família.
--
-- Um membro que não lançou o gasto pode contestá-lo, explicando o motivo.
-- O gasto fica marcado até quem contestou ou quem lançou encerrar a
-- contestação, com uma mensagem do que foi combinado. Um gasto tem no
-- máximo uma contestação aberta por vez.

create table public.expense_disputes (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.family_expenses (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  opened_by uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(trim(reason)) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolution_note text check (char_length(resolution_note) <= 500),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  -- Cursor da sincronização.
  updated_at timestamptz not null default now()
);

create unique index expense_disputes_one_open_idx
  on public.expense_disputes (expense_id)
  where status = 'open';

create index expense_disputes_family_updated_idx
  on public.expense_disputes (family_id, updated_at);

alter table public.expense_disputes enable row level security;

-- Todos da família veem. Abrir e encerrar só pelas funções abaixo.
create policy expense_disputes_select on public.expense_disputes
  for select to authenticated
  using (family_id = public.my_family_id());

grant select on public.expense_disputes to authenticated;
revoke all on public.expense_disputes from anon;

create or replace function public.open_dispute(p_expense_id uuid, p_reason text)
returns public.expense_disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  expense public.family_expenses;
  result public.expense_disputes;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta primeiro.';
  end if;

  select * into expense
  from public.family_expenses
  where id = p_expense_id
    and family_id = public.my_family_id()
    and deleted_at is null;

  if expense.id is null then
    raise exception 'Gasto não encontrado na sua família.';
  end if;
  if expense.created_by = auth.uid() then
    raise exception 'Você não pode contestar um gasto que você mesmo lançou.';
  end if;
  if char_length(trim(coalesce(p_reason, ''))) = 0 then
    raise exception 'Explique o motivo da contestação.';
  end if;
  if exists (
    select 1 from public.expense_disputes
    where expense_id = p_expense_id and status = 'open'
  ) then
    raise exception 'Este gasto já está sendo contestado.';
  end if;

  insert into public.expense_disputes (expense_id, family_id, opened_by, reason)
  values (p_expense_id, expense.family_id, auth.uid(), left(trim(p_reason), 500))
  returning * into result;

  return result;
end;
$$;

-- Encerra a contestação. Só quem contestou ou quem lançou o gasto.
create or replace function public.resolve_dispute(p_dispute_id uuid, p_note text)
returns public.expense_disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  dispute public.expense_disputes;
  creator uuid;
  result public.expense_disputes;
begin
  if auth.uid() is null then
    raise exception 'Entre na sua conta primeiro.';
  end if;

  select * into dispute
  from public.expense_disputes
  where id = p_dispute_id and family_id = public.my_family_id();

  if dispute.id is null then
    raise exception 'Contestação não encontrada.';
  end if;
  if dispute.status <> 'open' then
    raise exception 'Esta contestação já foi encerrada.';
  end if;

  select created_by into creator
  from public.family_expenses
  where id = dispute.expense_id;

  if auth.uid() is distinct from dispute.opened_by
     and auth.uid() is distinct from creator then
    raise exception 'Só quem contestou ou quem lançou o gasto pode encerrar.';
  end if;

  update public.expense_disputes
  set status = 'resolved',
      resolution_note = nullif(left(trim(coalesce(p_note, '')), 500), ''),
      resolved_by = auth.uid(),
      resolved_at = now(),
      updated_at = now()
  where id = p_dispute_id
  returning * into result;

  return result;
end;
$$;

revoke execute on function
  public.open_dispute(uuid, text),
  public.resolve_dispute(uuid, text)
from public, anon;

grant execute on function
  public.open_dispute(uuid, text),
  public.resolve_dispute(uuid, text)
to authenticated;
