# Diff: Milestone 28 — Real-Time Audio Conference Rooms (Cloudflare Realtime SFU)

Detailed breakdown of changes created for Milestone 28:

### 1. Database & Schema
- `choir-api/src/prisma/migrations/20261114131700_add_audio_rooms/migration.sql`: Created tables `audio_rooms` and `audio_room_participants` with check constraints, foreign keys, indexes, and Row Level Security (RLS) policies.
- `choir-api/src/prisma/schema.prisma`: Added `AudioRoom` and `AudioRoomParticipant` models and attached relations to `User`.

### 2. Shared Validation (`libs/shared/validation`)
- `libs/shared/validation/src/index.ts`:
  - Added `AudioRoomRoleEnum` (`'host' | 'speaker' | 'listener'`).
  - Added `AudioRoomStatusEnum` (`'ACTIVE' | 'ENDED'`).
  - Added `CreateAudioRoomSchema` and `UpdateAudioRoomSchema`.
  - Added `UpdateParticipantRoleSchema` for host moderation.
  - Added `AudioRoomTrackRequestSchema` for validating SDP offers and track lists.

### 3. Backend Express Module (`choir-api`)
- `choir-api/src/modules/audio-rooms/audio-rooms.service.ts`:
  - Room metadata CRUD operations via Prisma Client.
  - Cloudflare Calls SFU session creation (`/sessions/new`).
  - TURN credentials generation proxy (`/turn/keys/:keyId/credentials/generate`) with automatic fallback to Cloudflare/Google STUN.
  - Track offer/answer negotiation proxy (`/sessions/:sessionId/tracks/new`).
  - Session renegotiation proxy (`/sessions/:sessionId/renegotiate`) for ICE restarts.
  - Track closure proxy (`/sessions/:sessionId/tracks/close`).
- `choir-api/src/modules/audio-rooms/audio-rooms.controller.ts`:
  - Input parsing using shared Zod schemas.
  - User authorization checks and error handling via `handleControllerError`.
- `choir-api/src/modules/audio-rooms/audio-rooms.routes.ts`:
  - Protected with `requireAuth` middleware.
- `choir-api/src/main.ts`:
  - Mounted `/api/v1/audio-rooms` and `/api/audio-rooms`.
- `choir-api/.env.example`:
  - Documented `CLOUDFLARE_APP_ID`, `CLOUDFLARE_APP_SECRET`, `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN`.

### 4. Frontend WebRTC Engine & UI (`choir-client`)
- `choir-client/src/lib/supabase.ts`: Supabase client initialization for Realtime Presence and Broadcast signaling.
- `choir-client/src/lib/sdp-utils.ts`: `optimizeOpusSdp` enforcing `useinbandfec=1;usedtx=1;maxaveragebitrate=32000;stereo=0;sprop-stereo=0`.
- `choir-client/src/lib/cloudflare-sfu-client.ts`: Typed API client for backend SFU broker endpoints.
- `choir-client/src/lib/audio-meter.ts`: Web Audio API `AudioContext` and `AnalyserNode` volume detector for live speaking indicators.
- `choir-client/src/hooks/use-audio-room.ts`: Core WebRTC hook managing single `RTCPeerConnection`, strict publish-on-speak (0 kbps upstream for listeners), dynamic remote track subscriptions, automated exponential-backoff ICE restart, and 3s telemetry polling.
- `choir-client/src/components/audio-rooms/NetworkQualityBadge.tsx`: Visual RTT, jitter, and packet loss indicator.
- `choir-client/src/components/audio-rooms/AudioRoomPanel.tsx`: Full conference interface with speaker cards, speaking rings, listener list, hand raise queue, and host moderation controls.
- `choir-client/src/pages/audio-rooms.tsx`: Active rooms list and room creation dialog.
- `choir-client/src/pages/audio-room-detail.tsx`: Live conference room view mounting `<AudioRoomPanel />`.
- `choir-client/src/app/app.tsx`: Added `/rooms` and `/rooms/:id` routes.
- `choir-client/src/components/layout/navbar.tsx` & `bottom-nav.tsx`: Added "Rooms" navigation link with `Radio` icon.
- `docs/EXECUTION.md`: Checked all deliverables and verification checkboxes for Milestone 28.
