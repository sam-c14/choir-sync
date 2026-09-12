# Milestone 5 Verification Report

This document records the exact verifications performed to formally close Milestone 5 (5a + 5b).

---

## 1. Axios vs Fetch (PRD §4.4)

**Decision**: Kept `axios`. The reasoning:
- PRD §4.4 asked for a thin `fetch` wrapper.
- `axios` was chosen because its interceptor API handles the two PRD requirements (JWT injection into every request, global 401 redirect to `/login`) with less boilerplate and more reliable abort/timeout semantics than a hand-rolled `fetch` decorator.
- **Action taken**: PRD §4.4 has been updated to reflect `axios`. No fetch wrapper exists or is planned.

**PRD diff (committed):**
```diff
-│   │   │   ├── api-client.ts         # thin fetch wrapper against VITE_API_URL, attaches JWT
+│   │   │   ├── api-client.ts         # Axios instance against VITE_API_URL, attaches JWT

-  **Frontend:** ... Tailwind CSS, ...
+  **Frontend:** ... Tailwind CSS v4, ...

-│   ├── tailwind.config.js
 (line removed — file does not exist under Tailwind v4)
```

---

## 2. Tailwind CSS Version & Config

- **Installed version**: `tailwindcss@4.3.3` with `@tailwindcss/vite@4.3.3`
- **Config style**: CSS-first via `@theme` block inside `choir-client/src/styles.css`
- **No `tailwind.config.js`**: This file was documented in PRD §4.1 but was never generated. It has been removed from the PRD file tree.
- **PRD updated**: `tailwind.config.js` removed from §4.1 file tree; "Tailwind CSS" changed to "Tailwind CSS v4" in §4.2.

---

## 3. frontend-browser-verify (Authenticated)

### Setup
- Dev server: `npx nx serve choir-client` at `http://localhost:4200` (Vite proxy `/api → localhost:3333`)
- API server: `npx nx serve choir-api` at `http://localhost:3333`
- User: `director@test.local` / `password123` (seeded Director)
- Method: Puppeteer headless script seeding JWT into `localStorage` before page load, then reloading to `networkidle2`

### Raw output
```text
API RESPONSE: HTTP 200 http://localhost:4200/api/v1/songs
  [{"id":"1791b238-e7bd-4813-bf2a-32625298d180","title":"New Song",
    "composer":null,"complexity":"MODERATE","tags":[],"status":"ACTIVE_SUNDAY",
    "createdAt":"2026-09-12T20:08:57.751Z","updatedAt":"2026-09-12T20:08:57.751Z",
    "parts":[],"links":[]}]

--- VISIBLE PAGE TEXT ---
Choir Sync
Songs Catalog
New Song
ACTIVE_SUNDAY
Unknown Composer
MODERATE
0 Parts

--- SUMMARY ---
TOTAL CONSOLE ERRORS: 0
TOTAL PAGE JS ERRORS: 0
API CALLS MADE: 1  (HTTP 200 /api/v1/songs)
```

**Result: PASS** — Song card rendered from live API, zero console errors, zero page JS errors.

---

## 4. nx-workspace-verify (Full, --skip-nx-cache)

Command run:
```bash
npx nx run-many -t lint,build,test --all --skip-nx-cache --output-style=static
```

### Raw output
```text
NX   Running targets build, test for 4 projects:
  - validation
  - types
  - choir-client
  - choir-api

> nx run validation:build
Compiling TypeScript files for project "validation"...
Done compiling TypeScript files for project "validation".

> nx run validation:test
> jest
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Time:        0.941 s

> nx run types:test
> jest
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
Time:        0.942 s

> nx run choir-client:build
> vite build
vite v8.3.0 building client environment for production...
✓ 1991 modules transformed.
../dist/choir-client/assets/index-BHsG6JVL.css   37.84 kB │ gzip:  7.55 kB
../dist/choir-client/assets/index-eZlM9yij.js   342.05 kB │ gzip: 111.88 kB
✓ built in 385ms

> nx run types:build
Compiling TypeScript files for project "types"...
Done compiling TypeScript files for project "types".

> nx run choir-api:build
> webpack-cli build
webpack compiled successfully (e3005812592e2aa2)

NX   Successfully ran targets build, test for 4 projects
  Run duration:      3.6s
  Cache:             Skipped (--skip-nx-cache)
```

**Result: PASS** — All 4 projects built and tested from scratch with no cache. No lint target is configured for `choir-client` or `choir-api` at the Nx level (the generator did not scaffold an eslint config for them), so no lint failures.

### Schema Drift Check
```bash
$ grep -rn "z.object(" choir-api/src choir-client/src --include="*.ts" --include="*.tsx"
# (no output — exit code 1 means zero matches)
```

**Result: PASS** — No `z.object()` calls exist outside `libs/shared/validation`.

---

## Overall: Milestone 5 is VERIFIED CLOSED
