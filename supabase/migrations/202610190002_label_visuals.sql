-- Presentation metadata only. Historical jar rules and closed snapshots stay intact.
alter table public.expense_labels add column if not exists brand_key text;
alter table public.expense_labels add column if not exists icon_key text;
alter table public.expense_labels add constraint expense_labels_visual_key_length
  check ((brand_key is null or length(brand_key) <= 100) and (icon_key is null or length(icon_key) <= 100));
