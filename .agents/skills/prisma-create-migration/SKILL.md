---
name: prisma-create-migration
description: Safely create and apply a new Prisma migration during development, and keep the shared Zod schemas in sync with any field changes. Never used against production data.
---

## When to use this
Whenever `apps/choir-api/src/prisma/schema.prisma` needs a new model, field, or index.

## Procedure
1. Confirm the active `DATABASE_URL`/`DIRECT_URL` point at a dev database — check the host string does not match the Supabase production project ref. If in doubt, ask before proceeding rather than assuming.
2. Create the migration with a descriptive name: `npx prisma migrate dev --name <descriptive_name> --schema=apps/choir-api/src/prisma/schema.prisma`.
3. Open the generated `prisma/migrations/<timestamp>_<name>/migration.sql` and read it before moving on. Flag anything unexpected — a `DROP COLUMN` or `DROP TABLE` you didn't intend is the most common way schema changes go wrong silently.
4. Regenerate the client: `npx prisma generate --schema=apps/choir-api/src/prisma/schema.prisma`.
5. **Sync check**: if the migration added/changed/removed a field, update the matching schema in `libs/shared/validation/src/index.ts` in the same milestone. A Prisma field with no corresponding Zod field (or vice versa) is schema drift and should be called out explicitly in the milestone report if not fixed immediately.
6. Never hand-edit a migration file that has already been applied — create a new migration instead.

## Definition of done
- Migration applied cleanly to the dev database.
- `migration.sql` reviewed, no unexpected destructive statements.
- Shared Zod schemas updated to match, or the mismatch is explicitly flagged.

## Common pitfalls
- Running against a shared or production `DATABASE_URL`.
- Adding a Prisma field and forgetting the corresponding Zod schema update, so the API silently accepts/rejects the wrong shape.
- Editing an already-applied migration file instead of creating a new one, which desyncs the migration history from the actual database state.