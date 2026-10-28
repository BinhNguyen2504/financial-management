-- Account display preferences; deliberately excluded from financial backups/emptiness.
create table public.overview_layouts (
  owner_id uuid primary key references auth.users(id),
  layout jsonb not null,
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now()
);
alter table public.overview_layouts enable row level security;
alter table public.overview_layouts force row level security;
revoke all on public.overview_layouts from anon, authenticated;
grant select, insert, update on public.overview_layouts to authenticated;
create policy owner_access on public.overview_layouts for all to authenticated
using (owner_id=auth.uid() and session_user='expense_api')
with check (owner_id=auth.uid() and session_user='expense_api');
