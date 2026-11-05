-- Run in the Supabase SQL Editor of the project used by the deployed website.
-- Inspect this schema-only result first; do not select financial rows.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'expense_labels'
  and column_name in ('brand_key', 'icon_key')
order by column_name;

-- One DO statement is atomic. Safe to repeat after a partial or full migration.
-- No financial data, RLS policies, role privileges or migration history change.
do $repair$
begin
  if to_regclass('public.expense_labels') is null then
    raise exception 'expense_labels is missing. Apply prerequisite migrations first.';
  end if;
  alter table public.expense_labels add column if not exists brand_key text;
  alter table public.expense_labels add column if not exists icon_key text;
  if (select count(*) from information_schema.columns
      where table_schema = 'public' and table_name = 'expense_labels'
        and column_name in ('brand_key', 'icon_key')
        and data_type = 'text' and is_nullable = 'YES') <> 2 then
    raise exception 'Unexpected visual column definition; inspect schema before continuing.';
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.expense_labels'::regclass
      and conname = 'expense_labels_visual_key_length'
  ) then
    alter table public.expense_labels
      add constraint expense_labels_visual_key_length
      check ((brand_key is null or length(brand_key) <= 100)
        and (icon_key is null or length(icon_key) <= 100));
  end if;
  alter table public.expense_labels validate constraint expense_labels_visual_key_length;
end
$repair$;

-- Expected: two nullable text columns, the validated length check, and RLS on.
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'expense_labels'
  and column_name in ('brand_key', 'icon_key')
order by column_name;
select conname, convalidated, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.expense_labels'::regclass
  and conname = 'expense_labels_visual_key_length';
select relrowsecurity as rls_enabled
from pg_class where oid = 'public.expense_labels'::regclass;
