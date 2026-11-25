---
paths:
  - "supabase/**"
---

# Database migrations

- Add new files named `YYYYMMDDNNNN_description.sql`; never edit or reorder an existing migration (cloud may already have it applied).
- Every user-data table needs an owner column, RLS enabled and explicit policies; runtime connects as the restricted API role, never `postgres`/`service_role`. Keep migration privileges separate from runtime.
- Make changes safe to roll forward and document rollback in `docs/05-deployment.md` or the module doc.
- Do not apply migrations, seeds or reset scripts to Supabase cloud and do not read `DATABASE_URL`. Prepare SQL for the owner to run; verify with `npm run test:db` (isolated local cluster that replays every migration in order).
- Backup/restore reads many tables: when adding a table, update the backup domain, restore lock order and `tests/backup-postgres.test.ts`.
