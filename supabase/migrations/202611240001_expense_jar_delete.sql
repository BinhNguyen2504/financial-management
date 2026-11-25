-- Soft delete for expense jars. Rows, month inputs, spends, audit and closed-year snapshots stay intact;
-- the application hides a deleted jar everywhere and refuses to delete a jar that appears in a closed year.
-- Rollback: alter table public.expense_jars drop column deleted; (only after restoring any deleted jar's data).
alter table public.expense_jars add column if not exists deleted boolean not null default false;
