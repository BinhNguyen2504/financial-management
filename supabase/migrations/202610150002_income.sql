-- Apply after 202610150001_expenses.sql. Reuses the existing server-only runtime role.
create table public.income_books (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  version integer not null check (version > 0)
);
create table public.income_categories (
  owner_id uuid not null references public.income_books(owner_id),
  id uuid not null,
  start_month text not null check (start_month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  deleted boolean not null default false,
  rules jsonb not null check (jsonb_typeof(rules) = 'array'),
  primary key (owner_id,id)
);
create table public.income_monthly (
  owner_id uuid not null,
  category_id uuid not null,
  month text not null check (month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  amount numeric(24,0) not null check (amount >= 0),
  note text not null check (length(note) <= 1000),
  primary key (owner_id,category_id,month),
  foreign key (owner_id,category_id) references public.income_categories(owner_id,id)
);
create table public.income_oneoffs (
  owner_id uuid not null references public.income_books(owner_id),
  id uuid not null,
  month text not null check (month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  name text not null check (length(name) between 1 and 100),
  description text not null check (length(description) <= 1000),
  amount numeric(24,0) not null check (amount > 0),
  deleted boolean not null default false,
  primary key (owner_id,id)
);
create table public.income_audit (
  owner_id uuid not null references public.income_books(owner_id),
  version integer not null,
  at timestamptz not null,
  action text not null,
  detail jsonb not null,
  primary key (owner_id,version)
);
create table public.income_commands (
  owner_id uuid not null references public.income_books(owner_id),
  id uuid not null,
  fingerprint text not null,
  result jsonb not null,
  primary key (owner_id,id)
);
do $$
declare t text;
begin
  foreach t in array array['income_books','income_categories','income_monthly','income_oneoffs','income_audit','income_commands'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to authenticated',t);
    execute format('create policy owner_access on public.%I for all to authenticated using (owner_id = auth.uid() and session_user = ''expense_api'') with check (owner_id = auth.uid() and session_user = ''expense_api'')',t);
  end loop;
end $$;
create trigger income_audit_immutable before update or delete on public.income_audit
for each row execute function public.expense_protect_history();
create trigger income_commands_immutable before update or delete on public.income_commands
for each row execute function public.expense_protect_history();
