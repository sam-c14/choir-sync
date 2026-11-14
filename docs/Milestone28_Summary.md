# Milestone 28 Summary — Real-Time Audio Conference Rooms (Cloudflare Realtime SFU)

## What I built
- **Database & Supabase Realtime Setup:**
  - Created `choir-api/src/prisma/migrations/20261114131700_add_audio_rooms/migration.sql` defining `audio_rooms` and `audio_room_participants` tables with foreign keys, indexes, and Row Level Security (RLS) policies.
  - Added `AudioRoom` and `AudioRoomParticipant` models to `choir-api/src/prisma/schema.prisma` and synchronized database schema via Prisma.
  - Added shared Zod validation schemas in `libs/shared/validation` (`AudioRoomRoleEnum`, `AudioRoomStatusEnum`, `CreateAudioRoomSchema`, `UpdateParticipantRoleSchema`, `AudioRoomTrackRequestSchema`).
- **Express Backend SFU Broker Endpoints (`choir-api`):**
  - Implemented `audio-rooms.service.ts`, `audio-rooms.controller.ts`, and `audio-rooms.routes.ts` mounted under `/api/v1/audio-rooms` and `/api/audio-rooms`.
  - Added session initialization (`POST /:id/session`) requesting Cloudflare Calls SFU sessions and TURN credentials (`POST /turn/keys/:keyId/credentials/generate`) with fallback to Cloudflare/Google STUN.
  - Added track offer/answer negotiation proxying (`POST /:id/tracks`, `PUT /:id/tracks`, `PUT /:id/renegotiate`, `PUT /:id/tracks/close`), keeping `CLOUDFLARE_APP_SECRET` strictly on the backend.
  - Documented environment variables in `choir-api/.env.example` and `choir-client/.env.example`.
- **Frontend WebRTC Engine (`choir-client`):**
  - Created `sdp-utils.ts` with `optimizeOpusSdp` enforcing Opus mono speech (`channelCount: 1`), Forward Error Correction (`useinbandfec=1`), Discontinuous Transmission (`usedtx=1`), and 32kbps bandwidth constraint (`maxaveragebitrate=32000`).
  - Created `use-audio-room.ts` WebRTC hook managing single `RTCPeerConnection`, strict publish-on-speak (listeners connect in `recvonly` with 0 kbps upstream), dynamic remote speaker track subscriptions, automated exponential-backoff ICE restart on network drop, and 3-second telemetry polling (`pc.getStats()`).
  - Decoupled microphone hardware acquisition (`getUserMedia`) from SFU signaling, ensuring permissions granted in the browser immediately enable the local microphone with robust fallback constraints.
  - Optimized local mute/unmute to toggle `audioTrack.enabled` directly and broadcast status immediately, preventing the mute icon from getting stuck.
  - Added real-time broadcast and presence listeners for `hand-raised`, ensuring whenever a participant raises their hand, all peers in the room see their raised hand badge and the dedicated queue updates instantly.
  - Connected Supabase Realtime channel (`audio-room:${roomId}`) for Presence tracking and Broadcast signaling (`track-published`, `track-unpublished`, `role-updated`, `mute-updated`, `mute-all`, `hand-raised`).
  - Implemented `audio-meter.ts` for RMS volume detection and live speaking indicators via Web Audio API `AnalyserNode`.
- **Google Meet / Zoom Participant Grid & Seamless Room Navigation:**
  - Implemented Google Meet / Zoom style ordered participant grid sorting by: (1) Actively speaking users, (2) Participants with hands raised, (3) Current user `(You)`, (4) Hosts & Speakers before Listeners, (5) Unmuted before Muted, and (6) Alphabetical.
  - Dynamic responsive grid aspect ratio tiles with dark zinc card theme, active speaker emerald pulsing rings and equalizer waves, floating amber hand-raise badges, audio status indicators, and host moderation actions.
  - Removed intermediate splash/gesture screens: clicking "Resume" or "Join" on the rooms page joins the conference room immediately.
  - Leaving the conference room now routes directly back to `/rooms` with no intermediate screen or redundant leave clicks.
  - Added "Rooms" navigation link (with `Radio` icon) to header navbar and mobile bottom navigation.
- **Repository Documentation Organization:**
  - Placed documentation in `docs/` (`docs/EXECUTION.md`, `docs/PRD.md`, `docs/RULES.md`, `docs/Milestone28_Plan.md`, `docs/Milestone28_Diff.md`, `docs/Milestone28_Summary.md`).

## Verification run
- **`npm run typecheck`:** Passed across all monorepo projects (`choir-api` and `choir-client`) with 0 errors.
- **`npx tsc -p choir-api/tsconfig.app.json --noEmit`:** Passed cleanly.
- **`npx vite build --config choir-client/vite.config.mts`:** Successfully compiled frontend Vite production bundle and generated PWA service worker with 0 errors.
- **Checked off Milestone 28 tasks** in `docs/EXECUTION.md`.
