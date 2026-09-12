# Choir Sync: Project Progress Summary

This document summarizes the work completed across Milestones 0 through 5 of the Choir Sync application build.

## 1. Workspace & Architecture (Milestone 0)
- **Monorepo setup:** Scaffolded an Nx workspace containing the `choir-api` (Express backend) and `choir-client` (Vite/React frontend).
- **Shared Libraries:** Created `libs/shared/types` and `libs/shared/validation` so both the frontend and backend consume the exact same interfaces without duplication.

## 2. Contracts & Database (Milestones 1 & 2)
- **Zod Schemas:** Built the single source of truth for validation (e.g., `CreateSongSchema`, `LoginSchema`, `UserRoleEnum`) in the shared library.
- **Prisma Schema:** Mapped the PRD's data model (`User`, `Song`, `SongPart`, `SongLink`) to a Prisma schema. 
- **Migrations:** Successfully connected to the remote Supabase PostgreSQL database via the Supavisor connection pooler and applied the initial migration.

## 3. Authentication & Security (Milestone 3)
- **JWT & Passwords:** Implemented secure password hashing (bcrypt) and JWT issuance/verification.
- **Role Guards:** Created strict Express middleware (`requireAuth` and `requireRole`). We also implemented the granular Section-Leader guard (e.g., ensuring an Alto leader can only edit Alto parts).
- **Strict Verification:** Proved the auth layer using the rigorous `auth-guard-verify` matrix checklist against a live database.

## 4. Core API (Milestone 4)
- **Endpoints:** Built the full suite of REST endpoints for the Songs feature:
  - `GET /api/v1/songs` (Open to all authenticated users)
  - `POST /api/v1/songs` (Director only)
  - `PATCH /api/v1/songs/:id` (Director only)
  - `PUT /api/v1/songs/:id/parts` (Director or specific Section Leader)
  - `POST /api/v1/songs/:id/links` (Director only)
  - `DELETE /api/v1/songs/:id/links/:linkId` (Director only)
- **Integration:** Wired all endpoints to Prisma and protected them with the appropriate role guards.

## 5. Frontend Foundation (Milestone 5)
- **Modern Tooling:** Configured the `choir-client` React app with Tailwind CSS v4 and Shadcn UI v4, generating 10 base UI primitives (Buttons, Cards, Dialogs, etc.).
- **Data Layer:** Built a strongly-typed Axios API client equipped with request interceptors to automatically inject the JWT from `localStorage`, and response interceptors to handle `401 Unauthorized` logouts.
- **React Query:** Built custom data-fetching hooks (`useSongs`, `useUpdateSong`, etc.) and centralized cache keys to keep the UI snappy and synchronized.
- **End-to-End Proof:** Replaced the frontend scaffolding with a bare catalog page that successfully pulls real song data from the local API and renders it in Shadcn Cards, proving end-to-end connectivity.

## 6. Frontend Features (Milestone 6)
- **Routing & Auth State:** Implemented React Router with a global `AuthProvider` and a `RequireAuth` guard.
- **Login Flow:** Built a functional login page using `react-hook-form` and the shared Zod schema.
- **Song Catalog:** Created a rich catalog page (`/`) featuring client-side search, voice-part filtering, and sorting (by title, complexity, or date).
- **Role-Aware UI:** 
  - Integrated `AddSongDialog` restricted to Directors.
  - Built a `SongDetailDialog` featuring a `PartNotesEditor` that allows Directors and appropriate Section Leaders to add/edit notes while keeping others in read-only mode.
  - Built a `LinksEditor` for Directors to manage reference links.

---

### Pending Work
- **Milestone 7 (Deployment Readiness):** Finalizing Docker builds, environment variable audits, and preparing for Render deployment.
