-- User's mark that a jar's monthly contribution has really been put in the jar.
-- null keeps the default: months before 2026-11, stopped jars, planned months and
-- accumulation jars that already recorded a usage count as funded; other months start unfunded.
-- Rollback: alter table public.expense_month_inputs drop column funded; (marked months then fall back to the default).
alter table public.expense_month_inputs add column if not exists funded boolean;
