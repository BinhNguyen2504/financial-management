-- Additive Fund ledger. Apply after existing migrations; no financial records are seeded.
create table public.funds_books (
  owner_id uuid primary key references auth.users(id),
  version integer not null check(version>0)
);
create table public.funds_definitions (
  owner_id uuid not null references public.funds_books(owner_id),
  id text not null check(id in ('emergency','rainy_day','sinking')),
  primary key(owner_id,id)
);
create table public.funds_locations (
  owner_id uuid not null references public.funds_books(owner_id), id uuid not null,
  data jsonb not null check(jsonb_typeof(data)='object'), primary key(owner_id,id)
);
create table public.funds_configurations (
  owner_id uuid not null references public.funds_books(owner_id), id uuid not null,
  sequence integer not null check(sequence>0), data jsonb not null check(jsonb_typeof(data)='object'),
  primary key(owner_id,id), unique(owner_id,sequence)
);
create table public.funds_transactions (
  owner_id uuid not null references public.funds_books(owner_id), id text not null, root_id text not null,
  sequence integer not null check(sequence>0), fund_id text not null, location_id uuid not null,
  to_fund_id text, to_location_id uuid,
  data jsonb not null check(jsonb_typeof(data)='object'),
  primary key(owner_id,id), unique(owner_id,sequence),
  check((to_fund_id is null)=(to_location_id is null)),
  foreign key(owner_id,root_id) references public.funds_transactions(owner_id,id),
  foreign key(owner_id,fund_id) references public.funds_definitions(owner_id,id),
  foreign key(owner_id,location_id) references public.funds_locations(owner_id,id),
  foreign key(owner_id,to_fund_id) references public.funds_definitions(owner_id,id),
  foreign key(owner_id,to_location_id) references public.funds_locations(owner_id,id)
);
create table public.funds_audit (
  owner_id uuid not null references public.funds_books(owner_id), version integer not null,
  at timestamptz not null, action jsonb not null, primary key(owner_id,version)
);
create table public.funds_commands (
  owner_id uuid not null references public.funds_books(owner_id), id uuid not null,
  fingerprint text not null, result jsonb not null, primary key(owner_id,id)
);
do $$
declare t text;
begin
  foreach t in array array['funds_books','funds_definitions','funds_locations','funds_configurations','funds_transactions','funds_audit','funds_commands'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from anon, authenticated',t);
    execute format('grant select, insert, update, delete on public.%I to authenticated',t);
    execute format('create policy owner_access on public.%I for all to authenticated using (owner_id = auth.uid() and session_user = ''expense_api'') with check (owner_id = auth.uid() and session_user = ''expense_api'')',t);
    if t not in ('funds_books','funds_locations') then
      execute format('create trigger funds_history_immutable before update or delete on public.%I for each row execute function public.expense_protect_history()',t);
    end if;
  end loop;
end $$;
