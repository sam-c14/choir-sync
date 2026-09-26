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

## Milestone 5 — Voice Part Audio Snippets (Supabase Storage)
**Goal:** Allow choristers and leaders to record and attach quick audio references (max 60s) to voice parts.
**Do:**
1. Add `VoiceSnippet` model to Prisma schema.
2. Set up a Supabase Storage bucket (`voice-snippets`) with authenticated upload policies.
3. Build a client-side recording component in `choir-client/` using `MediaRecorder` with waveform/timer visualization and a 60-second auto-stop.
4. Upload audio files directly from client to Supabase Storage, saving the public reference URL via `POST /api/v1/songs/:id/parts/:partId/snippets`.
5. Render a lightweight audio playback bar on each voice part tab.
**Verify with:** In-browser audio recording, upload persistence, and mobile playback testing.

## Followup Prompt

```bash
Read PRD.md, RULES.md, and EXECUTION.md. In Post Release Milestones, Execute Milestone 5 — Voice Part Audio Snippets (Supabase Storage).

Tasks:
1. Database & Storage:
   - Add `VoiceSnippet` model to `choir-api/src/prisma/schema.prisma` linking to `SongPart` and `User`. Run migration.
   - Backend endpoint: `POST /api/v1/song-parts/:partId/snippets` to record snippet metadata (`audioUrl`, `durationSec`, `title`).
   - Backend endpoint: `DELETE /api/v1/snippets/:id` (Director or snippet owner only).

2. Frontend Recorder (`choir-client/`):
   - In each voice part tab on the Rehearsal Reader, add an "Add Audio Reference" drawer or sheet.
   - Implement a recording widget using the browser `MediaRecorder` API:
     - Hard limit: 60 seconds (with visual countdown progress bar).
     - Audio format: `audio/webm;codecs=opus` (or standard fallback for iOS Safari).
     - Action buttons: Record, Stop, Preview, Save.
   - Client directly uploads the recorded blob to the Supabase Storage bucket `voice-snippets` with a unique path (`snippets/${partId}/${Date.now()}.webm`).
   - On upload success, save snippet metadata to the backend API.
   - Render a mini audio player (play/pause, progress scrubber, duration) on the part tab for saved snippets.

Ensure all Supabase client keys use existing environment variables. Verify with `nx-workspace-verify`.
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