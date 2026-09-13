# EXECUTION.md — Choir Part Tracker Build Plan

This breaks `PRD.md` into milestones. **One milestone per session.** Each milestone ends with the `milestone-report` skill's fixed summary, and the agent stops and waits for explicit approval before starting the next one — see `.agent/rules.md`.

Do not skip ahead. Do not combine milestones "to save time." A milestone that hasn't been through its verification skill is not done, regardless of how confident the implementation looks.

---

## Milestone 0 — Workspace Scaffold
**PRD refs:** §4.1, §9.1–§9.3
**Goal:** Nx workspace exists with both apps and both shared libs generated and wired together.
**Do:**
- `npx create-nx-workspace@latest choir-workspace --preset=apps`
- Generate `apps/choir-api` (Express) and `apps/choir-client` (Next.js).
- Generate `libs/shared/types` and `libs/shared/validation`.
**Verify with:** `nx-workspace-verify`
**Done when:** `nx show projects` lists all four projects; a trivial import from `libs/shared/validation` works in both apps.

---

## Milestone 1 — Shared Contracts
**PRD refs:** §6
**Goal:** All Zod schemas and enums from §6 exist in `libs/shared/validation`, nowhere else.
**Do:** Implement `VoicePartTypeEnum`, `SongStatusEnum`, `SongComplexityEnum`, `LinkPlatformEnum`, `UserRoleEnum`, `CreateSongSchema`, `CreateSongPartSchema`, `CreateSongLinkSchema`, `UpdateSongSchema`, `UpdateSongPartSchema`, `LoginSchema`, and their inferred DTO types.
**Verify with:** `nx-workspace-verify` (schema-drift grep step)
**Done when:** every schema in §6 exists exactly once, and both apps can import from the shared lib without error.

---

## Milestone 2 — Database Layer
**PRD refs:** §5, §8.1
**Goal:** Prisma schema matches §5 exactly; first migration applied to a dev database.
**Do:** Write `schema.prisma` (User, Song, SongPart, SongLink, all enums); set up Supabase dev project; create the first migration.
**Verify with:** `prisma-create-migration` for the migration itself; keep `prisma-safe-reset` on hand but do not run it unless something breaks and you explicitly ask for it.
**Done when:** migration applied cleanly; `npx prisma studio` (or equivalent) shows the expected tables.

---

## Milestone 3 — Auth
**PRD refs:** §2, §4.2, §7 (auth row), §9.6
**Goal:** `POST /api/v1/auth/login` works; `requireAuth` and `requireRole` middleware exist; the Section-Leader-scoped check for voice parts is implemented.
**Do:** Password hashing (bcrypt), JWT issuance/verification, the two middleware functions, seed one Director user for testing.
**Verify with:** `api-endpoint-scaffold` while building it, then `auth-guard-verify` — the full role matrix must be run before this milestone is called done, not just the login endpoint itself.
**Done when:** the `auth-guard-verify` matrix is complete with no unresolved mismatches.

---

## Milestone 4 — Core API (Songs, Parts, Links)
**PRD refs:** §7
**Goal:** Every remaining row in the §7 endpoint table is implemented and guarded correctly.
**Do:** Songs CRUD, parts bulk-upsert and single-part update (with the leadsVoicePart check), links add/remove.
**Verify with:** `api-endpoint-scaffold` per endpoint, `auth-guard-verify` re-run against the full expanded matrix, `docker-build-test` once the module is complete.
**Done when:** every §7 endpoint matches its row exactly and passes the auth matrix.

---

## Milestone 5a — Frontend Design System Scaffold
**PRD refs:** §4.1, §4.3
**Goal:** `choir-client` (Vite + React 19) has Tailwind configured via `@nx/react:setup-tailwind`, shadcn/ui initialized and the full §4.3 component set added — scoped to `choir-client/` so Nx's own config isn't disturbed — and the `cn()` helper in place. Verified with a single rendered component before building real UI on top of it.
**Do:** `npx nx g @nx/react:setup-tailwind --project=choir-client`; `cd choir-client && npx shadcn@latest init`; `cd choir-client && npx shadcn@latest add button input textarea select form dialog card badge dropdown-menu sonner`; confirm `vite.config.ts`'s alias resolution (check for a conflict between `shadcn init`'s own edits and Nx's `nxViteTsPaths()` plugin, if present) before moving on.
**Verify with:** `shadcn-component-add`, `frontend-browser-verify` (dev server starts clean, no console errors, the placeholder component renders with real Tailwind styling).
**Done when:** the app renders a styled shadcn component with a clean console, and the actual file structure (confirmed: `src/app/app.tsx`, `src/styles.css`, not the originally assumed `src/App.tsx`/`src/index.css`) is reflected in `PRD.md`.

## Milestone 5b — Frontend Data Layer
**PRD refs:** §4.1, §4.3
**Goal:** The client can actually talk to the live API.
**Do:** `src/lib/api-client.ts` (Axios instance, `VITE_API_URL`, JWT header attachment per §4.4), `src/lib/query-keys.ts`, `src/hooks/use-songs.ts` (TanStack Query hooks: list/detail/create/update/delete).
**Verify with:** `nx-workspace-verify`
**Done when:** a bare page can fetch and render the live song list from the API — no styled UI required yet, that's Milestone 6.

---

## Milestone 6 — Frontend Features
**PRD refs:** §3.1–§3.4, §4.3
**Goal:** The full catalog experience — search, S/A/T filter chips, sort (Title / Recently Added / Complexity), add/edit song dialog with react-hook-form + zodResolver, inline part-notes editor scoped to the logged-in user's role, and the links section.
**Do:** Build the components listed in the PRD §4.1 tree under `songs/_components/`.
**Verify with:** `shadcn-component-add` as needed, `frontend-browser-verify` — walk every checklist item in that skill before calling this done.
**Done when:** `frontend-browser-verify`'s checklist passes with no console errors, and the UI's editable/read-only states match each seeded test user's role.

---

## Milestone 7 — Google SSO
**PRD refs:** §5 (User model), §6 (`GoogleAuthSchema`), §7 (auth row), §10
**Goal:** Users can sign in with Google as an alternative to email/password. Everything downstream of login (`AuthContext`, `requireAuth`, `requireRole`, the Section-Leader `leadsVoicePart` check) works identically regardless of which method was used.
**Do:**
- **Before writing any code**, confirm the §10.2 role-assignment policy for new Google sign-ins (default-to-CHORISTER, or Google Workspace domain restriction via the `hd` claim) — this is an open decision in the PRD, not yet settled. Surface it in the Implementation Plan artifact and get explicit approval on it specifically before proceeding, per rules.md's ambiguity rule.
- One-time manual setup (human, not agent): create the Google Cloud OAuth Client ID per §10.3, add `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID` to env config (local `.env` and eventually Render/Vercel).
- Prisma migration: add `provider` (`AuthProvider` enum: `LOCAL`/`GOOGLE`) and `googleId` fields to `User`, make `passwordHash` nullable — via `prisma-create-migration`, reviewing the generated SQL carefully since `passwordHash` is changing from required to optional on an existing table.
- Add `GoogleAuthSchema` to `libs/shared/validation` (§6) if not already present from the PRD write-up.
- Backend: `POST /api/v1/auth/google` — verify the ID token via `google-auth-library`'s `OAuth2Client.verifyIdToken()` (signature, `aud`, `iss`, `email_verified`), then create-or-link the `User` per §10.1's three cases, then issue the same JWT format as the existing login endpoint. Follow `api-endpoint-scaffold` for this.
- Frontend: install `@react-oauth/google`; add `<GoogleLogin>` to the login page; wire its success callback to `POST /api/v1/auth/google` and into the existing `AuthContext`/`api-client.ts` flow — no changes needed to anything downstream of "a JWT exists."
**Verify with:**
- `api-endpoint-scaffold` while building the endpoint.
- `auth-guard-verify` — re-run the full matrix, but this time include a seeded `GOOGLE`-provider user for at least one role (e.g. a Chorister who signed in via Google) and confirm their guard results are identical to a `LOCAL`-provider user of the same role. The thing being proven here is that `provider` never leaks into the permission logic.
- `frontend-browser-verify` — confirm the Google button renders correctly in both light and dark mode (per the design work from Milestone 6), and that a full Google sign-in round-trip lands the user in the catalog view with the correct role-based UI state.
**Done when:** both login paths produce functionally identical sessions, the auth matrix passes for both provider types, and the §10.2 policy decision is reflected in the actual implementation (not just documented as pending).

---

## Milestone 8 — Uniform Scheduling Module
**PRD refs:** §5 (`UniformSchedule`), §6 (`CreateUniformSchema`/`UpdateUniformSchema`), §7 (uniforms rows), §11
**Goal:** Directors can schedule and edit what's worn for upcoming/past services; everyone else can view it. Replaces the Excel-based tracking.
**Do:**
- Add the `UniformSchedule` model to `choir-api/src/prisma/schema.prisma` exactly as in §5 — migrate via `prisma-create-migration`.
- Add `CreateUniformSchema`/`UpdateUniformSchema` (and both DTO types) to `libs/shared/validation`, using `z.coerce.date()` for `serviceDate` — not `z.string().datetime()`.
- Implement `choir-api/src/modules/uniforms/` per `api-endpoint-scaffold`: `GET` open to any authenticated user, `POST`/`PATCH`/`DELETE` gated to `requireRole(DIRECTOR)`.
- Implement the `?filter=current|past|all` logic exactly per §11.2 — **the "current" comparison must use start-of-today, not the current timestamp**, or today's entry disappears from view on the day it's needed. Get this specific comparison right before moving to the frontend; it's the one part of this milestone that's easy to get subtly wrong and hard to notice without deliberately testing it on the actual boundary.
- Frontend: new `/uniforms` route in `routes.tsx` with a nav link; default view calls `?filter=current`, with a "View Past Entries" toggle switching to `?filter=past`. Add shadcn's `calendar` and `popover` components via `shadcn-component-add` (not part of the original Milestone 5a set) for the date picker in the Director's add/edit dialog, built with `react-hook-form` + `zodResolver(CreateUniformSchema)` matching the existing Song form pattern.
**Verify with:**
- `api-endpoint-scaffold` while building the endpoints.
- `auth-guard-verify` — extend the existing role matrix with the four `/uniforms` endpoints; confirm Chorister/Section Leader get 403 on all three write endpoints and 200 on `GET`, same shape as the Songs matrix.
- A dedicated boundary check as part of this milestone's own verification, not just `frontend-browser-verify`: seed one entry with `serviceDate` = today, and confirm it appears under `?filter=current` when tested at multiple times of day (not just once, right after seeding) — this is the one thing in this milestone actually worth a targeted manual check rather than trusting the general test suite.
- `frontend-browser-verify` for the UI itself (list rendering, the past/current toggle, the add-entry dialog and its validation).
**Done when:** the auth matrix passes for all four endpoints, the current/past boundary is confirmed correct at more than one point in the day, and a Director can create/edit/delete entries through the UI while other roles cannot.

---

## Milestone 9 — Deployment Readiness
**PRD refs:** §8
**Goal:** The app is actually deployable to Render + Vercel on the free tier, per §8, with no placeholder config left in place.
**Do:** Finalize the Dockerfile, set real Render/Vercel env vars (including `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID` and the production Google Cloud Console authorized origin), confirm CORS origin matches the real Vercel URL, seed the production Director user.
**Verify with:** `docker-build-test`, `env-config-audit`
**Done when:** both audits pass and a real deploy (or a full local simulation of one) succeeds end to end.