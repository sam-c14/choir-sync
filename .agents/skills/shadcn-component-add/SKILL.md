---
name: shadcn-component-add
description: Add or extend a shadcn/ui component without duplicating existing primitives or drifting from the project's configured style tokens.
---

## When to use this
Any time the frontend needs a new UI primitive (button, dialog, select, etc.) or a variant of one that already exists.

## Procedure
1. Check `apps/choir-client/components/ui/` first. If the component already exists (e.g. `button.tsx`), extend its variants in place rather than re-adding it.
2. If it genuinely doesn't exist, add it from the project root of the client app: `npx shadcn@latest add <component>`.
3. Confirm `components.json` still has the same `style` and `baseColor` as before the add — `shadcn add` shouldn't touch it, but verify rather than assume, especially if this is the first add after a version bump.
4. Wire any conditional styling through the existing `cn()` helper in `lib/utils.ts` (`clsx` + `tailwind-merge`) — don't hand-roll a second version of that logic in the new component.
5. If the component is used inside a form, bind it with shadcn's `<Form>` / `<FormField>` / `<FormControl>` primitives driven by `react-hook-form`, not a manually controlled `useState` input — this keeps validation errors flowing from the shared Zod schema through to the UI consistently.

## Definition of done
- No duplicate component definitions in `components/ui/`.
- `components.json` unchanged unless the change was intentional.
- New component styled via `cn()`, not a parallel styling approach.
- Any form usage goes through `react-hook-form` + the shadcn `Form` primitives.

## Common pitfalls
- Re-running `shadcn init` instead of `add`, which can overwrite existing configuration.
- Building a bespoke input with local state instead of hooking it into the existing `react-hook-form` context, which then silently falls out of sync with the Zod validation the rest of the form relies on.