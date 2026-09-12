# Milestone 6: Frontend Features — Implementation Plan

## What I'll Build
I will build the full catalog experience in the React application (`choir-client`), implementing search, filtering, and editable/read-only UI states based on the logged-in user's role.

## Execution Steps
1. **Routing and Layout**: 
   - Rename existing scaffolded layout components to follow `kebab-case.tsx` conventions (e.g. `navbar.tsx`, `auth-context.tsx`).
   - Move the bare catalog into a dedicated component (`songs-list.tsx`).
   - Set up `react-router-dom` in `app.tsx` with a clean dashboard layout and route protection (`require-auth.tsx`).
   - Build the `navbar.tsx` to handle login state, displaying the user's role and logout button.

2. **Login Flow**:
   - Create `login.tsx` using `react-hook-form` + `zodResolver` bound to our shared `LoginSchema`.
   - On success, save the JWT to `localStorage`, update the React Query cache for the auth user via `auth-context.tsx`, and redirect to the catalog.

3. **Catalog Enhancements (Search & Filter)**:
   - Add search by title/composer.
   - Add filter chips for Voice Part (S/A/T).
   - Add sorting tabs (Title, Recently Added, Complexity).
   - These will be implemented as controlled state in the `songs-list.tsx` component filtering the data returned by `useSongs()`.

4. **Role-Based UI & Editing**:
   - Create the `add-song-dialog.tsx` available only to the `DIRECTOR` role, using `CreateSongSchema`/`UpdateSongSchema`.
   - Create an inline part-notes editor available only to the `SECTION_LEADER` for their specific voice part, or `DIRECTOR` for all.
   - Scaffold the Links section displaying Spotify/YouTube embeds or raw links.

## Verification
- Serve the client `npx nx serve choir-client` against the live local backend (`npx nx serve choir-api`).
- Run the full `frontend-browser-verify` protocol using a headless script (or manual browser check) to ensure no console errors during hydration or state changes.
- Confirm that role constraints apply correctly on the UI side (Director sees "Add Song", Alto Leader sees "Edit Alto Notes", Chorister sees only view options).
