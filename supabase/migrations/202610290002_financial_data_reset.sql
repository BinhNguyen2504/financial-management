-- Explicit user-requested financial reset. No service role or disabled RLS/triggers.
-- Apply prerequisite migrations in full before running this file in SQL Editor.
do $$ begin
  if to_regclass('public.data_imports') is null then
    raise exception 'FINANCIAL_RESET_PREREQUISITE_MISSING: public.data_imports'
      using errcode='P0001',
        hint='Run the complete migration 202610180002_data_imports.sql first, then rerun 202610290002_financial_data_reset.sql. No reset schema has been created by this attempt.';
  end if;
end $$;
do $$ begin
  if not exists(select 1 from pg_roles where rolname='financial_data_reset') then
    create role financial_data_reset nologin noinherit nobypassrls;
  end if;
end $$;
grant usage on schema public, auth to financial_data_reset;
grant create on schema public to financial_data_reset;
grant execute on function auth.uid() to financial_data_reset;
create table public.data_generations (
  owner_id uuid primary key references auth.users(id),
  generation integer not null check (generation > 0)
);
create table public.data_resets (
  owner_id uuid not null references auth.users(id), id uuid not null,
  generation integer not null check (generation >= 0), fingerprint text not null,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  request_id uuid, result jsonb, primary key(owner_id,id),
  check ((request_id is null) = (result is null))
);
alter table public.data_imports add column generation integer not null default 0;
do $$ declare t text; begin
  foreach t in array array['data_generations','data_resets'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('alter table public.%I force row level security',t);
    execute format('revoke all on public.%I from public, anon, authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
    execute format('create policy owner_access on public.%I for all to authenticated using (owner_id=auth.uid() and session_user=''expense_api'') with check (owner_id=auth.uid() and session_user=''expense_api'')',t);
    execute format('create policy reset_owner_access on public.%I for all to financial_data_reset using (owner_id=auth.uid() and session_user=''expense_api'') with check (owner_id=auth.uid() and session_user=''expense_api'')',t);
  end loop;
end $$;
grant insert on public.data_resets to authenticated;
grant select, insert, update on public.data_generations to financial_data_reset;
grant select, update on public.data_resets to financial_data_reset;
do $$ declare t text; begin
  foreach t in array array['expense_books','expense_jars','expense_month_inputs','expense_spends','expense_years','expense_labels','expense_audit','expense_commands','income_books','income_categories','income_monthly','income_oneoffs','income_audit','income_commands','savings_books','savings_categories','savings_transactions','savings_allocations','savings_prices','savings_closes','savings_audit','savings_commands','investments_books','investments_categories','investments_transactions','investments_valuations','investments_audit','investments_commands','funds_books','funds_definitions','funds_locations','funds_configurations','funds_transactions','funds_audit','funds_commands'] loop
    execute format('grant select, delete on public.%I to financial_data_reset',t);
    execute format('create policy reset_owner_access on public.%I for all to financial_data_reset using (owner_id=auth.uid() and session_user=''expense_api'') with check (owner_id=auth.uid() and session_user=''expense_api'')',t);
  end loop;
end $$;
-- Hash all stored rows, including history; identifiers come only from this allowlist.
create function public.financial_data_fingerprint() returns text
language plpgsql set search_path='' as $$
declare t text; rows text; payload text := ''; owner uuid := auth.uid();
begin
  if owner is null or session_user <> 'expense_api' then raise exception 'Reset access denied' using errcode='42501'; end if;
  foreach t in array array['expense_books','expense_jars','expense_month_inputs','expense_spends','expense_years','expense_labels','expense_audit','expense_commands','income_books','income_categories','income_monthly','income_oneoffs','income_audit','income_commands','savings_books','savings_categories','savings_transactions','savings_allocations','savings_prices','savings_closes','savings_audit','savings_commands','investments_books','investments_categories','investments_transactions','investments_valuations','investments_audit','investments_commands','funds_books','funds_definitions','funds_locations','funds_configurations','funds_transactions','funds_audit','funds_commands'] loop
    execute format('select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),''[]''::jsonb)::text from public.%I r where owner_id=$1',t) into rows using owner;
    payload := payload || t || ':' || rows || E'\n';
  end loop;
  return encode(sha256(convert_to(payload,'UTF8')),'hex');
end $$;
revoke all on function public.financial_data_fingerprint() from public;
grant execute on function public.financial_data_fingerprint() to authenticated, financial_data_reset;
-- DELETE is exceptional only under the non-login reset function owner.
create or replace function public.expense_protect_history() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' and current_user='financial_data_reset' and session_user='expense_api' and old.owner_id=auth.uid() then return old; end if;
  raise exception 'Expense audit and command history is append only' using errcode='23514';
end $$;
create or replace function public.expense_immutable_year() returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='DELETE' and current_user='financial_data_reset' and session_user='expense_api' and old.owner_id=auth.uid() then return old; end if;
  if old.closed_at is not null then raise exception 'Closed expense year is immutable' using errcode='23514'; end if;
  return new;
end $$;
create function public.reset_financial_data(operation_id uuid, reset_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare owner uuid := auth.uid(); op public.data_resets%rowtype; t text; n bigint; next_generation integer; answer jsonb;
begin
  if owner is null or session_user <> 'expense_api' then raise exception 'Reset access denied' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text,0));
  perform pg_advisory_xact_lock(hashtextextended('income:'||owner,0));
  perform pg_advisory_xact_lock(hashtextextended('savings:'||owner,0));
  perform pg_advisory_xact_lock(hashtextextended('investments:'||owner,0));
  perform pg_advisory_xact_lock(hashtextextended('funds:'||owner,0));
  select * into op from public.data_resets where owner_id=owner and id=operation_id for update;
  if not found then raise exception 'RESET_NOT_FOUND' using errcode='P0001'; end if;
  if op.result is not null then
    if op.request_id <> reset_request_id then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='P0001'; end if;
    return op.result;
  end if;
  if op.expires_at <= clock_timestamp() then raise exception 'RESET_EXPIRED' using errcode='P0001'; end if;
  if op.generation <> coalesce((select generation from public.data_generations where owner_id=owner),0)
     or op.fingerprint <> public.financial_data_fingerprint() then
    raise exception 'RESET_DATA_CHANGED' using errcode='P0001';
  end if;
  foreach t in array array['funds_commands','funds_audit','funds_transactions','funds_configurations','funds_locations','funds_definitions','funds_books','investments_commands','investments_audit','investments_valuations','investments_transactions','investments_categories','investments_books','savings_commands','savings_audit','savings_closes','savings_prices','savings_allocations','savings_transactions','savings_categories','savings_books','income_commands','income_audit','income_oneoffs','income_monthly','income_categories','income_books','expense_commands','expense_audit','expense_labels','expense_years','expense_spends','expense_month_inputs','expense_jars','expense_books'] loop
    execute format('delete from public.%I where owner_id=$1',t) using owner;
  end loop;
  foreach t in array array['expense_books','expense_jars','expense_month_inputs','expense_spends','expense_years','expense_labels','expense_audit','expense_commands','income_books','income_categories','income_monthly','income_oneoffs','income_audit','income_commands','savings_books','savings_categories','savings_transactions','savings_allocations','savings_prices','savings_closes','savings_audit','savings_commands','investments_books','investments_categories','investments_transactions','investments_valuations','investments_audit','investments_commands','funds_books','funds_definitions','funds_locations','funds_configurations','funds_transactions','funds_audit','funds_commands'] loop
    execute format('select count(*) from public.%I where owner_id=$1',t) into n using owner;
    if n <> 0 then raise exception 'RESET_MISMATCH' using errcode='P0001'; end if;
  end loop;
  next_generation := op.generation + 1;
  insert into public.data_generations(owner_id,generation) values(owner,next_generation)
    on conflict(owner_id) do update set generation=excluded.generation;
  answer := jsonb_build_object('empty',true,'dataGeneration',next_generation,'operationId',operation_id);
  update public.data_resets set request_id=reset_request_id,result=answer where owner_id=owner and id=operation_id;
  return answer;
end $$;
-- Configure ACL while the migration role still owns the function. Ownership
-- transfer on managed PostgreSQL also requires SET ROLE, even with ADMIN OPTION.
revoke all on function public.reset_financial_data(uuid,uuid) from public;
grant execute on function public.reset_financial_data(uuid,uuid) to authenticated;
do $$
declare
  actor name := current_user;
  can_set boolean;
  own_membership boolean := false;
  modern boolean := current_setting('server_version_num')::integer >= 160000;
begin
  if actor in ('anon','authenticated','expense_api','service_role') then
    raise exception 'Run this migration with the migration/admin connection' using errcode='42501';
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
    if modern then
      execute format('grant financial_data_reset to %I with set true granted by %I',actor,actor);
    else
      execute format('grant financial_data_reset to %I',actor);
    end if;
  end if;
  alter function public.reset_financial_data(uuid,uuid) owner to financial_data_reset;
  if not can_set then
    if modern and own_membership then
      -- Only SET changed; preserve pre-existing ADMIN/INHERIT and grantor records.
      execute format('grant financial_data_reset to %I with set false granted by %I',actor,actor);
    elsif modern then
      execute format('revoke financial_data_reset from %I granted by %I',actor,actor);
    else
      execute format('revoke financial_data_reset from %I',actor);
    end if;
  end if;
end $$;
revoke create on schema public from financial_data_reset;
