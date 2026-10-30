-- Goals: additive owner-scoped data only. Never resets account data.
create table public.goals_books(owner_id uuid primary key references auth.users(id), version integer not null check(version>0));
create table public.goals_definitions(owner_id uuid not null references public.goals_books(owner_id),id uuid not null,data jsonb not null check(jsonb_typeof(data)='object'),primary key(owner_id,id));
create table public.goals_links(owner_id uuid not null,id text not null,goal_id uuid not null,source_kind text not null check(source_kind in ('savings','investments','funds')),source_id text not null,data jsonb not null,primary key(owner_id,id),foreign key(owner_id,goal_id) references public.goals_definitions(owner_id,id));
-- Typed references also protect source deletion by legacy maintenance tools.
-- Generated columns are derived metadata and are omitted from portable backups.
alter table public.goals_links
  add column savings_id uuid generated always as (case when source_kind='savings' then source_id::uuid end) stored,
  add column investment_id uuid generated always as (case when source_kind='investments' then source_id::uuid end) stored,
  add column fund_id text generated always as (case when source_kind='funds' then source_id end) stored,
  add foreign key(owner_id,savings_id) references public.savings_categories(owner_id,id),
  add foreign key(owner_id,investment_id) references public.investments_categories(owner_id,id),
  add foreign key(owner_id,fund_id) references public.funds_definitions(owner_id,id);
create table public.goals_transactions(owner_id uuid not null references public.goals_books(owner_id),id text not null,root_id text not null,sequence integer not null check(sequence>0),goal_id uuid not null,to_goal_id uuid,data jsonb not null,primary key(owner_id,id),unique(owner_id,sequence),foreign key(owner_id,root_id) references public.goals_transactions(owner_id,id),foreign key(owner_id,goal_id) references public.goals_definitions(owner_id,id),foreign key(owner_id,to_goal_id) references public.goals_definitions(owner_id,id));
create table public.goals_audit(owner_id uuid not null references public.goals_books(owner_id),version integer not null,data jsonb not null,primary key(owner_id,version));
create table public.goals_commands(owner_id uuid not null references public.goals_books(owner_id),id uuid not null,fingerprint text not null,result jsonb not null,primary key(owner_id,id));
create function public.goals_check_source() returns trigger language plpgsql set search_path='' as $$
declare present boolean;
begin
  if new.source_kind='savings' then select exists(select 1 from public.savings_categories where owner_id=new.owner_id and id::text=new.source_id) into present;
  elsif new.source_kind='investments' then select exists(select 1 from public.investments_categories where owner_id=new.owner_id and id::text=new.source_id) into present;
  else select exists(select 1 from public.funds_definitions where owner_id=new.owner_id and id=new.source_id) into present; end if;
  if not present then raise exception 'Goal source must belong to the same owner' using errcode='23503'; end if;
  return new;
end $$;
create trigger goals_source_owner before insert on public.goals_links for each row execute function public.goals_check_source();
do $$ declare t text; begin
  foreach t in array array['goals_books','goals_definitions','goals_links','goals_transactions','goals_audit','goals_commands'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to authenticated',t);
    execute format('create policy owner_access on public.%I for all to authenticated using (owner_id=auth.uid() and session_user=''expense_api'') with check (owner_id=auth.uid() and session_user=''expense_api'')',t);
    execute format('grant select,delete on public.%I to financial_data_reset',t);
    execute format('create policy reset_owner_access on public.%I for all to financial_data_reset using (owner_id=public.financial_request_owner() and session_user=''expense_api'') with check (owner_id=public.financial_request_owner() and session_user=''expense_api'')',t);
    if t not in ('goals_books','goals_definitions') then execute format('create trigger goals_history_immutable before update or delete on public.%I for each row execute function public.expense_protect_history()',t); end if;
  end loop;
end $$;
do $$ declare definition text := pg_get_functiondef('public.financial_data_fingerprint()'::regprocedure); begin
  execute replace(definition,'''funds_commands'']','''funds_commands'',''goals_books'',''goals_definitions'',''goals_links'',''goals_transactions'',''goals_audit'',''goals_commands'']');
end $$;
do $$
declare
  actor name := current_user;
  modern boolean := current_setting('server_version_num')::integer >= 160000;
  can_set boolean;
  own_membership boolean := false;
  had_create boolean := has_schema_privilege('financial_data_reset','public','CREATE');
  definition text := pg_get_functiondef('public.reset_financial_data(uuid,uuid)'::regprocedure);
begin
  if actor in ('anon','authenticated','expense_api','service_role','financial_data_reset') then
    raise exception 'Run this repair with the migration/admin connection' using errcode='42501';
  end if;
  if modern then
    can_set := pg_has_role(actor,'financial_data_reset','SET');
    select exists(select 1 from pg_auth_members
      where roleid='financial_data_reset'::regrole and member=actor::regrole and grantor=actor::regrole)
      into own_membership;
  else
    can_set := pg_has_role(actor,'financial_data_reset','MEMBER');
  end if;
  if not can_set then
    if modern then execute format('grant financial_data_reset to %I with set true granted by %I',actor,actor);
    else execute format('grant financial_data_reset to %I',actor); end if;
  end if;
  if not had_create then grant create on schema public to financial_data_reset; end if;
  set local role financial_data_reset;
  definition := replace(definition,'''funds_commands'']','''funds_commands'',''goals_books'',''goals_definitions'',''goals_links'',''goals_transactions'',''goals_audit'',''goals_commands'']');
  definition := replace(definition,'array[''funds_commands''','array[''goals_commands'',''goals_audit'',''goals_transactions'',''goals_links'',''goals_definitions'',''goals_books'',''funds_commands''');
  definition := replace(definition,'select * into op from public.data_resets','perform pg_advisory_xact_lock(hashtextextended(''goals:''||owner,0));
  select * into op from public.data_resets');
  execute definition;
  execute format('set local role %I',actor);
  if not had_create then revoke create on schema public from financial_data_reset; end if;
  if not can_set then
    if modern and own_membership then
      execute format('grant financial_data_reset to %I with set false granted by %I',actor,actor);
    elsif modern then execute format('revoke financial_data_reset from %I granted by %I',actor,actor);
    else execute format('revoke financial_data_reset from %I',actor); end if;
  end if;
end $$;
