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

## Milestone 9 — User Management (Roles & Deletion)
**PRD refs:** §7 (users rows), §12
**Goal:** Directors can see all users, promote a Chorister to Section Leader (or Director), and delete a non-Director user — closing the gap §10.2 left open (Google SSO auto-provisions Choristers with no other way to manage them).
**Do:**
- Add `UpdateUserRoleSchema` to `libs/shared/validation` per §6/§12.2, including the `.refine()` requiring `leadsVoicePart` when `role === SECTION_LEADER`. No Prisma migration needed — the fields already exist.
- Implement `choir-api/src/modules/users/` per `api-endpoint-scaffold`: `GET /api/v1/users`, `PATCH /api/v1/users/:id/role`, and `DELETE /api/v1/users/:id` — all `requireRole(DIRECTOR)`. Confirm the `GET` response mapping explicitly excludes `passwordHash` and `googleId` — select only the safe fields, don't rely on Prisma's default and trim it later.
- Implement the "last Director" safety check per §12.2 on the role-update endpoint (409 if the update would leave zero Directors) before the write happens, not as a client-side-only guard.
- Implement `role !== SECTION_LEADER` clearing `leadsVoicePart` to `null` server-side, regardless of what the request body contains.
- Implement the delete endpoint's Director-protection rule: reject with 403 if the target's role is `DIRECTOR` — this is a fixed policy (any Director, not just "the last one"), and correctly blocks self-deletion as a side effect. Do not build support for deleting a Director in this milestone; that's explicitly deferred.
- Frontend: `/admin/users` route (Director-only, both nav visibility and route-level redirect), a `use-users.ts` TanStack Query hook (list, role-update, delete), and a table/list UI with a role `Select` per user (revealing a `leadsVoicePart` `Select` when `SECTION_LEADER` is chosen) plus a Delete action per row. The Delete action must be hidden entirely for Director rows, not just disabled. Add shadcn's `AlertDialog` via `shadcn-component-add` for a delete confirmation — this is a destructive, irreversible action.
**Verify with:**
- `api-endpoint-scaffold` while building the endpoints.
- `auth-guard-verify` — extend the matrix with all three endpoints; confirm non-Directors get 403 on all writes.
- Two targeted checks beyond the standard matrix, both worth testing deliberately rather than trusting the happy path: (1) attempt to demote the sole seeded Director and confirm 409; (2) attempt to delete a seeded Director (as another Director) and confirm 403, including a Director attempting to delete themselves.
- `frontend-browser-verify` for the admin UI — role changes, the delete confirmation dialog, and confirming the Delete action is genuinely absent (not just disabled) on Director rows.
**Done when:** the auth matrix passes, both safety checks (last-Director demotion, Director deletion) are proven to actually block their respective actions, and a Director can promote a Chorister and delete a non-Director user end-to-end through the UI.

---

## Milestone 10 — Deployment Readiness
**PRD refs:** §8
**Goal:** The app is actually deployable to Render + Vercel on the free tier, per §8, with no placeholder config left in place.
**Do:** Finalize the Dockerfile, set real Render/Vercel env vars (including `GOOGLE_CLIENT_ID`/`VITE_GOOGLE_CLIENT_ID` and the production Google Cloud Console authorized origin), confirm CORS origin matches the real Vercel URL, seed the production Director user.
**Verify with:** `docker-build-test`, `env-config-audit`
**Done when:** both audits pass and a real deploy (or a full local simulation of one) succeeds end to end.

## POST RELEASE MILESTONES

## Milestone 1 — External Song Auto-Fill (Spotify Integration)
**Goal:** Allow users to search an external music database to auto-populate the Create Song form.
**Do:** 
1. Add a proxy endpoint `GET /api/v1/external-music/search?q={query}` to `apps/choir-api` that calls the Spotify Web API (Search & Audio Features) to retrieve Title, Artist, BPM, and Key. Secure the Spotify Client ID/Secret in the backend `.env`.
2. In `apps/choir-client`, add an async search combobox at the top of the "Add Song" dialog.
3. When a search result is selected, use `react-hook-form`'s `setValue` to auto-populate the `title`, `composer`, `tempoBpm`, and `musicalKey` fields. 
4. The user must still be able to manually edit these fields and append voice parts before submitting via the standard `CreateSongSchema`.
**Verify with:** `api-endpoint-scaffold` for the proxy, and `frontend-browser-verify` to ensure the combobox correctly populates the form without triggering validation errors prematurely.
**Done when:** A user can search a song, click it, see the metadata fill the form, and successfully save it to the local database.

## MileStone 1 Prompt 

```bash
Execute Milestone 6.5 — External Song Auto-Fill (Spotify Integration).

Before you begin writing code, output a brief Implementation Plan.

I have generated my Spotify SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET and placed them in the apps/choir-api/.env file.

Backend Requirements (apps/choir-api):

Implement the Spotify Client Credentials flow to retrieve a bearer token. Cache this token in memory until it expires (usually 1 hour) to avoid spamming the Spotify auth endpoint.

Create the GET /api/v1/external-music/search?q={query} endpoint.

This endpoint must call the Spotify Search API for tracks, and then immediately call the Spotify Audio Features API for the top results to retrieve the tempo (BPM) and key/mode.

Map the Spotify integer key and mode into a standard musical string (e.g., 0 and 1 becomes C Major) so it satisfies our CreateSongSchema.

Return a clean array of results containing: title, composer (artist), musicalKey, and tempoBpm.

Frontend Requirements (apps/choir-client):

Add an async search combobox or search bar at the top of the existing "Add Song" form.

Wire it to the new backend endpoint using TanStack Query.

When a user selects a search result, use react-hook-form's setValue to auto-populate the title, composer, musicalKey, and tempoBpm fields.

Ensure this auto-fill does not block the user from manually typing their custom Soprano, Alto, and Tenor notes before submitting the form.

Verification:
Use api-endpoint-scaffold to verify the proxy routing, and run nx-workspace-verify to ensure no TypeScript compilation errors exist between the frontend and backend. Wait for my manual approval via the built-in browser before marking this milestone complete.
```

## Milestone 2 — YouTube Search & Unified Reference Links Integration
**Goal:** Extend external search to support YouTube, and ensure both Spotify and YouTube search results automatically append to the song's reference links.
**Do:**
1. Extend backend external music endpoints in `choir-api/` to integrate the YouTube Data API v3 (`search` endpoint, `part=snippet`, `type=video`), returning title, channel/artist, and video URL.
2. In `choir-client/`, update the search combobox to toggle between Spotify and YouTube sources.
3. Automatically append the selected Spotify track URL or YouTube video URL into the form's reference links array (`platform`: `SPOTIFY` or `YOUTUBE`).
4. Ensure the Song Details page renders reference links with appropriate platform badges/icons (YouTube, Spotify, Audiomack) and supports manual additions/removals.
**Verify with:** `api-endpoint-scaffold`, `nx-workspace-verify`, and manual browser verification.
**Done when:** Searching YouTube returns video results, picking a Spotify or YouTube result populates song metadata AND adds the URL into the reference links list, and links render correctly on the song details view.

```bash
Read PRD.md, RULES.md, and EXECUTION.md. Execute Milestone 2 — YouTube Search & Unified Reference Links Integration.

Before writing code, inspect the existing Spotify implementation in `choir-api/` and `choir-client/`, then output a brief Implementation Plan.

Note on workspace paths: Projects are located directly at `choir-api/`, `choir-client/`, and `libs/shared/` (not inside an `apps/` directory).

I have added `YOUTUBE_API_KEY` to `choir-api/.env`.

Backend Requirements (`choir-api/`):
1. Extend the external music module to include a YouTube service using the YouTube Data API v3 (`https://www.googleapis.com/youtube/v3/search`).
2. The endpoint should support searching YouTube: `GET /api/v1/external-music/search?q={query}&source=youtube` (or extend the existing search controller cleanly).
3. Query YouTube with `part=snippet`, `type=video`, and `maxResults=10`.
4. Return a normalized payload for each result:
   - `title`: Video title (unescaped HTML entities)
   - `composer`: Channel title / artist name
   - `youtubeUrl`: `https://www.youtube.com/watch?v=${videoId}`
   - `thumbnailUrl`: Video thumbnail URL

Frontend Requirements (`choir-client/`):
1. In the "Add Song" / "Edit Song" modal:
   - Add a source toggle to the search combobox allowing the user to select either "Spotify" or "YouTube".
   - When searching via Spotify: keep the existing behavior (populates title, artist, key, tempo) AND automatically append an entry to the song's `links` array with `platform: "SPOTIFY"` and the track's URL.
   - When searching via YouTube: populate `title` and `composer` (leave key/tempo blank or untouched) AND automatically append an entry to the `links` array with `platform: "YOUTUBE"` and the video URL.
   - Prevent duplicate URLs from being added to the links list if clicked multiple times.
2. Reference Links UI (`choir-client/`):
   - In the song creation/editing form, ensure users can still manually add, edit, or remove links for Spotify, YouTube, and Audiomack.
   - In the Song Details view, ensure all reference links display with corresponding platform badges/icons (YouTube, Spotify, Audiomack) and open in a new tab safely.

Verification:
1. Run `nx-workspace-verify` to ensure no TypeScript compilation or contract errors.
2. Verify that existing Spotify search functionality continues working unchanged.
3. Test a YouTube query and confirm that selecting a video properly populates form fields and the reference links list.
```

## Milestone 3 — Automated Lyrics Auto-Fill (LRCLIB Integration)
**Goal:** Automatically fetch and populate plain-text lyrics using the open-source LRCLIB API when a song is selected via external search.
**Do:**
1. In `choir-client/`, implement a lyrics fetch utility querying `https://lrclib.net/api/get?track_name={title}&artist_name={artist}`.
2. Hook this utility into the external search selection workflow in the "Add/Edit Song" modal.
3. Automatically set the form's `lyrics` field via `react-hook-form`'s `setValue` using the returned `plainLyrics`.
4. Wrap the request in resilient error handling: silently catch `404 Not Found` or network errors without raising UI error toasts, ensuring the textarea remains cleanly open for manual input.
**Verify with:** `frontend-browser-verify` and `nx-workspace-verify`.
**Done when:** Selecting a recognizable track populates the lyrics field automatically, while selecting an unindexed track leaves the field empty and editable without console or UI errors.

## Milestone 3 Prompt

```bash
Read PRD.md, RULES.md, and EXECUTION.md. Execute Milestone 3 — Automated Lyrics Auto-Fill (LRCLIB Integration).

Before writing code, inspect the external search and song form handlers in `choir-client/`, then output a brief Implementation Plan.

Note on workspace paths: Projects are located directly at `choir-client/`, `choir-api/`, and `libs/shared/` (not inside an `apps/` directory).

Requirements (`choir-client/`):
1. In `choir-client/`, locate the song form component (used in "Add Song" / "Edit Song") where external search results (Spotify/YouTube) are selected and mapped to form fields via `react-hook-form`.
2. Add a helper function to query the free LRCLIB API:
   - Endpoint: `https://lrclib.net/api/get`
   - Method: `GET`
   - Query Parameters: `track_name` (URI encoded) and `artist_name` (URI encoded)
3. When a track is selected from search results:
   - Extract the cleaned title and composer/artist.
   - Fire the LRCLIB request asynchronously.
   - If the request returns a `200 OK` response with a valid `plainLyrics` property, use `setValue("lyrics", data.plainLyrics)` to populate the lyrics textarea.
4. Error Handling & Edge Cases:
   - Wrap the fetch call in a strict `try/catch` block.
   - If LRCLIB returns a `404`, an empty payload, or a network failure, silently ignore it. Do NOT display an error toast or alert to the user.
   - Ensure the lyrics `<textarea>` remains fully editable at all times so the user can manually type or adjust lyrics.
   - Do not overwrite existing lyrics if a user has already manually typed in the field, unless explicitly selecting a new track from the combobox.

Verification:
1. Run `nx-workspace-verify` to ensure TypeScript compilation passes.
2. Verify with `frontend-browser-verify` that selecting an indexed song populates the lyrics field.
3. Verify that selecting a song without available lyrics fails silently and leaves the input field ready for manual entry.
```

## Followup Prompt

```bash
Update the URL input for Youtube and Spotify Song selection on the Song details Page to not use a direct search bar but when it's Youtube or Spotify, it should show, 'Search for a Song' as a placeholder and when it is clicked on, it should show a modal which would contain a search bar with an empty state(must be beautiful) under it and after the user's input and the items have been fetched, they should be populated and the empty state swapped out, it should also have a fixed height, so the modal does not overflow, and when one of the items is selected, the modal should close and the placeholder text should be swapped out with the link, then when the user clicks the Add button, the rewuest should fire like normal and the link should be added, note that even after selecting a link and the modal closes, if the user clicks on the modal trigger again, it should still open the modal and allow the user to search again, although, the previous state should still be kept in local state so that if the user comes back, they still see their previous query with the items that was previously fetched, after the request has been sent, the local state can then be cleared.

Also, increase the debounce across all frontend instances of the debounce function usage and ensure the debounce function is working properly
```

## Milestone 4 — Playlists, Quick-Add Bridge & Mobile Rehearsal Reader
**Goal:** Enable playlist creation with auto-add fallbacks and transform the song part view into a responsive, mobile-first reader.
**Do:**
1. Add `Playlist` and `PlaylistSong` models to `choir-api/src/prisma/schema.prisma` and create migrations.
2. Implement backend CRUD endpoints at `/api/v1/playlists`.
3. In `choir-client/`, build the playlist management UI with quick-add song integration: if a search yields no results in the playlist builder, offer an inline "Create & Add to Setlist" modal.
4. Replace the raw textboxes in the song view with a mobile-optimized Rehearsal Reader: swipeable S/A/T tabs, large formatted sol-fa blocks, and an edit mode toggle scoped to section leaders and directors.
**Verify with:** `api-endpoint-scaffold`, `nx-workspace-verify`, and manual browser responsive testing.

## Followup Prompt

```bash
Read PRD.md, RULES.md, and EXECUTION.md. In the Post Release Milestones, Execute Milestone 4 — Playlists, Quick-Add Bridge & Mobile Rehearsal Reader.

Paths reminder: Root-level structure `choir-api/`, `choir-client/`, `libs/shared/` (no `apps/`).

Tasks:
1. Backend (`choir-api/`):
   - Add `Playlist` and `PlaylistSong` models to `schema.prisma`.
   - Create and execute migration via `prisma-create-migration`.
   - Implement playlist routes: `GET /api/v1/playlists`, `POST /api/v1/playlists`, `GET /api/v1/playlists/:id`, `PATCH /api/v1/playlists/:id`, `DELETE /api/v1/playlists/:id`.
   - Allow adding/reordering songs in a playlist (`POST /api/v1/playlists/:id/songs`).

2. Frontend (`choir-client/`):
   - Build a Playlists page (`/playlists`) and Playlist Details view (`/playlists/[id]`).
   - In the playlist song selector: if a song title search yields no results, display an inline "Add New Song to Repertoire & Playlist" option that triggers the Create Song modal, passing the current playlist ID to automatically link it upon save.
   - Refactor Song Details View (`/songs/[id]`):
     - Replace raw part textboxes with a dedicated "Rehearsal Reader Mode".
     - Build mobile tab navigation for [Soprano | Alto | Tenor | Lyrics].
     - Display tonic sol-fa in high-contrast, large monospaced font with distinct line breaks.
     - Add an "Edit Mode" toggle visible ONLY to Directors and Section Leaders (scoped to their voice part).

Verify with `nx-workspace-verify` and browser checks for mobile layout responsiveness.
```

---

## Milestone 5 — Voice Part Audio Snippets (Supabase Signed Upload URLs)
**Goal:** Allow choristers and leaders to record and attach quick audio references (max 60s) to voice parts using secure, backend-minted Supabase Signed Upload URLs.
**Do:**
1. Add `VoiceSnippet` model to Prisma schema and run migrations.
2. Ensure `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` exist in `choir-api/.env`.
3. In `choir-api/`, create an endpoint `POST /api/v1/song-parts/:partId/snippets/upload-url`:
   - Validates user session.
   - Calls `supabaseAdmin.storage.from('choir-tracker-dev-bucket').createSignedUploadUrl(filePath)`.
   - Returns `{ signedUrl, path, token }`.
4. In `choir-api/`, create `POST /api/v1/song-parts/:partId/snippets` to record metadata (`audioUrl`, `durationSec`, `title`) once upload succeeds.
5. In `choir-client/`, build the 60-second `MediaRecorder` UI. After recording:
   - Request signed URL from backend.
   - `PUT` the audio blob directly to the signed URL.
   - Post metadata to save the snippet to database.
   - Render inline audio player on the voice part tab.
**Verify with:** Browser recording test, zero RLS errors, verify file lands in Supabase bucket and DB record is created.

## Followup Prompt

```bash
Read PRD.md, RULES.md, and EXECUTION.md. Execute Milestone 9 — Voice Part Audio Snippets (Supabase Signed Upload URLs).

Paths reminder: Root-level structure `choir-api/`, `choir-client/`, `libs/shared/` (no `apps/`).

We are using Supabase Signed Upload URLs. This keeps storage uploads strictly controlled by our Express backend auth, avoids writing manual Supabase RLS policies, and streams the upload directly from client to Supabase to keep Render RAM usage at zero.

Backend Tasks (`choir-api/`):
1. Add `VoiceSnippet` model to `schema.prisma`:
   - Fields: `id`, `songPartId` (relation to SongPart, onDelete: Cascade), `userId` (relation to User), `audioUrl`, `durationSec`, `title`, `createdAt`.
   - Run migration via `prisma-create-migration`.
2. Initialize Supabase Admin client in `choir-api/src/lib/supabase.ts` using `process.env.SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY`.
3. Create endpoint `POST /api/v1/song-parts/:partId/snippets/upload-url`:
   - Authenticated users only.
   - Generate unique path: `snippets/${partId}/${Date.now()}-${req.user.id}.webm`.
   - Call `supabaseAdmin.storage.from('choir-tracker-dev-bucket').createSignedUploadUrl(filePath)`.
   - Return `{ signedUrl: data.signedUrl, path: data.path, publicUrl: ... }`.
4. Create endpoint `POST /api/v1/song-parts/:partId/snippets`:
   - Saves snippet record (`audioUrl`, `durationSec`, `title`, `userId`, `songPartId`) to PostgreSQL.
5. Create endpoint `DELETE /api/v1/snippets/:id`:
   - Only the creator or a Director can delete. Deletes from DB and removes the file from Supabase storage via `supabaseAdmin.storage.from('choir-tracker-dev-bucket').remove([path])`.

Frontend Tasks (`choir-client/`):
1. In the Rehearsal Reader (`/songs/[id]`), add an "Add Audio Reference" trigger button to each voice part tab.
2. Build an audio recorder widget:
   - Uses browser `navigator.mediaDevices.getUserMedia({ audio: true })`.
   - 60-second limit with visible countdown timer.
   - Preview, Re-record, and Save actions.
3. Upload Flow on Save:
   - Call backend `POST /api/v1/song-parts/:partId/snippets/upload-url` to get the signed URL.
   - Upload the recorded blob directly to the signed URL via HTTP `PUT` (or `supabase.storage.from('choir-tracker-dev-bucket').uploadToSignedUrl(...)`).
   - On success, call backend `POST /api/v1/song-parts/:partId/snippets` with `audioUrl` and duration.
4. UI Playback:
   - Render a mini audio player (play/pause toggle, progress bar, duration) for all existing snippets on that part.

Verify with `nx-workspace-verify`.
```

---

## Milestone 6 — Sunday Roster, Confirmation Modal & In-App Notifications
**Goal:** Implement service roster assignments, intentional confirmation modals, and zero-cost in-app notifications.
**Do:**
1. Add `ServiceRoster`, `RosterMember`, and `Notification` models to `schema.prisma`.
2. Implement endpoints to manage rosters and query user notifications (`GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`).
3. Build the Roster Assignment UI inside the Playlist view allowing Directors to assign vocalists to Soprano, Alto, Tenor, or Lead.
4. Implement the intentional dispatch confirmation modal. Upon confirmation, batch-insert notification rows for all assigned users.
5. Add a Notification Bell icon with an unread badge to the mobile navigation bar.
**Verify with:** Role testing: assign users as Director, verify receipt of in-app notifications on assigned member accounts.

## Followup Prompt
```bash
Read PRD.md, RULES.md, and EXECUTION.md. In Post Release Milestones, Execute Milestone 6 — Sunday Roster, Confirmation Modal & In-App Notifications.

Tasks:
1. Backend (`choir-api/`):
   - Add `ServiceRoster`, `RosterMember`, and `Notification` models to `schema.prisma` and run migration.
   - Implement roster assignment routes under playlists: `POST /api/v1/playlists/:id/roster`.
   - Implement notification routes: `GET /api/v1/notifications`, `PATCH /api/v1/notifications/:id/read`, `PATCH /api/v1/notifications/read-all`.
   - Implement a dispatch route: `POST /api/v1/playlists/:id/roster/dispatch`. This validates that the caller is a Director, marks roster members as `notified = true`, and batch-creates records in `Notification` table for all assigned choristers.

2. Frontend (`choir-client/`):
   - In Playlist Details, add a "Sunday Team Roster" panel allowing the Director to assign choir members to roles (`SOPRANO`, `ALTO`, `TENOR`, `LEAD`).
   - Add a "Notify Team" trigger button.
   - Clicking it MUST open an Intentional Confirmation Modal showing a summary: total singers, assigned roles, and service date.
   - On confirmation, fire the dispatch endpoint and show a success toast.
   - Add a Notification Bell to the top navbar with an active unread count badge and a popover listing recent notifications with deep links.

Verify with `nx-workspace-verify` and test the notification flow between two user accounts.
```
---

## Milestone 7 — AI Worship Curator & Song Discovery
**Goal:** Integrate Gemini 2.0 Flash via Google AI Studio free tier to suggest setlists and recommend repertoire based on season, theme, or vibe.
**Do:**
1. Secure `GEMINI_API_KEY` in `choir-api/.env`.
2. Add backend endpoint `POST /api/v1/ai/curate-setlist` and `POST /api/v1/ai/discover-songs`.
3. In `choir-api/`, implement a service passing the current catalog metadata (titles, tempos, keys, tags) to Gemini using structured JSON output schemas (`responseSchema`).
4. In `choir-client/`, build an "AI Curator" slide-over sheet in the Playlists section offering scenario buttons (Thanksgiving, Praise Night, Communion) and custom vibe inputs.
5. Enable one-click conversion from AI suggestions into drafted playlists.
**Verify with:** `api-endpoint-scaffold`, JSON schema conformance checks, and rate-limit error handling.

## Followup Prompt

```bash
Read PRD.md, RULES.md, and EXECUTION.md. In Post Release Milestones, Execute Milestone 7 — AI Worship Curator & Song Discovery.

Note: Use the free Google Gemini API (`@google/genai` or standard `fetch` to Google AI Studio). Backend holds `GEMINI_API_KEY` in `choir-api/.env`.

Tasks:
1. Backend (`choir-api/`):
   - Add endpoint `POST /api/v1/ai/curate-setlist` accepting `{ theme, serviceType, targetCount }`.
   - Query existing songs from the database (`title`, `musicalKey`, `tempoBpm`, `tags`).
   - Call Gemini (model: `gemini-2.5-flash` or `gemini-1.5-flash`) with structured output instructions: select a cohesive setlist from the existing library matching the theme and flow (e.g. Opening Praise -> Mid-Tempo -> Worship).
   - If the catalog is small, allow Gemini to also suggest 1–2 external songs that fit the theme well.
   - Return structured JSON: `{ setlistTitle, explanation, songs: [{ songId, title, reason, suggestedOrder }] }`.

2. Frontend (`choir-client/`):
   - On the Playlists page, add an "AI Setlist Assistant" modal or drawer.
   - Include preset tags: [Thanksgiving, High Praise, Communion, Easter, Reflective Worship].
   - Allow user custom prompts (e.g., "Fast tempo Nigerian praise medley opening").
   - Display the AI recommendation as a reviewable checklist.
   - Add a "Create Playlist from This" button that immediately initializes a new playlist with the selected songs in the suggested order.

Verify with `nx-workspace-verify` and ensure graceful error handling if rate limits or network issues occur.
```

---

## Milestone 8 — One-Click WhatsApp Broadcast Formatter
**Goal:** Auto-generate complete Sunday morning summary texts with uniform schedules, setlists, and deep links.
**Do:**
1. Implement a client-side formatting engine combining `UniformSchedule`, `Playlist`, and `ServiceRoster` data for a selected date.
2. Structure the formatted output: Date, Male/Female dress codes, ordered songs with rehearsal deep-links, and assigned vocal leads.
3. Build the Broadcast Preview Card with "Copy to Clipboard" (with toast feedback) and "Send via WhatsApp" deep-link integration (`https://wa.me/?text=...`).
**Verify with:** Copy-to-clipboard functionality across mobile and desktop browsers, ensuring correct URL encoding and layout rendering.

## Followup Prompt

```bash
Read PRD.md, RULES.md, and EXECUTION.md. In Post Release Milestones, Execute Milestone 8 — One-Click WhatsApp Broadcast Formatter.

Tasks:
1. Formatter Logic (`choir-client/src/lib/broadcast-formatter.ts`):
   - Create a utility that accepts `serviceDate`, `UniformSchedule`, `Playlist` (with songs and custom keys), and `ServiceRoster`.
   - Compile a clean, markdown-friendly text block:
     ```text
     *DGC WORSHIP TEAM BRIEFING — [Date]*
     ----------------------------------------
     👗 *UNIFORM:*
     • Female: [Female Outfit]
     • Male: [Male Outfit]
     
     🎶 *MINISTRATION SETLIST:*
     1. [Song Title] (Key: [Key]) — Lead: [Lead Name]
        🔗 [App Song Rehearsal Deep Link]
     2. [Song Title] (Key: [Key]) — Lead: [Lead Name]
        🔗 [App Song Rehearsal Deep Link]
     
     👥 *ROSTER ASSIGNMENTS:*
     • Soprano: [Names]
     • Alto: [Names]
     • Tenor: [Names]
     
     Please review your parts on the choir portal before rehearsal!
     ```

2. UI Integration (`choir-client/`):
   - On the Playlist details page, add a "Share / Broadcast" button.
   - Open a modal displaying a live preview of the formatted broadcast message.
   - Include a "Copy Text" button (using `navigator.clipboard.writeText` with toast confirmation).
   - Include an "Open WhatsApp" button linking to `https://wa.me/?text=${encodeURIComponent(formattedText)}`.

Verify with `nx-workspace-verify` and confirm mobile clipboard and WhatsApp link behavior.
```

## Milestone 9 — Active Sunday Playlist Sync
**Goal:** Reconcile Playlists with the "Active Sunday Songs" state on the Songs page so marking a playlist as the Active Lineup automatically synchronizes the active Sunday songs across the app.
**Do:**
1. Add `isActive Boolean @default(false)` to the `Playlist` model in `schema.prisma` and run migration.
2. In `choir-api/`, create `PATCH /api/v1/playlists/:id/active` to toggle a playlist as the single active Sunday lineup inside a Prisma `$transaction`, automatically syncing the active Sunday boolean on the underlying `Song` records.
3. Hook into the Playlist add-song and remove-song controllers: if the target playlist has `isActive: true`, automatically mark the added/removed song as active/inactive for Sunday.
4. Hook into the Song active-status toggle controller: if a song is manually toggled on the Songs page and an active Playlist exists, automatically add or remove that song from the active Playlist.
5. In `choir-client/`, add a prominent "Set as Active Sunday Lineup" toggle/badge in the Playlist Details header and an "Active Sunday Lineup" badge on the Playlists index card.
**Verify with:** `nx-workspace-verify` and browser verification confirming that activating a playlist or modifying its songs immediately updates the Active Sunday Songs view on the `/songs` page.

## Followup Prompt

```bash
Read PRD.md, RULES.md, and EXECUTION.md. Execute Milestone 8.5 — Active Sunday Playlist Sync.

Before writing code, inspect `choir-api/src/prisma/schema.prisma`, the Song controller/routes, and the Playlist controller/routes to see how "Active Sunday Songs" are currently stored and queried on the Songs page, then output a brief Implementation Plan.

Paths reminder: Projects are located at `choir-api/`, `choir-client/`, and `libs/shared/` (not inside `apps/`).

Tasks:
1. Database (`choir-api/src/prisma/schema.prisma`):
   - Add `isActive Boolean @default(false)` to the `Playlist` model.
   - Run the Prisma migration (`prisma-create-migration`).

2. Backend Synchronization (`choir-api/`):
   - Create an endpoint `PATCH /api/v1/playlists/:id/active` (Director role only) accepting `{ isActive: boolean }`.
   - Inside a single `prisma.$transaction`:
     - If `isActive` is `true`:
       1. Set `isActive = false` on all other `Playlist` records (`updateMany`).
       2. Set `isActive = true` on the target `Playlist`.
       3. Reset the Sunday active flag on all `Song` records to `false`, then set it to `true` for all `songId`s currently inside this playlist's `PlaylistSong` list.
     - If `isActive` is `false`:
       1. Set `isActive = false` on the target `Playlist`.
       2. Reset the Sunday active flag on all `Song` records in this playlist to `false`.
   - Live Mutation Sync:
     - In the endpoint that adds a song to a playlist (`POST /api/v1/playlists/:id/songs`): check if the playlist has `isActive === true`. If so, also update that `Song` record's Sunday active flag to `true`.
     - In the endpoint that removes a song from a playlist (`DELETE /api/v1/playlists/:id/songs/:songId`): if the playlist has `isActive === true`, also update that `Song` record's Sunday active flag to `false`.
     - If there is an existing endpoint that toggles a single song's Sunday status directly from the Songs page: if an active Playlist currently exists (`isActive: true`), automatically add the song to (or remove it from) that active Playlist so both views stay strictly in sync.

3. Frontend UI (`choir-client/`):
   - On the Playlist Details page (`/playlists/[id]`):
     - Add a clear, mobile-friendly toggle button in the header for Directors: "Set as Active Sunday Lineup" (when inactive) vs. a green active badge/button "Active Sunday Lineup ✓" (when active).
   - On the Playlists list page (`/playlists`):
     - Pin or highlight the currently active playlist at the top with a distinct "THIS SUNDAY'S LINEUP" badge.
   - Ensure React Query / state caches for both `/playlists` and `/songs` are invalidated whenever the active playlist toggle or playlist songs are mutated.

Verify with `nx-workspace-verify` and test the full flow between `/playlists` and `/songs`.
```

## Milestone 10 — Automated Roster Email Notifications (Brevo HTTP Integration)
**Goal:** Dispatch personalized HTML assignment emails to rostered choristers when the Director confirms team notifications, using Brevo's HTTP API to bypass Render free-tier SMTP port blocks.
**Do:**
1. Configure `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, and `FRONTEND_URL` in `choir-api/.env`.
2. In `choir-api/`, build an `EmailService` using native HTTP `fetch` against `https://api.brevo.com/v3/smtp/email`.
3. Create a responsive HTML email template displaying the chorister's assigned voice part (`SOPRANO`, `ALTO`, `TENOR`, or `LEAD`), service date, playlist title, scheduled songs with custom keys/soloists, and a direct CTA button linking to the live playlist/rehearsal view.
4. Hook the email dispatch into the existing Roster Notification endpoint (`POST /api/v1/playlists/:id/roster/dispatch` or equivalent) using `Promise.allSettled` so email delivery never blocks or crashes in-app notifications.
5. Update the Frontend "Notify Team" confirmation modal in `choir-client/` to indicate that assigned members will receive both an In-App Notification and an Email alert, returning delivery counts in the success toast.
**Verify with:** `nx-workspace-verify` and triggering a roster notification to verify receipt of the formatted HTML email in a real inbox.

## Followup Prompt

```bash
Read PRD.md, RULES.md, and EXECUTION.md. Execute Milestone 10 — Automated Roster Email Notifications (Brevo HTTP Integration).

Before writing code, inspect how Sunday Roster assignments and the "Notify Team" dispatch endpoint are currently implemented in `choir-api/` and `choir-client/`, then output a brief Implementation Plan.

Paths reminder: Projects are located directly at `choir-api/`, `choir-client/`, and `libs/shared/` (not inside an `apps/` directory).

Important Infrastructure Constraint:
We are deployed on Render's Free Web Service tier, which blocks outbound SMTP ports (25, 465, 587). Do NOT install or use `nodemailer` or SMTP. You MUST send emails using standard HTTPS (`fetch`) to Brevo's REST API (`https://api.brevo.com/v3/smtp/email`).

Tasks:

1. Backend Email Service (`choir-api/src/lib/email.service.ts` or equivalent module):
   - Read environment variables:
     - `BREVO_API_KEY`
     - `BREVO_SENDER_EMAIL`
     - `BREVO_SENDER_NAME` (default to `"ChoirSync"`)
     - `FRONTEND_URL` (fallback to `process.env.CORS_ORIGIN` or `"http://localhost:3000"`)
   - Implement a method `sendRosterAssignmentEmail(params)` that accepts:
     - `recipientEmail`: string
     - `recipientName`: string
     - `assignedRole`: string (e.g., Soprano, Alto, Tenor, Lead)
     - `notes`: optional string
     - `playlistTitle`: string
     - `serviceDate`: optional Date/string
     - `playlistUrl`: string (`${FRONTEND_URL}/playlists/${playlistId}`)
     - `songs`: array of `{ title: string, key?: string, leadSinger?: string }`
   - Build a clean, mobile-responsive inline-CSS HTML email template:
     - Header: ChoirSync branding + Service Playlist Title & formatted Date.
     - Highlight badge showing their assigned role: e.g., "Assigned Part: ALTO" (plus any specific Director notes).
     - Setlist breakdown listing each song in order, its active/custom key, and assigned lead vocalist.
     - Primary Call-To-Action button ("Open Rehearsal Setlist") linking directly to `playlistUrl`.
   - Send the request via `fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'accept': 'application/json', 'api-key': BREVO_API_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ sender: { name: BREVO_SENDER_NAME, email: BREVO_SENDER_EMAIL }, to: [{ email: recipientEmail, name: recipientName }], subject: `🎵 Choir Roster: You're scheduled for ${playlistTitle}`, htmlContent }) })`.
   - Resilient Error Handling:
     - If `BREVO_API_KEY` is not set, log a warning and return `{ sent: false, reason: 'missing_api_key' }` without throwing.
     - Wrap the HTTP call in a `try/catch` and log any non-2xx responses from Brevo without crashing the server.

2. Hook into Roster Notification Dispatch (`choir-api/`):
   - Locate the endpoint that handles "Notify Team" on a playlist roster.
   - Ensure the database query includes each assigned user's `email` and `name`, as well as the playlist's ordered songs (with custom keys/leads).
   - After creating the In-App `Notification` records in PostgreSQL, dispatch the personalized emails concurrently using `Promise.allSettled`.
   - Return the summary in the API response: `{ notifiedCount, emailsSentCount }`.

3. Frontend Confirmation Modal & Toast Update (`choir-client/`):
   - In the Playlist Roster UI, ensure clicking "Notify Team" opens a clear confirmation modal (if not already present) stating how many choristers will be notified via **In-App Notification + Email** with their assigned voice parts and setlist links.
   - Update the success toast after confirmation to display both in-app and email dispatch results (e.g., "Notified 8 choristers (8 emails sent)").

Verification:
1. Run `nx-workspace-verify` to ensure zero TypeScript or build errors across `choir-api` and `choir-client`.
2. Verify the UI confirmation flow and backend response structure.
```

## Database Schema Updates

```js
// 1. Playlists / Setlists
model Playlist {
  id          String         @id @default(uuid())
  title       String         // e.g. "Sunday Service - Oct 12"
  description String?
  serviceDate DateTime?      // Ties directly to Sunday/Uniform dates
  createdById String
  createdBy   User           @relation(fields: [createdById], references: [id])
  songs       PlaylistSong[]
  roster      ServiceRoster?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  @@index([serviceDate])
}

model PlaylistSong {
  id         String   @id @default(uuid())
  playlistId String
  playlist   Playlist @relation(fields: [playlistId], references: [id], onDelete: Cascade)
  songId     String
  song       Song     @relation(fields: [songId], references: [id], onDelete: Cascade)
  orderIndex Int      // Position in setlist
  leadSinger String?  // Optional assigned soloist for this specific service
  customKey  String?  // Overrides standard catalog key for this service

  @@unique([playlistId, songId])
  @@index([playlistId])
}

// 2. Audio Snippets for Voice Parts
model VoiceSnippet {
  id          String        @id @default(uuid())
  songPartId  String
  songPart    SongPart      @relation(fields: [songPartId], references: [id], onDelete: Cascade)
  userId      String
  user        User          @relation(fields: [userId], references: [id])
  audioUrl    String        // Supabase Storage Public/Signed URL
  durationSec Int           // Duration in seconds (max 60)
  title       String?       // e.g., "Bridge Harmony Variation"
  createdAt   DateTime      @default(now())

  @@index([songPartId])
}

// 3. Service Roster & Backing Assignments
model ServiceRoster {
  id          String         @id @default(uuid())
  playlistId  String         @unique
  playlist    Playlist       @relation(fields: [playlistId], references: [id], onDelete: Cascade)
  members     RosterMember[]
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

model RosterMember {
  id              String            @id @default(uuid())
  rosterId        String
  roster          ServiceRoster     @relation(fields: [rosterId], references: [id], onDelete: Cascade)
  userId          String
  user            User              @relation(fields: [userId], references: [id])
  assignedRole    VoicePartTypeEnum // SOPRANO, ALTO, TENOR, or LEAD
  notes           String?           // e.g. "Taking lead on Ife Alayilegbe"
  notified        Boolean           @default(false)
  createdAt       DateTime          @default(now())

  @@unique([rosterId, userId])
}

// 4. In-App Notifications
model Notification {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title     String
  message   String
  linkUrl   String?  // Deep link to song or playlist
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId, isRead])
}
```

### Login Page Update Prompt

```bash
Read PRD.md, RULES.md, and inspect the current `LoginPage` component in `choir-client/`. I want to refactor the Login Page to exclusively use Google SSO and upgrade the UI into a modern, mobile-first, insightful welcome screen.

Requirements (`choir-client/`):

1. Remove Email/Password Authentication UI & Dependencies:
   - Remove `react-hook-form`, `zodResolver`, `LoginSchema`, `Input`, `Label`, and the `POST /auth/login` handler from `LoginPage`.
   - Manage error state using a simple local `const [error, setError] = useState<string | null>(null)` instead of form state.
   - Keep `@react-oauth/google` (`GoogleLogin`), `useAuth`, `useNavigate`, `useLocation`, `apiClient`, and `ModeToggle`.

2. Modern, Insightful UI & UX Design:
   - Make the page mobile-first, clean, and immediately intuitive so a chorister opening the link from WhatsApp knows exactly what the app is and what to click.
   - **Header**: Sticky minimalist top bar with the brand logo icon (`Music2` or `Mic2` from `lucide-react`), "CSync" title, a subtle "Choir Portal" badge, and `<ModeToggle />`.
   - **Hero Card / Centerpiece**:
     - Subtle decorative gradient accent bar or glow at the top of the card that looks great in both light and dark modes.
     - Clear headline: "Welcome to CSync" and subtitle: "Your choir's rehearsal parts, Sunday setlists, and schedules in one place."
   - **Primary CTA (Unmistakable Action)**:
     - Place the `<GoogleLogin />` component prominently inside a well-spaced container with a helper caption above/below: "Sign in with your Google account to continue".
     - Configure `<GoogleLogin />` with `size="large"`, `theme="outline"`, `shape="pill"`, and `text="continue_with"`.
   - **Insightful Feature Preview (3 Compact Rows)**:
     - Below a subtle divider inside the card (or directly beneath the CTA), display 3 scannable feature highlights using `lucide-react` icons (`Headphones`, `ListMusic`, `CalendarCheck`):
       1. "Voice Part Rehearsals — Stream Soprano, Alto & Tenor audio notes and lyrics."
       2. "Sunday Setlists & Keys — See active lineups, keys, and lead vocalists."
       3. "Rosters & Uniforms — Check your service schedule and dress code."
   - **Loading & Error States**:
     - When `isGoogleLoading` is true, display the animated `Loader2` spinner with reassuring copy ("Signing you in..." and a secondary muted hint "This may take a few seconds if the server is waking up").
     - If `error` is set, display a clean destructive alert banner (`AlertCircle` icon) with the error message and a "Try Again" dismissal or auto-reset when they click Google Login again.

Verification:
Run `nx-workspace-verify` to ensure there are no unused imports or TypeScript errors, and verify with `frontend-browser-verify` that both light and dark modes render cleanly on mobile and desktop viewports.
```

## Milestone 11 — Backend OpenAPI / Swagger Documentation
**Goal:** Expose interactive OpenAPI 3.0 documentation for `choir-api` so all endpoints, schemas, and role-protected routes can be inspected and tested in the browser.
**Do:**
1. Install `swagger-ui-express` and `swagger-jsdoc` (plus `@types/swagger-ui-express` and `@types/swagger-jsdoc`) in `choir-api/`.
2. Create a centralized OpenAPI 3.0 configuration (`choir-api/src/config/swagger.ts`) defining API metadata, server URLs, reusable component schemas (`Song`, `SongPart`, `VoiceSnippet`, `Playlist`, `ServiceRoster`, `Notification`, `UniformSchedule`), and Bearer JWT security (`bearerAuth`).
3. Document all route groups (`Auth`, `Songs`, `Voice Snippets`, `Playlists & Active Lineup`, `Roster & Notifications`, `Uniforms`, `AI Curator`, `External Search`) with request bodies, query params, and response codes.
4. Mount the interactive Swagger UI at `GET /api/docs` and expose the raw OpenAPI JSON spec at `GET /api/docs.json`.
**Verify with:** `nx-workspace-verify` and verifying in the browser that `/api/docs` renders cleanly with working JWT "Authorize" functionality.

## Followup Prompt

```bash
Read PRD.md, RULES.md, and EXECUTION.md. Execute Milestone 11 — Backend OpenAPI / Swagger Documentation.

Before writing code, inspect all existing routers and controllers in `choir-api/src/` and the validation schemas in `libs/shared/`, then output a brief Implementation Plan.

Paths reminder: Projects are located directly at `choir-api/`, `choir-client/`, and `libs/shared/` (not inside an `apps/` directory).

Tasks (`choir-api/`):
1. Install Dependencies:
   - Install `swagger-ui-express` and `swagger-jsdoc` (and their `@types/*` devDependencies) at the workspace root.

2. Create OpenAPI 3.0 Spec Configuration (`choir-api/src/config/swagger.ts`):
   - Configure `swagger-jsdoc` with OpenAPI `3.0.0`.
   - Set API title to `"CSync (ChoirSync) API"`, version `"1.0.0"`, and a clear description of the choir management backend.
   - Configure `components.securitySchemes.bearerAuth` (`type: "http"`, `scheme: "bearer"`, `bearerFormat: "JWT"`).
   - Define clean reusable `components.schemas` matching our Prisma models and DTOs:
     - `User`, `Song`, `SongPart`, `VoiceSnippet`, `Playlist`, `PlaylistSong`, `ServiceRoster`, `RosterMember`, `Notification`, `UniformSchedule`, and `ErrorResponse`.
   - Document all existing endpoints (either via clean JSDoc `@openapi` annotations on the route files or structured paths in `choir-api/src/config/swagger.ts`) organized by tags:
     - `Auth` (`/auth/google`, `/auth/refresh`, `/auth/me`)
     - `Songs` (CRUD, active Sunday toggles, external search auto-fill)
     - `Voice Snippets` (Signed upload URL generation, snippet save, delete)
     - `Playlists` (CRUD, add/remove/reorder songs, set active Sunday lineup)
     - `Roster & Notifications` (Assign roster, dispatch notifications + emails, mark notifications read)
     - `Uniforms` (Schedule CRUD & filtering)
     - `AI Curator` (Gemini setlist curation & song discovery)

3. Mount Routes in Express (`choir-api/src/main.ts` or `app.ts`):
   - Mount `GET /api/docs` using `swaggerUi.serve` and `swaggerUi.setup(swaggerSpec, { customSiteTitle: "CSync API Docs", explorer: true })`.
   - Mount `GET /api/docs.json` returning the raw `swaggerSpec` JSON with `Content-Type: application/json`.
   - Ensure CORS or CSP middleware (like `helmet`, if installed) does not block Swagger UI inline scripts/styles on `/api/docs`.

Verification:
1. Run `nx-workspace-verify` to ensure TypeScript compilation and linting pass.
2. Start or test the backend and verify that `GET /api/docs.json` returns valid OpenAPI 3.0 JSON and `GET /api/docs` renders the Swagger UI.
```

---

## Milestone 12 — Product Analytics & Error Monitoring (Google Analytics 4)
**Goal:** Integrate Google Analytics 4 (`react-ga4`) into `choir-client` to monitor SPA page navigation, feature adoption (rehearsal audio playback, recording, AI curation, roster notifications), and client/API exceptions.
**Do:**
1. Install `react-ga4` in `choir-client/` and configure `VITE_GA_MEASUREMENT_ID` in `.env`.
2. Create a centralized analytics utility (`choir-client/src/lib/analytics.ts`) that safely no-ops in local development if the Measurement ID is absent.
3. Build a `<RouteTracker />` listener hooked into `react-router-dom`'s `useLocation` to automatically record SPA pageviews across all routes.
4. Instrument core choir workflows with typed custom events (`song_viewed`, `voice_snippet_played`, `voice_snippet_recorded`, `playlist_activated`, `ai_setlist_curated`, `roster_dispatched`, `whatsapp_broadcast_copied`).
5. Hook an error/exception tracker into the Axios `apiClient` interceptor and global window error handler to monitor failed API calls (`5xx` / network timeouts) and UI crashes in GA4.
**Verify with:** `nx-workspace-verify` and verifying network beacons (`google-analytics.com/g/collect`) in browser DevTools.

## Followup Prompt

```bash
Read PRD.md, RULES.md, and EXECUTION.md. Execute Milestone 12 — Product Analytics & Error Monitoring (Google Analytics 4).

Before writing code, inspect `choir-client/src/` (routing setup, `api-client.ts`, and main feature components), then output a brief Implementation Plan.

Paths reminder: Projects are located directly at `choir-api/`, `choir-client/`, and `libs/shared/` (not inside an `apps/` directory).

Tasks (`choir-client/`):
1. Install Dependency:
   - Install `react-ga4` at the workspace root.

2. Analytics & Monitoring Service (`choir-client/src/lib/analytics.ts`):
   - Read the Measurement ID from `import.meta.env.VITE_GA_MEASUREMENT_ID` (with fallback support if `process.env` is used).
   - Create `initAnalytics()`: initializes `ReactGA.initialize(measurementId)` only if the Measurement ID is present. If missing in local dev, fail silently without console errors.
   - Create `trackPageView(path: string)`: sends a `pageview` hit to GA4.
   - Create strongly typed helper `trackChoirEvent(action, params)` for key product actions:
     - `login_success` (method: `'google'`)
     - `song_viewed` (`songId`, `title`)
     - `voice_snippet_played` (`partType`, `songId`)
     - `voice_snippet_recorded` (`partType`, `durationSec`)
     - `playlist_activated` (`playlistId`, `title`)
     - `ai_setlist_curated` (`theme`, `songCount`)
     - `roster_dispatched` (`playlistId`, `notifiedCount`)
     - `whatsapp_broadcast_copied` (`playlistId`)
   - Create `trackException(description: string, fatal = false)`: sends a GA4 `exception` event so we can monitor frontend errors and API failures in the GA4 dashboard.

3. Automatic Route Tracking (`choir-client/`):
   - Create a lightweight `<AnalyticsTracker />` component using `useLocation()` from `react-router-dom` that calls `initAnalytics()` on mount and `trackPageView(location.pathname + location.search)` on route changes.
   - Mount `<AnalyticsTracker />` inside the router in `App.tsx` (or root layout).

4. API & Runtime Error Monitoring (`choir-client/src/lib/api-client.ts`):
   - In the Axios response error interceptor, if an API request fails with a `5xx` server error or network timeout (excluding normal `401` token refresh flows), call `trackException(\`API Error: \${error.config?.method?.toUpperCase()} \${error.config?.url} - \${error.response?.status ?? 'NETWORK_ERR'}\`, false)`.

5. Instrument High-Value User Flows:
   - Wire `trackChoirEvent` calls into:
     - `LoginPage` (on successful Google login)
     - Audio player / Snippet recorder (on play and on save)
     - Playlist active lineup toggle, AI Curator, Roster "Notify Team", and WhatsApp broadcast copy button.

Verification:
Run `nx-workspace-verify` to confirm all TypeScript types, tests, and builds succeed across the monorepo.
```

## Milestone 12.5 — Health Check Endpoint & Cold-Start Prevention
**Goal:** Expose a fast `/api/health` endpoint in `choir-api` (supporting both `GET` and `HEAD` requests) to keep the Render container and Supabase Prisma connection pool warm via UptimeRobot.
**Do:**
1. In `choir-api/`, create a `/api/health` route (mounted before auth middleware) that returns HTTP `200 OK` with `{ status: "ok", uptime, timestamp, db: "connected" }`.
2. Execute a lightweight `prisma.$queryRaw\`SELECT 1\`` with a safe fallback so pings keep both the Express server and Supabase connection pool active.
3. Add the `/api/health` endpoint to the OpenAPI/Swagger specification under a `System` tag.
**Verify with:** `nx-workspace-verify` and verifying `GET /api/health` and `HEAD /api/health` return `200 OK`.

## Followup Prompt

```bash
Read PRD.md, RULES.md, and EXECUTION.md. Execute Milestone 12.5 — Health Check Endpoint & Cold-Start Prevention.

Paths reminder: Projects are located directly at `choir-api/`, `choir-client/`, and `libs/shared/`.

Tasks (`choir-api/`):
1. Create Health Endpoint (`choir-api/src/routes/health.routes.ts` or directly in `main.ts` / `app.ts`):
   - Mount publicly at `GET /api/health` (Express automatically maps `HEAD /api/health` to `app.get`, which UptimeRobot's free tier uses).
   - Ensure no authentication middleware blocks this route, and set header `Cache-Control: no-store`.
   - Perform a fast database ping (`await prisma.$queryRaw\`SELECT 1\``) inside a `try/catch` block:
     - If the DB responds, return HTTP `200` with:
       ```json
       {
         "status": "ok",
         "db": "connected",
         "uptime": 123.45,
         "timestamp": "2026-09-28T..."
       }
       ```
     - If the DB is temporarily unreachable, still return HTTP `200` (or `503` only if `?strict=true` is passed) with `"db": "disconnected"` so a brief database hiccup doesn't cause false container restarts.
2. Swagger Documentation:
   - Register `GET /api/health` under a `System` tag in the Swagger/OpenAPI spec (`choir-api/src/config/swagger.ts`).

Verify with `nx-workspace-verify`.
```

## Milestone 13 — User Profiles & Roster Display Names
**Goal:** Allow users to set a preferred display name and their comfortable vocal key, and ensure the app uses this name globally (especially in the Sunday Roster UI).
**Do:**
1. Update the `User` model in `schema.prisma` to include `name String?` and `comfortableKey String?` (if not already present), and run a migration.
2. In `choir-api/`, create a `PATCH /api/v1/users/me` endpoint to allow users to update these fields.
3. In `choir-client/`, build a mobile-first `/profile` page with a form to edit Name and Comfortable Key (using a select dropdown for standard musical keys).
4. Update the Navbar: add a "Profile" or Avatar link to the desktop right-hand nav, and to the mobile hamburger menu/popover.
5. Update the Roster Assignment UI and any other list views to render `user.name || user.email` (or Google fallback) so the customized name takes priority.
**Verify with:** `nx-workspace-verify` and manual browser testing ensuring the name updates immediately in the navbar and roster selection dropdowns.

## Followup Prompt
```bash
Read PRD.md, RULES.md, and EXECUTION.md. Execute Milestone 13 — User Profiles & Roster Display Names.

Paths reminder: Projects are located directly at `choir-api/`, `choir-client/`, and `libs/shared/`.

Tasks:

1. Database & Backend (`choir-api/`):
   - Inspect `choir-api/src/prisma/schema.prisma`. Ensure the `User` model has:
     ```prisma
     name           String?
     comfortableKey String?
     ```
   - Run `prisma-create-migration` if the schema was updated.
   - Add a `PATCH /api/v1/users/me` (or similar endpoint under your user/auth routes) that accepts `{ name?: string, comfortableKey?: string }`.
   - Validate the input and update the authenticated user's record in the database.
   - Ensure the updated fields are returned in `GET /api/v1/users/me` (or `/auth/me`).

2. Shared Validation (`libs/shared/`):
   - Create or update the Zod schema for the Profile Update DTO (e.g., `ProfileUpdateSchema`) allowing `name` (string, optional/nullable) and `comfortableKey` (string, optional/nullable).

3. Frontend Profile Page (`choir-client/`):
   - Create a new route/page at `/profile` (or `/settings`).
   - Build a clean, Card-based form using `react-hook-form`.
   - **Name Field**: Standard text input.
   - **Comfortable Key Field**: A Select/Dropdown component with standard musical keys (C, Db, D, Eb, E, F, F#, G, Ab, A, Bb, B).
   - On successful save, show a success toast and update the local user context/state.

4. Navbar Navigation (`choir-client/`):
   - **Desktop**: Add a User Avatar (showing initials if `name` exists) or a "Profile" button to the right-hand side of the desktop navbar next to the Mode Toggle.
   - **Mobile**: Add a "Profile" link with a `User` icon inside the existing mobile hamburger menu (Sheet or Popover).

5. Global Display Logic (`choir-client/`):
   - Search the codebase for places where choristers are listed—specifically the **Playlist Roster Assignment** dropdowns and cards.
   - Update the rendering logic to strictly prioritize the user's explicit name:
     `const displayName = user.name || user.email; // (or fallback to Google SSO name if available)`
   - If they have a `comfortableKey` set, display it as a subtle badge next to their name in the Roster Assignment UI so the Director knows their vocal range when assigning leads.

Verification:
Run `nx-workspace-verify` to ensure zero TypeScript errors.
```

## Milestone 14 — Playlist Master Key & Interactive Pitch Keyboard (Web Audio API)
**Goal:** Enable setting an overarching key for a Playlist with an interactive, labeled virtual pitch keyboard using the browser's native Web Audio API, keeping individual song keys strictly independent.
**Do:**
1. Add `key String?` to the `Playlist` model in `schema.prisma` and run migration.
2. Update playlist DTOs in `libs/shared/` and the playlist update endpoints in `choir-api/` to accept and persist `key`. Ensure this mutation strictly updates the playlist record and does NOT modify `PlaylistSong.customKey` or `Song.key`.
3. Create a zero-dependency Web Audio synthesizer utility (`choir-client/src/lib/pitch-synth.ts`) that plays accurate note frequencies (A4 = 440 Hz) using an `AudioContext` oscillator with smooth gain attack/decay.
4. Build a mobile-optimized, labeled virtual keyboard component (`VirtualPitchKeyboard`) with standard white and black piano keys displaying note names (e.g., C, C#, D, Eb, E, F, F#, G, Ab, A, Bb, B).
5. Integrate the keyboard into a Key Picker dialog/drawer on the Playlist Details page, allowing the Director to test pitches before confirming the playlist's master key.
**Verify with:** `nx-workspace-verify`, playing pitch notes on mobile touch devices, saving a playlist key, and verifying that existing song keys in the playlist remain unchanged.

## Followup Prompt
```bash
Read PRD.md, RULES.md, and EXECUTION.md. Execute Milestone 14 — Playlist Master Key & Interactive Pitch Keyboard (Web Audio API).

Paths reminder: Root-level structure `choir-api/`, `choir-client/`, and `libs/shared/` (no `apps/`).

Core Requirement:
Directors should be able to set an overarching key on a Playlist (e.g., for medleys, opening modulation reference, or overall service pitch). When the Director selects or updates a key for the playlist, it MUST NOT update or overwrite the individual `customKey` or default `key` of the songs contained inside that playlist.

Tasks:

1. Database & Shared Validation (`choir-api/` & `libs/shared/`):
   - In `choir-api/src/prisma/schema.prisma`, add `key String?` to the `Playlist` model.
   - Run `prisma-create-migration`.
   - In `libs/shared/`, update the Playlist validation schemas (e.g., `UpdatePlaylistSchema`) to accept `key: z.string().nullable().optional()`.
   - In `choir-api/`, ensure `PATCH /api/v1/playlists/:id` updates the playlist's `key` field. Verify that the query touches ONLY the `Playlist` record and does NOT execute any cascade updates on `PlaylistSong` or `Song`.

2. Web Audio Pitch Synthesizer (`choir-client/src/lib/pitch-synth.ts`):
   - Build a lightweight audio synthesis module using the browser's native `window.AudioContext || window.webkitAudioContext`.
   - Calculate or map standard 12-TET frequencies for an octave (e.g., C4 = 261.63 Hz, C#4 = 277.18 Hz ... B4 = 493.88 Hz, C5 = 523.25 Hz).
   - Implement `playPitch(noteName: string, duration = 1.2)`:
     - Lazily initialize or resume the `AudioContext` on user interaction (to handle mobile autoplay restrictions).
     - Use a blend of triangle/sine oscillators or a warm envelope with quick attack (0.02s) and smooth exponential decay release to sound like a clean pitch pipe / keyboard tone without clicking.

3. Interactive Labeled Keyboard UI (`choir-client/src/components/`):
   - Build a `VirtualPitchKeyboard` component:
     - Displays a standard piano octave (C4 through B4 or C5).
     - **White Keys**: Clean vertical pill/rounded-bottom cards labeled with root notes (`C`, `D`, `E`, `F`, `G`, `A`, `B`).
     - **Black Keys**: Positioned properly between white keys with negative margins/absolute positioning and contrasting dark styling, dual-labeled (`C#/Db`, `D#/Eb`, `F#/Gb`, `G#/Ab`, `A#/Bb`).
     - Touch & Click handling: Tapping any key immediately plays its audio tone via `playPitch()` and highlights the key active state.
     - Supports a `selectedKey` prop to show the currently selected key with an active badge/border.
     - Include mobile horizontal scroll or auto-scaling so all keys fit comfortably on 360px+ phone screens.

4. Playlist Header Key Picker Dialog (`choir-client/`):
   - On the Playlist Details page (`/playlists/[id]`):
     - In the playlist meta/header bar next to the title and service date, show a "Service Key" badge (e.g., "Key: G Major" or "Set Master Key" button for Directors).
     - Clicking it opens a Dialog (or bottom Sheet on mobile) titled "Select Playlist Key".
     - Header text: "Test pitch tones on the keyboard below, then select the overarching key for this service setlist."
     - Render `<VirtualPitchKeyboard />` inside the dialog.
     - Below the keyboard, render quick select buttons or confirm button to lock in the chosen key.
     - Add a subtle reminder note: "Note: Setting a playlist key does not modify individual song keys."
     - On save, call `PATCH /api/v1/playlists/:id` with `{ key: selectedKey }`, invalidate the playlist query, and show a success toast.

Verification:
1. Run `nx-workspace-verify` to ensure clean TypeScript compilation across all monorepo packages.
2. Test on mobile viewports: ensure touching piano keys generates sound and saving the playlist key preserves individual song keys in the playlist.
```

## Milestone 15 — Clear Active Sunday Lineup (Atomic Batch Reset)
**Goal:** Allow Directors to clear all active Sunday songs and deactivate any connected active playlist in a single atomic database transaction.
**Do:**
1. In `choir-api/`, create an endpoint `POST /api/v1/songs/clear-active` (restricted to Directors).
2. Execute the reset inside a single atomic `prisma.$transaction`:
   - Set the Sunday active flag to `false` for all songs currently marked active (`prisma.song.updateMany`).
   - Set `isActive: false` on any `Playlist` currently marked active (`prisma.playlist.updateMany`).
3. In `choir-client/`, add an intentional "Clear Active Lineup" action in the "Active Sunday Songs" section header on the Songs page (`/songs`).
4. Implement a confirmation dialog summarizing the action: "This will remove all songs from this Sunday's lineup and deactivate the connected playlist."
5. On confirmation, invoke the reset endpoint, invalidate both the `songs` and `playlists` React Query caches, and display a confirmation toast.
**Verify with:** `nx-workspace-verify` and browser testing confirming that clicking clear updates both the Songs page and the Playlists page simultaneously with zero partial states.

## Followup Prompt
```bash
Read PRD.md, RULES.md, and EXECUTION.md. Execute Milestone 15 — Clear Active Sunday Lineup (Atomic Batch Reset).

Paths reminder: Root-level structure `choir-api/`, `choir-client/`, and `libs/shared/` (no `apps/`).

Core Requirement:
Provide a one-click reset for Directors to wipe the current active Sunday lineup. When triggered, all songs marked active for Sunday must be marked inactive, and any Playlist currently marked active (`isActive === true`) must be set to `isActive = false`. Both operations MUST run in a single atomic database transaction to prevent state drift.

Tasks:

1. Backend Atomic Reset Endpoint (`choir-api/`):
   - Inspect `choir-api/src/prisma/schema.prisma` and existing song/playlist routes to identify the exact field used for active Sunday songs (e.g., `isActiveSunday` or similar boolean on `Song`) and `isActive` on `Playlist`.
   - Create an endpoint `POST /api/v1/songs/clear-active` (or `POST /api/v1/playlists/clear-active`):
     - Restrict access to authenticated Directors.
     - Wrap mutations in `prisma.$transaction([ ... ])`:
       1. `prisma.song.updateMany({ where: { [activeSundayField]: true }, data: { [activeSundayField]: false } })`
       2. `prisma.playlist.updateMany({ where: { isActive: true }, data: { isActive: false } })`
     - Return `{ success: true, clearedSongsCount: result[0].count, deactivatedPlaylistsCount: result[1].count }`.
   - Register this endpoint in `choir-api/src/config/swagger.ts` under the `Songs` or `Playlists` tag.

2. Frontend Confirmation UI (`choir-client/`):
   - In the Songs page (`/songs`):
     - In the header of the "Active Sunday Songs" section (next to the section title or count badge), render a subtle "Clear Lineup" button (e.g., outline/ghost destructive button with a `RotateCcw` or `Trash2` icon) visible only to Directors when active songs exist.
     - Clicking it opens an `AlertDialog` confirmation modal:
       - Title: "Clear Sunday's Lineup?"
       - Description: "This will remove all songs currently set for this Sunday and deactivate any linked Sunday playlist. You can assign a new lineup at any time."
       - Action buttons: "Cancel" and "Clear Lineup" (destructive variant).
   - Mutation Handling:
     - On confirmation, call the new backend endpoint.
     - On success:
       - Invalidate and refetch queries for both songs and playlists so the UI reflects the change immediately.
       - Display a toast: "Sunday lineup cleared (X songs removed)".

Verification:
1. Run `nx-workspace-verify` to ensure zero TypeScript compilation errors.
2. Verify via browser test:
   - Activate a playlist with 3 songs.
   - Confirm the 3 songs show under "Active Sunday Songs" on `/songs` and the playlist shows the "Active Sunday Lineup" badge on `/playlists`.
   - Click "Clear Lineup", confirm the modal, and verify that both the songs list and the playlist badge update to inactive immediately.
```

## Milestone 16 — In-App AI Assistant (ChoirSync Copilot)
**Goal:** Implement a floating, edge-anchored chat button that opens a conversational AI interface (powered by Gemini), allowing choristers to ask for vocal tips, harmony guidance, or music theory help directly within the app.
**Do:**
1. In `choir-api/`, create a `POST /api/v1/ai/chat` endpoint utilizing the Gemini 2.0 Flash SDK. Configure a system prompt instructing the model to act as a helpful, encouraging ChoirSync vocal and music theory assistant.
2. Ensure the endpoint accepts a chat history array so the model maintains conversational context.
3. In `choir-client/`, build a `FloatingChatButton` component anchored to the right edge of the screen (poking out slightly) and render it globally in the root layout.
4. Build a `ChatSheet` UI (using a right-side sliding drawer/sheet) containing a scrollable message history, distinct User vs. AI chat bubbles, and a sticky input field with a loading state.
5. Connect the chat UI to the backend endpoint, handling loading states and automatic scroll-to-bottom behavior as new messages arrive.
**Verify with:** `nx-workspace-verify`, verifying the side-tab renders correctly on mobile/desktop, and testing a multi-turn conversation with the AI.

## Followup Prompt
```bash
Read PRD.md, RULES.md, and EXECUTION.md. Execute Milestone 16 — In-App AI Assistant (ChoirSync Copilot).

Paths reminder: Root-level structure `choir-api/`, `choir-client/`, and `libs/shared/`.

Tasks:

1. Backend Chat Endpoint (`choir-api/`):
   - Ensure the Google Gemini SDK (e.g., `@google/genai` or `@google/generative-ai`) is installed.
   - Create a new endpoint `POST /api/v1/ai/chat` (authenticated users only).
   - Expect a JSON body: `{ messages: { role: 'user' | 'model', content: string }[], newMessage: string }`.
   - Initialize the Gemini 2.0 Flash model. Apply a System Instruction/Prompt: 
     "You are the ChoirSync Copilot, a friendly, encouraging AI assistant built into a choir management app. Your job is to help choristers and directors with music theory, vocal warmups, harmonizing tips, and general choir advice. Keep answers concise, mobile-friendly, and formatted nicely. The user you are talking to is named [Inject req.user.name or req.user.email]."
   - Pass the existing `messages` array as history, send the `newMessage`, and return the AI's text response.

2. Global Floating Edge Button (`choir-client/`):
   - Create `choir-client/src/components/chat/FloatingChatTab.tsx`.
   - It should be a fixed button positioned on the middle-right edge of the screen (`fixed right-0 top-1/2 -translate-y-1/2 z-50`).
   - Styling: It should "poke out" slightly (e.g., a rounded-l-xl pill shape, brightly colored or primary gradient, with a `Sparkles` or `MessageCircle` icon).
   - Clicking it should open the Chat Interface. Add this globally to the main app layout so it's accessible from any page.

3. Chat Interface Drawer (`choir-client/`):
   - Use the `Sheet` component (from shadcn/ui) configured with `side="right"` to act as the chat container.
   - **Header**: "ChoirSync Copilot" with a subtle subtitle ("Ask about vocal tips, harmonies, or music theory").
   - **Message Area**: A flex column with overflow-y-auto. 
     - AI messages: Aligned left, gray/muted bubble background.
     - User messages: Aligned right, primary color bubble background.
     - Implement a `useRef` to automatically scroll to the bottom whenever a new message is added.
   - **Input Area**: A sticky footer at the bottom of the Sheet with a text input, and a send button (disabled when empty or loading).
   - **Loading State**: When waiting for the AI response, show a subtle typing indicator (e.g., 3 bouncing dots or a `Loader2` spinner) in the AI's side of the chat.

4. Integration:
   - Manage the conversation state (an array of message objects) locally in the component.
   - On submit: immediately append the user's message to the UI, set loading to true, call the API, append the AI's response, and set loading to false.
   - Handle API errors gracefully (show a red error text bubble: "Sorry, I'm having trouble connecting right now.").

Verification:
1. Run `nx-workspace-verify` to ensure clean TypeScript compilation.
2. Start the dev servers, click the side tab, and verify that the layout does not break the mobile viewport and that multi-turn chat works successfully.
```