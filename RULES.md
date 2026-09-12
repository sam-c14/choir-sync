# Agent Rules — Choir Part Tracker

## Project structure & stack

- Workspace: Nx Monorepo (choir-client, choir-api, libs/shared).
- Backend: Express only. Never introduce NestJS or mix its conventions in.
- Validation: Always use shared Zod schemas from `libs/shared/validation`. Never define a local/inline schema that duplicates or bypasses one that belongs there — extend the shared schema instead. Use the `api-endpoint-scaffold` skill when adding or changing an endpoint.
- Database: PostgreSQL with Prisma; use `DATABASE_URL` (pooled, PgBouncer) for the running app and `DIRECT_URL` (direct connection) only for migrations. Use the `prisma-create-migration` skill for schema changes.
- Frontend: shadcn/ui + Tailwind CSS + clsx/tailwind-merge (via the `cn()` helper) + react-hook-form with `@hookform/resolvers/zod` bound to the shared schemas. Use the `shadcn-component-add` skill when touching UI primitives.

## Destructive & high-risk actions require explicit approval

- Never modify `choir-api/src/prisma/schema.prisma` without first flagging the change and getting explicit approval — schema changes ripple into the shared Zod schemas, the API, and the frontend.
- Never run `prisma migrate reset` or any other destructive database command without the same-turn human confirmation described in the `prisma-safe-reset` skill. A vague instruction like "fix the migration" does not count as authorization.
- Never install a new dependency (npm package, shadcn component that pulls in a new primitive, etc.) without flagging it first and stating why it's needed.
- Never commit or print the contents of a real `.env` file, `JWT_SECRET`, or database credentials in any artifact, log, or diff. Use the `env-config-audit` skill to check this before a deploy-readiness milestone.

## Honesty & verification

- Never claim a test was run, a build passed, or a milestone was verified unless it actually was, in this session. If you didn't run it, say so.
- Test every major milestone using automated terminal checks — use `nx-workspace-verify` for workspace-wide changes, `docker-build-test` for backend/deployment changes, `auth-guard-verify` for anything touching permissions, and `frontend-browser-verify` for anything touching the UI.
- If a requirement in the PRD or `EXECUTION.md` is ambiguous, or you're about to make a technical decision not spelled out there, stop and ask rather than deciding silently.

## Artifacts & pacing

- Generate Verifiable Artifacts: always output an Implementation Plan artifact before writing code for a milestone, and a Diff artifact before saving major file changes. Use the `milestone-report` skill for the exact format.
- Step-by-Step Tasking: do not attempt to build more than one milestone from `EXECUTION.md` at a time. Wait for my explicit approval after each milestone's summary before starting the next.
- Every milestone closes with the fixed-shape summary from `milestone-report`: **What I built / Deviations / Risks / Verification run / Decision needed**.
- Every milestone ends with a commit via the `commit-code` skill, only after its verification skill(s) have passed — never commit unverified work.
- Browser Verification: after completing a frontend milestone, use the integrated browser to open the local dev server and verify the specific UI elements listed for that milestone in `EXECUTION.md` (per the `frontend-browser-verify` skill) before marking it complete — not just that the page loads.
