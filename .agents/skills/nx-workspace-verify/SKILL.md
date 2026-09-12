---
name: nx-workspace-verify
description: Confirm the Nx workspace is structurally healthy after scaffolding, adding a project, or changing shared libs — catches broken imports and schema drift between libs/shared and the apps that consume it.
---

## When to use this
After `nx generate` commands, after adding/moving a project, and after any change to `libs/shared/types` or `libs/shared/validation` (since both apps depend on them).

## Procedure
1. Confirm all expected projects are registered: `npx nx show projects`, Expect: `choir-client`, `choir-api`, `shared-types`, `shared-validation` (exact names per your `project.json` setup).
2. Run the full check across affected projects: `npx nx run-many -t lint,build,test --all`    Fail the milestone if any project errors — do not selectively re-run only the project you touched and call it done, since a shared-lib change can silently break the other app.
3. **Schema drift check** (this is the one that matters most given the "always use shared Zod schemas" rule): grep for any locally-redefined validation schema that duplicates something in `libs/shared/validation`: `grep -rn "z.object(" choir-api/src choir-client/app --include=".ts" --include=".tsx"`. Every hit should be inside `libs/shared/validation`, or a clear justification is required — a `z.object` in a controller or a form component is a sign the shared schema was bypassed.
4. Confirm `tsconfig.base.json` path aliases resolve for both shared libs — a missing alias update after adding a new lib is a common break.

## Definition of done
- `nx show projects` lists every expected project.
- `lint`, `build`, and `test` pass across all projects, not just the one changed.
- No stray `z.object` definitions outside `libs/shared/validation` without a documented reason in the milestone report.

## Common pitfalls
- Only running the affected-project subset and missing a break in the other app.
- A new lib added without updating `tsconfig.base.json` paths, so imports resolve locally in dev but fail in a clean build.