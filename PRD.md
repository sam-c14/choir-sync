# Product Requirements Document (PRD): Choir Part Tracker

**Version:** 3.0.0
**Target Architecture:** Nx Monorepo — flat root layout (Express backend only)
**Hosting Model:** 100% Free Tier (Vercel + Render + Supabase)

---

## Changelog from v2.0.0

- **Project layout is flat at repo root**, not under `apps/`. Nx generated `choir-api`, `choir-client`, and `libs/shared/{types,validation}` directly at the workspace root alongside `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `PRD.md`, and `EXECUTION.md`. Every path in this document is updated to match — there is no `apps/` prefix anywhere anymore.
- **Package manager is pnpm**, not npm. `pnpm-workspace.yaml` + `pnpm-lock.yaml` at root; all install/build commands updated accordingly.
- **Frontend is Vite + React 19**, not Next.js. This is the biggest change and it ripples through the whole frontend section: no App Router, no Server Components, no `.next` build output, no `NEXT_PUBLIC_*` env var convention. The client is a plain SPA served as static files.
- **Client-side routing: react-router** (tentative — this was "leaning towards" rather than fully decided as of this version; confirm before Milestone 6, since swapping it later means rewriting every route definition and `useNavigate`/`useParams` call).
- Since there's no Next.js server layer, there's also no server-side auth boundary — added a short **§4.4** on how the JWT is held and enforced entirely client-side now.
- **Vercel deployment settings updated**: no more `Framework Preset: Next.js` / `.next` output — now a Vite static build with `dist` output and a `VITE_API_URL` env var instead of `NEXT_PUBLIC_API_URL`.
- **Dockerfile updated for pnpm** and the flat root layout — no more `apps/choir-api` paths, no more `npm ci`.

> **Open item carried forward:** react-router vs TanStack Router isn't fully locked in. Everything below assumes react-router; if that changes before Milestone 6, the routing subsection and the `choir-client/src` tree need another pass, but nothing else in this document is affected by that specific choice.

---

## 1. Executive Summary & Vision

The **Choir Part Tracker** is a lightweight platform for choir directors, section leaders, and choristers to maintain a searchable, sortable repertoire catalog. Each song tracks basic metadata, a complexity rating, external reference links (recordings on Spotify/YouTube/Audiomack), and per-voice-part notes for Soprano, Alto, and Tenor — editable now, and persisted for reference in future rehearsals.

The codebase is an **Nx monorepo** (flat root layout) so the Zod validation schemas and TypeScript types are shared between the **Vite + React 19** client and the Express API, while running entirely on free-tier infrastructure.

---

## 2. User Personas & Permissions

| Role | Permissions & Core Workflows |
|---|---|
| **Director / Admin** | Full CRUD on songs, voice parts, and links. Sets/edits complexity. Only role that can create or delete songs. |
| **Section Leader** | Can edit voice-part notes **only for the voice part they lead** (e.g. an Alto section leader can update Alto notes on any song, but not Soprano or Tenor). Cannot create/delete songs or edit song metadata. |
| **Chorister** | Read-only: browse, search, filter, and sort the catalog; view all voice-part notes and links. |

Enforcement of this table happens in the API's auth layer (§5, §7) and is mirrored in the client's UI state (§4.4) — the client-side checks are for UX only (hiding buttons that would 403), never the actual security boundary.

---

## 3. Functional Requirements

### 3.1 Repertoire Management (Song Catalog)

**Song fields:**
- `title` (Required, String) — the only hard requirement to create a song
- `composer` / `arranger` (Optional, String)
- `complexity` (Required, Enum: `EASY`, `MODERATE`, `CHALLENGING`, default `MODERATE`) — settable at creation, editable anytime
- `tags` (Optional, Array of Strings, e.g. `["Easter", "Anthem", "A Cappella"]`)
- `status` (Enum: `REHEARSAL`, `ACTIVE_SUNDAY`, `ARCHIVED`, default `ACTIVE_SUNDAY`)
- `links` — zero or more external reference links (see 3.2)

**Voice Part Notes:**
- Each song has up to one record per voice part: `SOPRANO`, `ALTO`, `TENOR`.
- Each part record holds free-text `notes` (harmonic cues, timing, whatever the section needs) and is independently inputtable and updatable.
- Notes persist indefinitely as the reference copy for future rehearsals — there's no "reset" or expiry; a Director or the relevant Section Leader can update them at any time.

### 3.2 Reference Links

- A song can have any number of links, each with a `platform` (`SPOTIFY`, `YOUTUBE`, `AUDIOMACK`, `OTHER`) and a `url`.
- No file upload, no storage bucket — these are just pointers to content that already lives on those platforms.
- Only a Director can add or remove links.

### 3.3 Sorting & Filtering

- **Sort by:**
  - Title (A–Z)
  - Recently Added (newest first, based on creation time)
  - Complexity (Easy → Challenging, or reverse)
- **Filter by:** voice part presence, complexity, status, tags (multi-select).
- **Search:** plain text match on `title` and `composer`. (A proper full-text index isn't needed yet at this scale — a simple `ILIKE`/`contains` query is fine for now; revisit with a Postgres `tsvector` + GIN index once the catalog grows past a few hundred songs.)

### 3.4 Rehearsal Workspace

- Inline editing for voice-part notes so a Section Leader can update their part between rehearsal songs without leaving the catalog view.
- Mobile-responsive for phone/tablet use on a music stand. Plain REST PATCH under the hood — no real-time sync between multiple open devices in this version.

---

## 4. Technical Architecture

### 4.1 Monorepo Topology (Nx — flat root layout)

```
choir-sync/                           # repo root — no apps/ folder
├── choir-api/                        # Express REST Backend
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── auth.routes.ts
│   │   │   │   ├── auth.controller.ts
│   │   │   │   └── auth.service.ts
│   │   │   └── songs/
│   │   │       ├── songs.routes.ts
│   │   │       ├── songs.controller.ts
│   │   │       └── songs.service.ts
│   │   ├── middleware/
│   │   │   ├── requireAuth.ts
│   │   │   └── requireRole.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── main.ts
│   ├── Dockerfile
│   ├── project.json
│   └── tsconfig.json
├── choir-client/                     # Vite + React 19 SPA
│   ├── src/
│   │   ├── main.tsx                  # ReactDOM root + <RouterProvider>/<BrowserRouter>
│   │   ├── App.tsx                   # top-level layout, route outlet
│   │   ├── routes.tsx                # react-router route definitions
│   │   ├── pages/
│   │   │   ├── login-page.tsx
│   │   │   └── songs/
│   │   │       ├── songs-page.tsx           # catalog list view
│   │   │       ├── song-detail-page.tsx
│   │   │       └── _components/
│   │   │           ├── song-list.tsx
│   │   │           ├── song-card.tsx
│   │   │           ├── song-filters.tsx      # sort dropdown, S/A/T chips, complexity/status filters
│   │   │           ├── song-form.tsx          # react-hook-form + zodResolver(CreateSongSchema)
│   │   │           ├── voice-part-notes-editor.tsx
│   │   │           └── song-links-editor.tsx
│   │   ├── components/
│   │   │   └── ui/                   # shadcn-generated primitives (button, input, select, form, dialog, card, badge, ...)
│   │   ├── lib/
│   │   │   ├── utils.ts              # cn() helper — clsx + tailwind-merge
│   │   │   ├── api-client.ts         # Axios instance against VITE_API_URL, attaches JWT
│   │   │   └── query-keys.ts
│   │   ├── hooks/
│   │   │   └── use-songs.ts          # TanStack Query hooks: list/detail/create/update/delete
│   │   ├── auth/
│   │   │   └── auth-context.tsx      # holds JWT + current user/role, see §4.4
│   │   └── index.css                 # Tailwind entry
│   ├── public/
│   ├── index.html
│   ├── components.json               # shadcn/ui config — framework: vite
│   ├── project.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── libs/
│   └── shared/
│       ├── types/
│       │   ├── src/index.ts
│       │   └── project.json
│       └── validation/                # Zod schemas shared across client and server
│           ├── src/index.ts
│           └── project.json
├── nx.json
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
├── PRD.md
└── EXECUTION.md
```

> **Verify before Milestone 4/5:** confirm whether `choir-api` and `choir-client` each have their own `package.json` (typical for a pnpm-workspace-based Nx layout) or whether dependencies live solely in the root `package.json`. This changes exactly what the Dockerfile in §8.2 needs to `COPY` for a correct pnpm install, and isn't fully confirmed yet.

### 4.2 Technology Stack

- **Monorepo Management:** Nx, flat root layout, pnpm workspaces
- **Frontend:** **Vite** + **React 19**, **react-router** (tentative) for client-side routing, Tailwind CSS v4, **shadcn/ui** (Radix-based component primitives, copied into `components/ui`, not a pnpm dependency), **clsx** + `tailwind-merge` (combined into a `cn()` helper), **react-hook-form** + `@hookform/resolvers/zod` for forms, TanStack Query, Lucide Icons
- **Backend:** Node.js, **Express** (plain — no NestJS), Prisma ORM
- **Auth:** JWT (stateless — no session table needed), bcrypt for password hashing, held client-side per §4.4
- **Shared Libraries:** Zod for schema validation and TypeScript contracts shared client/server
- **Database:** Managed PostgreSQL via **Supabase**

### 4.3 Frontend Component & Form Conventions

**shadcn/ui setup for Vite** (run once, from `choir-client/`):
```
npx shadcn@latest init
npx shadcn@latest add button input textarea select form dialog card badge dropdown-menu sonner
```
During `init`, choose the Vite framework option — this affects the `components.json` `framework` field and how it wires path aliases. Unlike the Next.js setup, `@/*` path aliases need to be configured in **both** `tsconfig.json` (`compilerOptions.paths`) and `vite.config.ts` (`resolve.alias`), since Vite doesn't read `tsconfig.json` paths at build time on its own.

**`cn()` helper** (`src/lib/utils.ts`) — unchanged from before, standard shadcn pattern:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Forms** are built with `react-hook-form`, wired to the **same Zod schemas the backend validates against** (`CreateSongSchema`, `CreateSongPartSchema`, `LoginSchema` from `libs/shared/validation`) via `@hookform/resolvers/zod`, rendered with shadcn's `<Form>` primitives — this part is unaffected by the Next.js → Vite switch:
```typescript
const form = useForm<CreateSongDto>({
  resolver: zodResolver(CreateSongSchema),
  defaultValues: { title: "", complexity: "MODERATE", tags: [], parts: [], links: [] },
});
```

### 4.4 Client-Side Auth & Routing

There's no server layer on the frontend anymore, so the whole auth flow lives in the browser:

- On login, the API's JWT is stored in `localStorage` and held in an `AuthContext` (`src/auth/auth-context.tsx`) alongside the decoded user's `role` and `leadsVoicePart`.
- `api-client.ts` attaches the token as an `Authorization: Bearer <token>` header on every request; a `401` response clears the stored token and redirects to `/login`.
- react-router routes are wrapped in a `<RequireAuth>` element that redirects unauthenticated users to `/login`.
- UI elements are conditionally rendered/disabled based on the role in `AuthContext` (e.g. a Chorister never sees an "Add Song" button; a Section Leader only sees an editable state on their own voice part's notes) — **this is a UX convenience only**. The actual permission boundary is enforced server-side per §7's access column, and the UI must never be the only thing standing between a Chorister and a write endpoint.

---

## 5. Database Schema (Prisma on Supabase)

`choir-api/src/prisma/schema.prisma`:

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum VoicePartType {
  SOPRANO
  ALTO
  TENOR
}

enum SongStatus {
  REHEARSAL
  ACTIVE_SUNDAY
  ARCHIVED
}

enum SongComplexity {
  EASY
  MODERATE
  CHALLENGING
}

enum LinkPlatform {
  SPOTIFY
  YOUTUBE
  AUDIOMACK
  OTHER
}

enum UserRole {
  DIRECTOR
  SECTION_LEADER
  CHORISTER
}

model User {
  id             String         @id @default(uuid())
  email          String         @unique
  passwordHash   String
  role           UserRole       @default(CHORISTER)
  // Only meaningful when role = SECTION_LEADER; which part they're allowed to edit
  leadsVoicePart VoicePartType?
  createdAt      DateTime       @default(now())

  @@index([role])
}

model Song {
  id         String         @id @default(uuid())
  title      String
  composer   String?
  complexity SongComplexity @default(MODERATE)
  tags       String[]       @default([])
  status     SongStatus     @default(ACTIVE_SUNDAY)
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt
  parts      SongPart[]
  links      SongLink[]

  @@index([title])
  @@index([status])
  @@index([complexity])
  @@index([tags], type: Gin)
}

model SongPart {
  id        String        @id @default(uuid())
  songId    String
  song      Song          @relation(fields: [songId], references: [id], onDelete: Cascade)
  voicePart VoicePartType
  notes     String?
  updatedAt DateTime      @updatedAt

  @@unique([songId, voicePart])
  @@index([voicePart])
}

model SongLink {
  id        String       @id @default(uuid())
  songId    String
  song      Song         @relation(fields: [songId], references: [id], onDelete: Cascade)
  platform  LinkPlatform
  url       String
  createdAt DateTime     @default(now())

  @@index([songId])
}
```

---

## 6. Shared Validation & Data Contracts

`libs/shared/validation/src/index.ts` — unchanged from v2.0.0, this layer is independent of the frontend framework choice:

```typescript
import { z } from "zod";

export const VoicePartTypeEnum = z.enum(["SOPRANO", "ALTO", "TENOR"]);
export const SongStatusEnum = z.enum(["REHEARSAL", "ACTIVE_SUNDAY", "ARCHIVED"]);
export const SongComplexityEnum = z.enum(["EASY", "MODERATE", "CHALLENGING"]);
export const LinkPlatformEnum = z.enum(["SPOTIFY", "YOUTUBE", "AUDIOMACK", "OTHER"]);
export const UserRoleEnum = z.enum(["DIRECTOR", "SECTION_LEADER", "CHORISTER"]);

export const CreateSongLinkSchema = z.object({
  platform: LinkPlatformEnum,
  url: z.string().url(),
});

export const CreateSongPartSchema = z.object({
  voicePart: VoicePartTypeEnum,
  notes: z.string().max(1000).optional(),
});

export const CreateSongSchema = z.object({
  title: z.string().min(1, "Title is required").max(150),
  composer: z.string().max(100).optional(),
  complexity: SongComplexityEnum.default("MODERATE"),
  tags: z.array(z.string()).default([]),
  status: SongStatusEnum.default("ACTIVE_SUNDAY"),
  parts: z.array(CreateSongPartSchema).default([]),
  links: z.array(CreateSongLinkSchema).default([]),
});

export const UpdateSongPartSchema = CreateSongPartSchema.partial();
export const UpdateSongSchema = CreateSongSchema.partial().omit({ parts: true, links: true });

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type CreateSongDto = z.infer<typeof CreateSongSchema>;
export type UpdateSongDto = z.infer<typeof UpdateSongSchema>;
export type CreateSongPartDto = z.infer<typeof CreateSongPartSchema>;
export type CreateSongLinkDto = z.infer<typeof CreateSongLinkSchema>;
export type LoginDto = z.infer<typeof LoginSchema>;
```

---

## 7. REST API Endpoints

Unchanged from v2.0.0 — the frontend framework swap has no effect on the API surface.

| Method | Route | Description | Access | Body / Query |
|---|---|---|---|---|
| `POST` | `/api/v1/auth/login` | Log in, returns a JWT | Public | `LoginDto` |
| `GET` | `/api/v1/songs` | List songs — search, filter, sort | Any authenticated user | `?search=&voicePart=&complexity=&status=&sortBy=title\|createdAt\|complexity&order=asc\|desc` |
| `POST` | `/api/v1/songs` | Create a song with parts & links | Director only | `CreateSongDto` |
| `GET` | `/api/v1/songs/:id` | Fetch full song detail | Any authenticated user | None |
| `PATCH` | `/api/v1/songs/:id` | Update song metadata / complexity | Director only | `UpdateSongDto` |
| `DELETE` | `/api/v1/songs/:id` | Delete song (cascades parts & links) | Director only | None |
| `PUT` | `/api/v1/songs/:id/parts` | Bulk upsert voice-part notes | Director only | `CreateSongPartDto[]` |
| `PATCH` | `/api/v1/songs/:id/parts/:part` | Update a single part's notes | Director, or Section Leader whose `leadsVoicePart` matches `:part` | `UpdateSongPartDto` |
| `POST` | `/api/v1/songs/:id/links` | Add a reference link | Director only | `CreateSongLinkDto` |
| `DELETE` | `/api/v1/songs/:id/links/:linkId` | Remove a reference link | Director only | None |

Default sort (no query params) is `sortBy=createdAt&order=desc` — most recently added first.

---

## 8. 100% Free Production Deployment Guide

```
   ┌─────────────────────────────────────────────────────────────┐
   │                    Vercel (Free Tier)                        │
   │              Frontend Client (Vite + React 19 SPA)           │
   │               https://choir-client.vercel.app                │
   └──────────────────────────────┬───────────────────────────────┘
                                   │ HTTPS Requests
                                   ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                    Render (Free Web Service)                 │
   │             Backend API (Dockerized Express/Node.js)         │
   │                https://choir-api.onrender.com                │
   └──────────────────────────────┬───────────────────────────────┘
                                   │ Connection Pool / Direct SSL
                                   ▼
   ┌─────────────────────────────────────────────────────────────┐
   │                 Supabase (Free Project Tier)                 │
   │              Managed PostgreSQL Database (500MB)             │
   └─────────────────────────────────────────────────────────────┘
```

> **Reminder from earlier reviews:** Render's free tier spins down after 15 minutes idle (~40s cold start) and Supabase free projects pause after extended inactivity. Fine for now, worth revisiting if this becomes the choir's daily-driver tool.

### 8.1 Database: Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Project Settings → Database**:
   - Copy the **Transaction Connection String** (port `6543`, pooled) → `DATABASE_URL`.
   - Copy the **Direct Connection String** (port `5432`) → `DIRECT_URL` (used for Prisma migrations).
3. Append `?pgbouncer=true&connection_limit=1` to `DATABASE_URL`.
4. Local dev: store both in a root-level `.env` (gitignored) — Nx auto-loads a workspace-root `.env` for all tasks, so both the Prisma CLI and `nx serve choir-api` pick it up without extra config.

### 8.2 Backend: Render Docker Setup

`choir-api/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY nx.json tsconfig.base.json ./
COPY choir-api ./choir-api
COPY libs ./libs

RUN pnpm install --frozen-lockfile

RUN npx prisma generate --schema=choir-api/src/prisma/schema.prisma
RUN npx nx build choir-api --configuration=production

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/dist/choir-api ./dist
COPY --from=builder /app/choir-api/src/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3333
CMD npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js
```

> This assumes dependencies resolve from the root `package.json`/`pnpm-lock.yaml` alone. If `choir-api` turns out to have its own `package.json` (see the note in §4.1), the `COPY` list and the `pnpm install --frozen-lockfile --prod` step in the runner stage need to also include that file — confirm this before running `docker-build-test` for real.

**Render Web Service Settings:**
- **Runtime:** Docker
- **Build Context:** `.` (repo root, needed for Nx shared libs)
- **Dockerfile Path:** `choir-api/Dockerfile`
- **Instance Type:** Free
- **Environment Variables:**
  - `DATABASE_URL`, `DIRECT_URL` — from Supabase
  - `JWT_SECRET` — random 32+ char string
  - `PORT`: `3333`
  - `CORS_ORIGIN`: `https://your-choir-client.vercel.app`

### 8.3 Frontend: Vercel Setup

1. Import the GitHub repo into Vercel.
2. **Framework Preset:** Vite (or "Other" if Vercel doesn't auto-detect it inside an Nx monorepo) · **Root Directory:** `choir-client` · **Build Command:** `npx nx build choir-client --configuration=production` · **Output Directory:** `dist` (Vite's default — **not** `.next`).
3. **Environment Variables:** `VITE_API_URL` → `https://choir-api.onrender.com/api/v1`. Note the `VITE_` prefix is required — Vite only exposes env vars to client code if they're prefixed this way, unlike Next.js's `NEXT_PUBLIC_` convention.

---

## 9. Development & Agent Execution Checklist

1. [x] Initialize Nx workspace (flat root layout, pnpm).
2. [x] Generate `choir-api` (Express) and `choir-client` (Vite + React 19).
3. [x] Generate `libs/shared/types` and `libs/shared/validation`.
4. [ ] Set up Prisma + first migration against a dev Supabase project (in progress — Milestone 2).
5. [ ] Install remaining backend dependencies: `zod`, `@tanstack/react-query` (client), `bcrypt`, `jsonwebtoken`.
6. [ ] Install frontend dependencies: `react-router` (or confirmed alternative), `lucide-react`, `clsx`, `tailwind-merge`, `react-hook-form`, `@hookform/resolvers`; run `npx shadcn@latest init` (Vite framework option) then add the components listed in §4.3.
7. [ ] Configure `vite.config.ts` and `tsconfig.json` path aliases (`@/*`) for shadcn.
8. [ ] Implement `requireAuth` / `requireRole` middleware and the Section-Leader-scoped-to-their-part check on `PATCH /songs/:id/parts/:part`.
9. [ ] Implement song, part, and link CRUD services/controllers using the shared Zod DTOs.
10. [ ] Implement `AuthContext`, `RequireAuth` route wrapper, and the `api-client.ts` JWT interceptor per §4.4.
11. [ ] Build the catalog view with shadcn primitives: search bar, S/A/T filter chips, sort dropdown (Title / Recently Added / Complexity), react-hook-form-driven add/edit song dialog (incl. complexity field), inline part-notes editor, and a small links section per song (platform icon + URL).
12. [ ] Seed one Director user manually (or via a one-off script) to bootstrap login before building a signup flow.