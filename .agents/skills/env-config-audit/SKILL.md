---
name: env-config-audit
description: Catch misconfigured or missing environment variables before a milestone is marked deploy-ready. Free-tier Supabase/Render setups (pooled vs direct connection strings, CORS origin) are easy to get subtly wrong per PRD §8.
---

## When to use this
Before marking any deployment-related milestone complete, and any time an env var is added or changed.

## Procedure
1. Confirm `choir-api/.env.example` lists exactly the variables the code reads — no more, no less:
   `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `PORT`, `CORS_ORIGIN`.
   Grep `process.env.` across `choir-api/src` and diff the result against `.env.example`.
2. Confirm `DATABASE_URL` uses the pooled port (`6543`) and includes `?pgbouncer=true&connection_limit=1`; confirm `DIRECT_URL` uses the direct port (`5432`) and is referenced only by Prisma migrations, not by the running app.
3. Confirm `.env` (the real, secret-bearing file) is listed in `.gitignore` and does not appear in any diff artifact produced during the milestone.
4. Confirm `CORS_ORIGIN` is set to the actual Vercel deployment URL, not the PRD's placeholder (`https://your-choir-client.vercel.app`).
5. Confirm `JWT_SECRET` is a real generated value in every non-example env file, never a placeholder string like `"changeme"` left in past a first draft.

## Definition of done
- `.env.example` and actual code usage match exactly.
- Connection strings use the correct ports/params for their purpose.
- No secrets committed or shown in diffs.
- `CORS_ORIGIN` and `JWT_SECRET` are real values, not placeholders, by the time this is called "deploy-ready."

## Common pitfalls
- Leaving the placeholder `CORS_ORIGIN` from the PRD in place, which silently blocks the real frontend with CORS errors.
- Missing `pgbouncer=true`, which causes connection-pool exhaustion under Render's free-tier constraints.
- A `JWT_SECRET` that's the same across dev/staging/prod, or checked into `.env.example` with a real-looking value someone forgets to rotate.