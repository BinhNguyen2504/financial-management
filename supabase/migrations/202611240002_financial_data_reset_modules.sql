-- Reset one or more modules instead of the whole account. The module list is stored with the prepared
-- operation (chosen before the confirmation step), so the confirm request cannot widen the scope.
-- Safe to run again. Rollback: apply the previous reset_financial_data definition from 202610300002_goals.sql, then
-- alter table public.data_resets drop constraint data_resets_modules_known, drop column modules; (only when no reset is pending).
do $$ begin
  if to_regprocedure('public.reset_financial_data(uuid,uuid)') is null
     or to_regprocedure('public.financial_request_owner()') is null
     or to_regclass('public.goals_books') is null then
    raise exception 'FINANCIAL_RESET_PREREQUISITE_MISSING: reset, owner-claims and goals migrations'
      using hint='Apply 202610290002, 202610300001 and 202610300002 first, then this migration.';
  end if;
end $$;

-- NULL keeps the meaning of every earlier row: the whole account.
alter table public.data_resets add column if not exists modules text[];
do $$ begin
  if not exists (select 1 from pg_constraint
    where conrelid='public.data_resets'::regclass and conname='data_resets_modules_known') then
    alter table public.data_resets add constraint data_resets_modules_known
      check (modules is null or (cardinality(modules) > 0 and modules <@ array['expense','income','savings','investments','funds','goals']::text[]));
  end if;
end $$;

-- The definer belongs to the restricted role: temporary SET/schema CREATE, restored afterwards
-- (same procedure as the earlier repairs).
do $$
declare
  actor name := current_user;
  modern boolean := current_setting('server_version_num')::integer >= 160000;
  can_set boolean;
  own_membership boolean := false;
  had_create boolean := has_schema_privilege('financial_data_reset','public','CREATE');
begin
  if actor in ('anon','authenticated','expense_api','service_role','financial_data_reset') then
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
    if modern then execute format('grant financial_data_reset to %I with set true granted by %I',actor,actor);
    else execute format('grant financial_data_reset to %I',actor); end if;
  end if;
  if not had_create then grant create on schema public to financial_data_reset; end if;
  set local role financial_data_reset;
  execute $definition$
create or replace function public.reset_financial_data(operation_id uuid, reset_request_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $body$
declare
  owner uuid := public.financial_request_owner();
  op public.data_resets%rowtype; t text; n bigint; next_generation integer; answer jsonb;
  all_modules constant text[] := array['expense','income','savings','investments','funds','goals'];
  -- Children first, module by module; the module is the table-name prefix.
  all_tables constant text[] := array['goals_commands','goals_audit','goals_transactions','goals_links','goals_definitions','goals_books','funds_commands','funds_audit','funds_transactions','funds_configurations','funds_locations','funds_definitions','funds_books','investments_commands','investments_audit','investments_valuations','investments_transactions','investments_categories','investments_books','savings_commands','savings_audit','savings_closes','savings_prices','savings_allocations','savings_transactions','savings_categories','savings_books','income_commands','income_audit','income_oneoffs','income_monthly','income_categories','income_books','expense_commands','expense_audit','expense_labels','expense_years','expense_spends','expense_month_inputs','expense_jars','expense_books'];
  selected text[];
begin
  if owner is null or session_user <> 'expense_api' then raise exception 'Reset access denied' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text,0));
  perform pg_advisory_xact_lock(hashtextextended('income:'||owner,0));
  perform pg_advisory_xact_lock(hashtextextended('savings:'||owner,0));
  perform pg_advisory_xact_lock(hashtextextended('investments:'||owner,0));
  perform pg_advisory_xact_lock(hashtextextended('funds:'||owner,0));
  perform pg_advisory_xact_lock(hashtextextended('goals:'||owner,0));
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
  selected := coalesce(op.modules, all_modules);
  -- Goals reference Savings, Investments and Funds by foreign key, so they must go together.
  if not selected <@ all_modules
     or (selected && array['savings','investments','funds']::text[] and not ('goals' = any(selected))) then
    raise exception 'RESET_MODULES_INVALID' using errcode='P0001';
  end if;
  foreach t in array all_tables loop
    if split_part(t,'_',1) = any(selected) then
      execute format('delete from public.%I where owner_id=$1',t) using owner;
    end if;
  end loop;
  foreach t in array all_tables loop
    if split_part(t,'_',1) = any(selected) then
      execute format('select count(*) from public.%I where owner_id=$1',t) into n using owner;
      if n <> 0 then raise exception 'RESET_MISMATCH' using errcode='P0001'; end if;
    end if;
  end loop;
  next_generation := op.generation + 1;
  insert into public.data_generations(owner_id,generation) values(owner,next_generation)
    on conflict(owner_id) do update set generation=excluded.generation;
  answer := jsonb_build_object('empty', selected @> all_modules, 'dataGeneration', next_generation,
    'operationId', operation_id, 'modules', to_jsonb(selected));
  update public.data_resets set request_id=reset_request_id,result=answer where owner_id=owner and id=operation_id;
  return answer;
end $body$
  $definition$;
  execute format('set local role %I',actor);
  if not had_create then revoke create on schema public from financial_data_reset; end if;
  if not can_set then
    if modern and own_membership then
      execute format('grant financial_data_reset to %I with set false granted by %I',actor,actor);
    elsif modern then execute format('revoke financial_data_reset from %I granted by %I',actor,actor);
    else execute format('revoke financial_data_reset from %I',actor); end if;
  end if;
end $$;
