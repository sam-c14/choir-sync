# Product Requirements Document (PRD): Choir Part Tracker

**Version:** 2.0.0
**Target Architecture:** Nx Integrated Monorepo (Express backend only)
**Hosting Model:** 100% Free Tier (Vercel + Render + Supabase)

---

## Changelog from v1.0.0

- Backend is **Express only** — dropped the NestJS/Express hybrid file layout that mixed two conventions.
- Voice parts scoped to **Soprano, Alto, Tenor** for now (dropped Bass, Baritone, Solo — trivial to re-add later since it's just an enum).
- Dropped `sheetUrl` / `audioUrl` and any file storage requirement. Replaced with a **Links** table for external references (Spotify, YouTube, Audiomack, etc.) — no storage bucket needed.
- Added a `complexity` field on `Song`, settable at creation and editable later, used for sorting.
- Sorting is now explicit: **Title (A–Z)**, **Recently Added**, **Complexity**. ("Song title" and "alphabetical" from the original ask collapse into the same sort — see note below.)
- Added a real **auth/authorization model** (User, roles, route guards) — v1.0.0 defined three permission tiers but had no way to enforce them. This was a gap, not a new requirement, so it's included here as a fix rather than scope creep.
- Removed the unsupported "real-time updates" claim (no WebSocket/Realtime layer was actually specified) — rehearsal editing is still inline, just over plain REST.
- Removed full-text-search-over-lyrics requirement — no lyrics field exists, and it wasn't asked for in this pass.

> **Note on sorting:** "song title" and "alphabetical" are the same operation (`ORDER BY title ASC`), so they're implemented as a single sort option rather than two. If you actually meant something different by "song title" (e.g. insertion order / no sort), let me know and I'll split it back out.

---

## 1. Executive Summary & Vision

The **Choir Part Tracker** is a lightweight platform for choir directors, section leaders, and choristers to maintain a searchable, sortable repertoire catalog. Each song tracks basic metadata, a complexity rating, external reference links (recordings on Spotify/YouTube/Audiomack), and per-voice-part notes for Soprano, Alto, and Tenor — editable now, and persisted for reference in future rehearsals.

The codebase remains an **Nx integrated monorepo** so the Zod validation schemas and TypeScript types are shared between the Next.js client and the Express API, while running entirely on free-tier infrastructure.

---

## 2. User Personas & Permissions

| Role                 | Permissions & Core Workflows                                                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Director / Admin** | Full CRUD on songs, voice parts, and links. Sets/edits complexity. Only role that can create or delete songs.                                                                                                |
| **Section Leader**   | Can edit voice-part notes **only for the voice part they lead** (e.g. an Alto section leader can update Alto notes on any song, but not Soprano or Tenor). Cannot create/delete songs or edit song metadata. |
| **Chorister**        | Read-only: browse, search, filter, and sort the catalog; view all voice-part notes and links.                                                                                                                |

Enforcement of this table is the job of the auth layer in §5 — this was previously just a table with no backing implementation.

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
- **Search:** plain text match on `title` and `composer`. (A proper full-text index isn't needed yet at this scale — a simple `ILIKE`/`contains` query is fine for now; flagging that this should be revisited with a Postgres `tsvector` + GIN index once the catalog grows past a few hundred songs.)

### 3.4 Rehearsal Workspace

- Inline editing for voice-part notes so a Section Leader can update their part between rehearsal songs without leaving the catalog view.
- Mobile-responsive for phone/tablet use on a music stand. (This is a plain REST PATCH under the hood — no real-time sync between multiple open devices in this version.)

---

## 4. Technical Architecture

### 4.1 Monorepo Topology (Nx)

```
choir-workspace/
├── apps/
│   ├── choir-client/                 # Next.js (App Router, Tailwind CSS, shadcn/ui, TanStack Query)
│   │   ├── app/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── songs/
│   │   │   │   │   ├── [id]/page.tsx
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── _components/
│   │   │   │   │       ├── song-list.tsx
│   │   │   │   │       ├── song-card.tsx
│   │   │   │   │       ├── song-filters.tsx        # sort dropdown, S/A/T chips, complexity/status filters
│   │   │   │   │       ├── song-form.tsx            # react-hook-form + zodResolver(CreateSongSchema)
│   │   │   │   │       ├── voice-part-notes-editor.tsx
│   │   │   │   │       └── song-links-editor.tsx
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── layout.tsx
│   │   │   ├── globals.css
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   └── ui/                   # shadcn-generated primitives (button, input, select, form, dialog, card, badge, ...)
│   │   ├── lib/
│   │   │   ├── utils.ts              # cn() helper — clsx + tailwind-merge
│   │   │   ├── api-client.ts         # thin fetch wrapper against NEXT_PUBLIC_API_URL
│   │   │   └── query-keys.ts
│   │   ├── hooks/
│   │   │   └── use-songs.ts          # TanStack Query hooks: list/detail/create/update/delete
│   │   ├── components.json           # shadcn/ui config (aliases, style, base color)
│   │   ├── project.json
│   │   ├── tailwind.config.js
│   │   └── tsconfig.json
│   └── choir-api/                    # Express REST Backend (single convention, no NestJS)
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/
│       │   │   │   ├── auth.routes.ts
│       │   │   │   ├── auth.controller.ts
│       │   │   │   └── auth.service.ts
│       │   │   └── songs/
│       │   │       ├── songs.routes.ts
│       │   │       ├── songs.controller.ts
│       │   │       └── songs.service.ts
│       │   ├── middleware/
│       │   │   ├── requireAuth.ts
│       │   │   └── requireRole.ts
│       │   ├── prisma/
│       │   │   └── schema.prisma
│       │   └── main.ts
│       ├── Dockerfile
│       ├── project.json
│       └── tsconfig.json
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
└── tsconfig.base.json
```

### 4.2 Technology Stack

- **Monorepo Management:** Nx (Integrated TypeScript Workspace)
- **Frontend:** Next.js 14+ (App Router), React, Tailwind CSS, **shadcn/ui** (Radix-based component primitives, copied into `components/ui`, not an npm dependency), **clsx** + `tailwind-merge` (combined into a `cn()` helper), **react-hook-form** + `@hookform/resolvers/zod` for forms, TanStack Query, Lucide Icons
- **Backend:** Node.js, **Express** (plain — no NestJS), Prisma ORM
- **Auth:** JWT (stateless — no session table needed), bcrypt for password hashing
- **Shared Libraries:** Zod for schema validation and TypeScript contracts shared client/server
- **Database:** Managed PostgreSQL via **Supabase**

### 4.3 Frontend Component & Form Conventions

**shadcn/ui setup** (run once, from `apps/choir-client`):

```
npx shadcn@latest init
npx shadcn@latest add button input textarea select form dialog card badge dropdown-menu sonner
```

This generates `components.json` and drops the primitives straight into `components/ui/` as editable source — there's no `shadcn` runtime package to install, which keeps the bundle lean and every component fully customizable.

**`cn()` helper** (`lib/utils.ts`) — the standard shadcn pattern, combining `clsx` for conditional class logic with `tailwind-merge` to resolve conflicting Tailwind classes:

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Forms** are built with `react-hook-form`, wired to the **same Zod schemas the backend validates against** (`CreateSongSchema`, `CreateSongPartSchema`, `LoginSchema` from `libs/shared/validation`) via `@hookform/resolvers/zod`, and rendered with shadcn's `<Form>` primitives:

```typescript
const form = useForm<CreateSongDto>({
  resolver: zodResolver(CreateSongSchema),
  defaultValues: {
    title: "",
    complexity: "MODERATE",
    tags: [],
    parts: [],
    links: [],
  },
});
```

This means client-side validation errors match the server's validation exactly — no drift between what the form allows and what the API accepts. Applies to the song create/edit form, the per-part notes editor, and the login form.

---

## 5. Database Schema (Prisma on Supabase)

`apps/choir-api/src/prisma/schema.prisma`:

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

`libs/shared/validation/src/index.ts`:

```typescript
import { z } from "zod";

export const VoicePartTypeEnum = z.enum(["SOPRANO", "ALTO", "TENOR"]);
export const SongStatusEnum = z.enum([
  "REHEARSAL",
  "ACTIVE_SUNDAY",
  "ARCHIVED",
]);
export const SongComplexityEnum = z.enum(["EASY", "MODERATE", "CHALLENGING"]);
export const LinkPlatformEnum = z.enum([
  "SPOTIFY",
  "YOUTUBE",
  "AUDIOMACK",
  "OTHER",
]);
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
export const UpdateSongSchema = CreateSongSchema.partial().omit({
  parts: true,
  links: true,
});

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

| Method   | Route                             | Description                          | Access                                                             | Body / Query                                                                                  |
| -------- | --------------------------------- | ------------------------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `POST`   | `/api/v1/auth/login`              | Log in, returns a JWT                | Public                                                             | `LoginDto`                                                                                    |
| `GET`    | `/api/v1/songs`                   | List songs — search, filter, sort    | Any authenticated user                                             | `?search=&voicePart=&complexity=&status=&sortBy=title\|createdAt\|complexity&order=asc\|desc` |
| `POST`   | `/api/v1/songs`                   | Create a song with parts & links     | Director only                                                      | `CreateSongDto`                                                                               |
| `GET`    | `/api/v1/songs/:id`               | Fetch full song detail               | Any authenticated user                                             | None                                                                                          |
| `PATCH`  | `/api/v1/songs/:id`               | Update song metadata / complexity    | Director only                                                      | `UpdateSongDto`                                                                               |
| `DELETE` | `/api/v1/songs/:id`               | Delete song (cascades parts & links) | Director only                                                      | None                                                                                          |
| `PUT`    | `/api/v1/songs/:id/parts`         | Bulk upsert voice-part notes         | Director only                                                      | `CreateSongPartDto[]`                                                                         |
| `PATCH`  | `/api/v1/songs/:id/parts/:part`   | Update a single part's notes         | Director, or Section Leader whose `leadsVoicePart` matches `:part` | `UpdateSongPartDto`                                                                           |
| `POST`   | `/api/v1/songs/:id/links`         | Add a reference link                 | Director only                                                      | `CreateSongLinkDto`                                                                           |
| `DELETE` | `/api/v1/songs/:id/links/:linkId` | Remove a reference link              | Director only                                                      | None                                                                                          |

Default sort (no query params) is `sortBy=createdAt&order=desc` — most recently added first.

---

## 8. 100% Free Production Deployment Guide

```
   ┌─────────────────────────────────────────────────────────────┐
   │                    Vercel (Free Tier)                        │
   │            Frontend Client (Next.js App Router)              │
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

> **Reminder from the last review:** Render's free tier spins down after 15 minutes idle (~40s cold start) and Supabase free projects pause after extended inactivity. Fine for now given the reduced scope, but worth revisiting if this becomes the choir's daily-driver tool.

### 8.1 Database: Supabase Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In **Project Settings → Database**:
   - Copy the **Transaction Connection String** (port `6543`, pooled) → `DATABASE_URL`.
   - Copy the **Direct Connection String** (port `5432`) → `DIRECT_URL` (used for Prisma migrations).
3. Append `?pgbouncer=true&connection_limit=1` to `DATABASE_URL`.

### 8.2 Backend: Render Docker Setup

`apps/choir-api/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY nx.json tsconfig.base.json ./
RUN npm ci

COPY apps/choir-api ./apps/choir-api
COPY libs ./libs

RUN npx prisma generate --schema=apps/choir-api/src/prisma/schema.prisma
RUN npx nx build choir-api --configuration=production

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist/apps/choir-api ./dist
COPY --from=builder /app/apps/choir-api/src/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 3333
CMD npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/main.js
```

**Render Web Service Settings:**

- **Runtime:** Docker
- **Build Context:** `.` (monorepo root, needed for Nx shared libs)
- **Dockerfile Path:** `apps/choir-api/Dockerfile`
- **Instance Type:** Free
- **Environment Variables:**
  - `DATABASE_URL`, `DIRECT_URL` — from Supabase
  - `JWT_SECRET` — random 32+ char string
  - `PORT`: `3333`
  - `CORS_ORIGIN`: `https://your-choir-client.vercel.app`

### 8.3 Frontend: Vercel Setup

1. Import the GitHub repo into Vercel.
2. **Framework Preset:** Next.js · **Root Directory:** `apps/choir-client` · **Build Command:** `npx nx build choir-client --configuration=production` · **Output Directory:** `.next`
3. **Environment Variables:** `NEXT_PUBLIC_API_URL` → `https://choir-api.onrender.com/api/v1`

---

## 9. Development & Agent Execution Checklist

1. [ ] Initialize Nx workspace: `npx create-nx-workspace@latest choir-workspace --preset=apps`
2. [ ] Generate `apps/choir-api` (Express) and `apps/choir-client` (Next.js).
3. [ ] Generate `libs/shared/types` and `libs/shared/validation`.
4. [ ] Install backend dependencies: `@prisma/client`, `prisma`, `zod`, `@tanstack/react-query`, `bcrypt`, `jsonwebtoken`.
5. [ ] Install frontend dependencies: `lucide-react`, `clsx`, `tailwind-merge`, `react-hook-form`, `@hookform/resolvers`; run `npx shadcn@latest init` then add the components listed in §4.3.
6. [ ] Configure `schema.prisma` with the models in §5 and run the first migration.
7. [ ] Implement `requireAuth` / `requireRole` middleware and the Section-Leader-scoped-to-their-part check on `PATCH /songs/:id/parts/:part`.
8. [ ] Implement song, part, and link CRUD services/controllers using the shared Zod DTOs.
9. [ ] Build the Next.js catalog view with shadcn primitives: search bar, S/A/T filter chips, sort dropdown (Title / Recently Added / Complexity), react-hook-form-driven add/edit song dialog (incl. complexity field), inline part-notes editor, and a small links section per song (platform icon + URL).
10. [ ] Seed one Director user manually (or via a one-off script) to bootstrap login before building a signup flow.
