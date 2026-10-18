-- Additive investment ledger. Apply after the existing migrations; no existing rows change.
create table public.investments_books (
  owner_id uuid primary key references auth.users(id),
  version integer not null check(version>0)
);
create table public.investments_categories (
  owner_id uuid not null references public.investments_books(owner_id),
  id uuid not null,
  data jsonb not null check(jsonb_typeof(data)='object'),
  primary key(owner_id,id)
);
create table public.investments_transactions (
  owner_id uuid not null references public.investments_books(owner_id),
  id text not null, root_id text not null, sequence integer not null,
  category_id uuid not null, cash_category_id uuid,
  data jsonb not null check(jsonb_typeof(data)='object'),
  primary key(owner_id,id), unique(owner_id,sequence),
  foreign key(owner_id,root_id) references public.investments_transactions(owner_id,id),
  foreign key(owner_id,category_id) references public.investments_categories(owner_id,id),
  foreign key(owner_id,cash_category_id) references public.investments_categories(owner_id,id)
);
create table public.investments_valuations (
  owner_id uuid not null references public.investments_books(owner_id),
  id text not null, root_id text not null, sequence integer not null,
  category_id uuid not null, cash_category_id uuid check(cash_category_id is null),
  data jsonb not null check(jsonb_typeof(data)='object'),
  primary key(owner_id,id), unique(owner_id,sequence),
  foreign key(owner_id,root_id) references public.investments_valuations(owner_id,id),
  foreign key(owner_id,category_id) references public.investments_categories(owner_id,id)
);
create table public.investments_audit (
  owner_id uuid not null references public.investments_books(owner_id),
  version integer not null, at timestamptz not null, action jsonb not null,
  primary key(owner_id,version)
);
create table public.investments_commands (
  owner_id uuid not null references public.investments_books(owner_id),
  id uuid not null, fingerprint text not null, result jsonb not null,
  primary key(owner_id,id)
);
do $$
declare t text;
begin
  foreach t in array array['investments_books','investments_categories','investments_transactions','investments_valuations','investments_audit','investments_commands'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to authenticated',t);
    execute format('create policy owner_access on public.%I for all to authenticated using (owner_id = auth.uid() and session_user = ''expense_api'') with check (owner_id = auth.uid() and session_user = ''expense_api'')',t);
    if t not in ('investments_books','investments_categories') then
      execute format('create trigger investments_history_immutable before update or delete on public.%I for each row execute function public.expense_protect_history()',t);
    end if;
  end loop;
end $$;
