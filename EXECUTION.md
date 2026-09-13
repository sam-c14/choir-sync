# EXECUTION.md — Choir Part Tracker Build Plan

This breaks `PRD.md` into milestones. **One milestone per session.** Each milestone ends with the `milestone-report` skill's fixed summary, and the agent stops and waits for explicit approval before starting the next one — see `RULES.md`.

Do not skip ahead. Do not combine milestones "to save time." A milestone that hasn't been through its verification skill is not done, regardless of how confident the implementation looks.

---

## Milestone 0 — Workspace Scaffold
**PRD refs:** §4.1, §9.1–§9.3
**Goal:** Nx workspace exists with both apps and both shared libs generated and wired together.
**Do:**
- `npx create-nx-workspace@latest choir-workspace --preset=apps`
- Generate `choir-api` (Express) and `choir-client` (Next.js).
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

## Milestone 5 — Frontend Foundation
**PRD refs:** §4.1, §4.3
**Goal:** Next.js app has shadcn/ui initialized, Tailwind configured, the `cn()` helper in place, an API client, and TanStack Query hooks for songs.
- [x] **Milestone 5a: Frontend Scaffold & Tooling** (Tailwind + shadcn + one component verification)
- [x] **Milestone 5b: Frontend Data Layer** (api-client.ts/query-keys.ts/use-songs.ts)
**Do:** `shadcn init` + add the component set from §4.3; `lib/utils.ts`, `lib/api-client.ts`, `hooks/use-songs.ts`.
**Verify with:** `shadcn-component-add` (for the initial component set), `nx-workspace-verify`
**Done when:** a bare catalog page can fetch and render the song list from the live API.

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

## Milestone 8 — Deployment Readiness
**PRD refs:** §8
**Goal:** The app is actually deployable to Render + Vercel on the free tier, per §8, with no placeholder config left in place.
**Do:** Finalize the Dockerfile, set real Render/Vercel env vars, confirm CORS origin matches the real Vercel URL, seed the production Director user.
**Verify with:** `docker-build-test`, `env-config-audit`
**Done when:** both audits pass and a real deploy (or a full local simulation of one) succeeds end to end.
