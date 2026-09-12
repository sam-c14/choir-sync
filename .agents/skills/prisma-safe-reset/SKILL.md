---
name: prisma-safe-reset
description: Reset a development database when migrations get into a bad state. This is the most destructive command in the toolchain and carries hard guardrails against ever touching production data.
---

## When to use this
Only when a dev database's migration history is broken beyond a normal `migrate dev`, and only on explicit human instruction given in the same turn — never as a side effect of "fixing" something else, and never proactively.

## Hard guardrails (non-negotiable)
- **Never run this against the Render/Supabase production database.** Before running anything, print the current `DATABASE_URL`/`DIRECT_URL` host back and require it to be visibly a dev/staging project, not the production one.
- **Never run this without an explicit, same-turn instruction** naming this action specifically (e.g. "reset the dev database"). A vague instruction like "fix the migration" is not sufficient authorization — ask first.
- If there is any ambiguity about which environment is currently configured, stop and ask rather than guessing.

## Procedure
1. Confirm the guardrails above are satisfied.
2. Run the reset: `npx prisma migrate reset --schema=choir-api/src/prisma/schema.prisma`. This drops the dev database, recreates it, reapplies every migration in order, and runs the seed script if one is configured.
3. Re-seed the one Director user (per PRD §9, step 10) so login isn't broken afterward.
4. Report exactly what was dropped, what was recreated, and confirm the seed ran.

## Definition of done
- Dev database is back to a clean, fully-migrated state.
- Seed data (at minimum the Director user) is present.
- The report explicitly states which database this ran against.

## Common pitfalls
- Treating this as a routine "unstick the migration" tool rather than a last resort — try resolving a specific broken migration first.
- Forgetting to re-seed, leaving the app in a state where nobody can log in.