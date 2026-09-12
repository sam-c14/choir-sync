---
name: api-endpoint-scaffold
description: The standard pattern for adding a new Express endpoint (routes -> controller -> service -> shared Zod DTO -> role guard) so every endpoint matches PRD §7 exactly and nothing bypasses shared validation.
---

## When to use this
Any time a new route is added to `apps/choir-api`, or an existing one is modified.

## Procedure
1. **Check for an existing shared schema first.** Look in `libs/shared/validation/src/index.ts` for a Zod schema matching this request/response shape. If one doesn't exist, add it there — never define a one-off `z.object` inside the API module.
2. **Route**: register the path and method in `<module>.routes.ts`, wiring middleware in this order: `requireAuth`, then the access-control check.
   - Look up the exact method, path, and access column for this endpoint in PRD §7 before writing the guard — don't improvise access rules.
   - For `PATCH /songs/:id/parts/:part`, the guard isn't just `requireRole("SECTION_LEADER")` — it must also check `req.user.leadsVoicePart === req.params.part` (or the user is a Director). This is the one endpoint in the PRD with a scoped, not just role-based, permission.
3. **Controller**: parse the request body with the shared Zod schema (`Schema.parse(req.body)`), call the service, shape the response. Controllers should not import `PrismaClient` directly.
4. **Service**: owns the Prisma call. Keep it in `<module>.service.ts`.
5. Cross-check the finished endpoint against the PRD §7 table row for method, path, and access before considering it done.

## Definition of done
- Endpoint matches its PRD §7 row exactly (method, path, access).
- Request validated via a schema from `libs/shared/validation`, not a local one.
- Controller has no direct Prisma import.
- A curl smoke test (or the `auth-guard-verify` skill, for anything with role restrictions) has been run against it.

## Common pitfalls
- Defining a quick inline Zod schema "just for this endpoint" instead of extending the shared one — this is exactly the drift the shared-validation rule exists to prevent.
- Skipping the role guard on a route because it "just needs to work for now."
- Implementing the Section-Leader part-notes endpoint as role-only, missing the `leadsVoicePart` scope check — this was the specific gap flagged in the original PRD review.