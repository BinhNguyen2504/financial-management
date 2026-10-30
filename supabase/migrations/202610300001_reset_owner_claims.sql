-- Managed Auth schemas cannot grant USAGE to this restricted reset role.
-- This forward repair reads only the verified server JWT context. It never calls reset.
do $$ begin
  if to_regprocedure('public.reset_financial_data(uuid,uuid)') is null then
    raise exception 'FINANCIAL_RESET_PREREQUISITE_MISSING: reset_financial_data'
      using hint='Apply 202610290002_financial_data_reset.sql first, then this repair.';
  end if;
end $$;

create or replace function public.financial_request_owner() returns uuid
language sql stable security invoker set search_path='' as $$
  select case when session_user='expense_api' then
    nullif(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub','')::uuid
  else null end
$$;
revoke all on function public.financial_request_owner() from public,anon,authenticated;
do $$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    revoke all on function public.financial_request_owner() from service_role;
  end if;
end $$;
grant execute on function public.financial_request_owner() to authenticated,financial_data_reset;

do $$ declare t text; signature text; definition text; begin
  foreach t in array array['expense_books','expense_jars','expense_month_inputs','expense_spends','expense_years','expense_labels','expense_audit','expense_commands','income_books','income_categories','income_monthly','income_oneoffs','income_audit','income_commands','savings_books','savings_categories','savings_transactions','savings_allocations','savings_prices','savings_closes','savings_audit','savings_commands','investments_books','investments_categories','investments_transactions','investments_valuations','investments_audit','investments_commands','funds_books','funds_definitions','funds_locations','funds_configurations','funds_transactions','funds_audit','funds_commands'] || array['data_generations','data_resets'] loop
    execute format('alter policy reset_owner_access on public.%I using (owner_id=public.financial_request_owner() and session_user=''expense_api'') with check (owner_id=public.financial_request_owner() and session_user=''expense_api'')',t);
  end loop;
  foreach signature in array array['public.financial_data_fingerprint()','public.expense_protect_history()','public.expense_immutable_year()'] loop
    select pg_get_functiondef(signature::regprocedure) into definition;
    execute replace(definition,'auth.uid()','public.financial_request_owner()');
  end loop;
end $$;

-- The definer belongs to the restricted role. Use temporary SET/schema CREATE,
-- preserve existing bootstrap/actor grants, and restore both before finishing.
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
  execute replace(definition,'auth.uid()','public.financial_request_owner()');
  execute format('set local role %I',actor);
  if not had_create then revoke create on schema public from financial_data_reset; end if;
  if not can_set then
    if modern and own_membership then
      execute format('grant financial_data_reset to %I with set false granted by %I',actor,actor);
    elsif modern then execute format('revoke financial_data_reset from %I granted by %I',actor,actor);
    else execute format('revoke financial_data_reset from %I',actor); end if;
  end if;
end $$;
