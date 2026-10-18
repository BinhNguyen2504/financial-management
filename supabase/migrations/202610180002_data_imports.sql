-- Import receipts are operational metadata, not part of a portable financial backup.
create table public.data_imports (
  owner_id uuid not null references auth.users(id),
  id uuid not null,
  fingerprint text not null,
  result jsonb not null,
  imported_at timestamptz not null default now(),
  primary key(owner_id,id)
);
alter table public.data_imports enable row level security;
alter table public.data_imports force row level security;
revoke all on public.data_imports from anon, authenticated;
grant select, insert on public.data_imports to authenticated;
create policy owner_access on public.data_imports for all to authenticated
using (owner_id=auth.uid() and session_user='expense_api')
with check (owner_id=auth.uid() and session_user='expense_api');
create trigger data_imports_immutable before update or delete on public.data_imports
for each row execute function public.expense_protect_history();
