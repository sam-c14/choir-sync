---
name: docker-build-test
description: Build the choir-api Docker image locally and smoke-test it the same way Render will run it, before pushing or marking a backend milestone complete.
---

## When to use this
After any change to `choir-api`, its Dockerfile, or its dependencies — and always before marking a backend milestone "done" in a milestone report.

## Procedure
1. Build the image from the monorepo root (build context matters — Nx shared libs must be in scope): `docker build -f choir-api/Dockerfile -t choir-api:local .`

2. Run it against a **disposable dev database**, never the Render/Supabase production URL: `docker run --rm -p 3333:3333 --env-file choir-api/.env.local choir-api:local`

3. Watch the container logs for the `prisma migrate deploy` step — it must complete without error before the server starts. A silent failure here means the container "works" against a stale schema.
4. Once up, hit a real endpoint (not just a bare TCP check): `curl -i http://localhost:3333/api/v1/songs -H "Authorization: Bearer <test-jwt>"`. Expect `200` with a JSON array. Also confirm an unauthenticated request returns `401`, not `500`.

5. Tear the container down (`Ctrl+C` / `docker rm`).

## Definition of done
- Build completes with no errors.
- `prisma migrate deploy` succeeds inside the container.
- At least one authenticated and one unauthenticated request return the expected status.

## Common pitfalls
- Forgetting `--env-file`, so the container silently uses no `DATABASE_URL` and fails opaquely.
- Build context set to `choir-api` instead of the repo root — breaks because `libs/shared` isn't copied in.
- Pointing at the production `DATABASE_URL` "just to test" — never do this; use a separate dev/staging Supabase project or a local Postgres container.
- Treating "the container started" as success without actually curling an endpoint.