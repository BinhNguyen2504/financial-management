-- Apply with a migration/admin connection. Runtime requests SET LOCAL ROLE authenticated.
create table public.expense_books (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  start_month text not null check (start_month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  version integer not null check (version > 0)
);
create table public.expense_jars (
  owner_id uuid not null references public.expense_books(owner_id) on delete cascade,
  id uuid not null,
  kind text not null check (kind in ('monthly', 'accumulation')),
  start_month text not null check (start_month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  opening numeric(24,0) not null check (opening >= 0),
  rules jsonb not null check (jsonb_typeof(rules) = 'array'),
  primary key (owner_id, id)
);
create table public.expense_month_inputs (
  owner_id uuid not null,
  jar_id uuid not null,
  month text not null check (month ~ '^20[0-9]{2}-(0[1-9]|1[0-2])$'),
  target numeric(24,0) check (target >= 0),
  funding numeric(24,0) check (funding >= 0),
  extra numeric(24,0) not null check (extra >= 0),
  closing numeric(24,0) check (closing >= 0),
  primary key (owner_id, jar_id, month),
  foreign key (owner_id, jar_id) references public.expense_jars(owner_id, id)
);
create table public.expense_spends (
  owner_id uuid not null,
  id uuid not null,
  jar_id uuid not null,
  date date not null,
  amount numeric(24,0) not null check (amount > 0),
  note text not null check (length(note) <= 1000),
  deleted boolean not null default false,
  primary key (owner_id, id),
  foreign key (owner_id, jar_id) references public.expense_jars(owner_id, id)
);
create table public.expense_years (
  owner_id uuid not null references public.expense_books(owner_id),
  year integer not null check (year between 2000 and 2099),
  closed_at timestamptz,
  snapshot jsonb,
  primary key (owner_id, year),
  check ((closed_at is null and snapshot is null) or (closed_at is not null and jsonb_typeof(snapshot) = 'array'))
);
create table public.expense_labels (
  owner_id uuid not null references public.expense_books(owner_id),
  id uuid not null,
  kind text not null check (kind in ('method', 'group')),
  name text not null check (length(name) between 1 and 100),
  primary key (owner_id, id)
);
create unique index expense_labels_unique on public.expense_labels(owner_id, kind, lower(name));
create table public.expense_audit (
  owner_id uuid not null references public.expense_books(owner_id),
  version integer not null,
  at timestamptz not null,
  action text not null,
  detail jsonb not null,
  primary key (owner_id, version)
);
create table public.expense_commands (
  owner_id uuid not null references public.expense_books(owner_id),
  id uuid not null,
  fingerprint text not null,
  result jsonb not null,
  primary key (owner_id, id)
);

-- Runtime login is a dedicated server-only role, NOT postgres/service_role.
-- It inherits no authenticated permissions, and must explicitly SET ROLE inside a transaction.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'expense_api') then
    create role expense_api nologin noinherit;
  end if;
end $$;
grant authenticated to expense_api;

-- Only the runtime backend may write. Direct browser/PostgREST writes are intentionally denied.
-- A signed Supabase identity is set as JWT claims by the server before querying.
do $$
declare t text;
begin
  foreach t in array array['expense_books','expense_jars','expense_month_inputs','expense_spends','expense_years','expense_labels','expense_audit','expense_commands'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy owner_access on public.%I for all to authenticated using (owner_id = auth.uid() and session_user = ''expense_api'') with check (owner_id = auth.uid() and session_user = ''expense_api'')', t);
  end loop;
end $$;
grant usage on schema public, auth to authenticated;

create function public.expense_immutable_year() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.closed_at is not null then
    raise exception 'Closed expense year is immutable' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger expense_year_sealed before update or delete on public.expense_years
for each row execute function public.expense_immutable_year();

create function public.expense_protect_history() returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'Expense audit and command history is append only' using errcode = '23514';
end;
$$;
create trigger expense_audit_immutable before update or delete on public.expense_audit
for each row execute function public.expense_protect_history();
create trigger expense_commands_immutable before update or delete on public.expense_commands
for each row execute function public.expense_protect_history();
