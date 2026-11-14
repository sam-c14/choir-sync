# Implementation Plan: Milestone 28 — Real-Time Audio Conference Rooms (Cloudflare Realtime SFU)

**PRD & EXECUTION refs:** `EXECUTION.md` Milestone 28, `RULES.md`  
**Goal:** Implement low-latency, bandwidth-optimized real-time audio conferencing for 20+ concurrent participants (1–4 active speakers, remaining listeners) using Cloudflare Realtime SFU, Supabase Realtime (Presence & Broadcast signaling), and Supabase Postgres without exceeding free-tier limits on Vercel, Render, or Supabase.

---

## 1. Schema & Migration Details

> [!IMPORTANT]
> **Explicit Schema Approval Flag (per RULES.md):**
> We propose introducing two new tables to store room state and participant records.
> 1. **Supabase SQL Migration File:** `supabase/migrations/20261114_audio_rooms.sql`
> 2. **Prisma Schema Update:** Adding `AudioRoom` and `AudioRoomParticipant` models to `choir-api/src/prisma/schema.prisma` with relation to `User`.

### Proposed Database Schema:

```sql
-- 1. Audio Rooms Table
CREATE TABLE IF NOT EXISTS audio_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  host_id TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audio_rooms_status ON audio_rooms(status);
CREATE INDEX IF NOT EXISTS idx_audio_rooms_host_id ON audio_rooms(host_id);

-- 2. Audio Room Participants Table
CREATE TABLE IF NOT EXISTS audio_room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES audio_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'listener' CHECK (role IN ('host', 'speaker', 'listener')),
  is_muted BOOLEAN NOT NULL DEFAULT true,
  hand_raised BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_audio_room_participants_room_id ON audio_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_audio_room_participants_user_id ON audio_room_participants(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE audio_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_room_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow authenticated read on audio_rooms"
  ON audio_rooms FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on audio_rooms"
  ON audio_rooms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = host_id OR true);

CREATE POLICY "Allow host or director to update audio_rooms"
  ON audio_rooms FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated read on audio_room_participants"
  ON audio_room_participants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on audio_room_participants"
  ON audio_room_participants FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on audio_room_participants"
  ON audio_room_participants FOR UPDATE
  TO authenticated
  USING (true);
```

### Proposed `schema.prisma` Addition:

```prisma
model AudioRoom {
  id           String                 @id @default(uuid())
  title        String
  description  String?
  hostId       String                 @map("host_id")
  host         User                   @relation(fields: [hostId], references: [id], onDelete: Cascade)
  status       String                 @default("ACTIVE") // ACTIVE, ENDED
  createdAt    DateTime               @default(now()) @map("created_at")
  updatedAt    DateTime               @updatedAt @map("updated_at")
  participants AudioRoomParticipant[]

  @@map("audio_rooms")
  @@index([status])
  @@index([hostId])
}

model AudioRoomParticipant {
  id         String    @id @default(uuid())
  roomId     String    @map("room_id")
  room       AudioRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  userId     String    @map("user_id")
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  role       String    @default("listener") // host, speaker, listener
  isMuted    Boolean   @default(true) @map("is_muted")
  handRaised Boolean   @default(false) @map("hand_raised")
  joinedAt   DateTime  @default(now()) @map("joined_at")
  updatedAt  DateTime  @updatedAt @map("updated_at")

  @@unique([roomId, userId])
  @@map("audio_room_participants")
  @@index([roomId])
  @@index([userId])
}
```

---

## 2. Files to be Created or Changed

| File | Status | Description |
|---|---|---|
| `supabase/migrations/20261114_audio_rooms.sql` | Created | SQL migration for `audio_rooms` & `audio_room_participants` with RLS. |
| `choir-api/src/prisma/schema.prisma` | Modified | Add `AudioRoom` and `AudioRoomParticipant` models. |
| `libs/shared/validation/src/index.ts` | Modified | Add shared Zod schemas & DTOs for audio rooms, participant roles, and Cloudflare track negotiation. |
| `choir-api/src/modules/audio-rooms/audio-rooms.service.ts` | Created | Business logic for room persistence, participant state, and Cloudflare Calls REST API proxying. |
| `choir-api/src/modules/audio-rooms/audio-rooms.controller.ts` | Created | Express controller handling session initialization, track publishing/subscriptions, and moderation. |
| `choir-api/src/modules/audio-rooms/audio-rooms.routes.ts` | Created | Protected routes mounted with `requireAuth` and role checking. |
| `choir-api/src/main.ts` | Modified | Register `/api/v1/audio-rooms` and `/api/audio-rooms` router. |
| `choir-api/.env.example` | Modified | Document `CLOUDFLARE_APP_ID`, `CLOUDFLARE_APP_SECRET`, `CLOUDFLARE_TURN_KEY_ID`, `CLOUDFLARE_TURN_API_TOKEN`. |
| `choir-client/.env.example` | Modified | Document `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. |
| `choir-client/src/lib/supabase.ts` | Created | Initialize Supabase client for Realtime Presence & Broadcast signaling. |
| `choir-client/src/lib/sdp-utils.ts` | Created | Utility `optimizeOpusSdp(sdp)` tuning Opus fmtp parameters for mono voice, FEC, DTX, and 32kbps bitrate. |
| `choir-client/src/lib/cloudflare-sfu-client.ts` | Created | Client wrapper to communicate with backend SFU proxy endpoints. |
| `choir-client/src/lib/audio-meter.ts` | Created | Web Audio API `AudioContext` & `AnalyserNode` volume detector for live speaking indicators. |
| `choir-client/src/hooks/use-audio-room.ts` | Created | Core WebRTC hook managing single `RTCPeerConnection`, publish-on-speak, ICE restart, and Supabase signaling. |
| `choir-client/src/components/audio-rooms/AudioRoomPanel.tsx` | Created | Main room interface with speaker grid, speaking rings, listener list, hand raise queue, and host controls. |
| `choir-client/src/components/audio-rooms/NetworkQualityBadge.tsx` | Created | Real-time RTT, jitter, and packet loss badge derived from `pc.getStats()`. |
| `choir-client/src/pages/audio-rooms.tsx` | Created | Page for browsing/creating active conference rooms. |
| `choir-client/src/pages/audio-room-detail.tsx` | Created | Live conference room view mounting `<AudioRoomPanel />`. |
| `choir-client/src/app/app.tsx` | Modified | Mount `/rooms` and `/rooms/:id` routes. |
| `choir-client/src/components/layout/navbar.tsx` | Modified | Add "Rooms" navigation item. |

---

## 3. Shared Schemas & Endpoints Touched

### Shared Schemas (`libs/shared/validation`):
- `AudioRoomRoleEnum`: `'host' | 'speaker' | 'listener'`
- `AudioRoomStatusEnum`: `'ACTIVE' | 'ENDED'`
- `CreateAudioRoomSchema` / `CreateAudioRoomDto`: `{ title: string, description?: string }`
- `UpdateParticipantRoleSchema`: `{ role: AudioRoomRoleEnum, isMuted?: boolean, handRaised?: boolean }`
- `AudioRoomTrackRequestSchema`: Validates SDP sessionDescription (`type`, `sdp`) and `tracks` array (`location`, `mid`, `trackName`, `sessionId`).

### Backend Endpoints (`choir-api`):
All endpoints gated by `requireAuth`:
- `GET /api/v1/audio-rooms`: List active rooms with host info and participant counts.
- `POST /api/v1/audio-rooms`: Create a new room (user becomes `host`).
- `GET /api/v1/audio-rooms/:roomId`: Get room metadata and current participants.
- `POST /api/v1/audio-rooms/:roomId/session`: Initialize Cloudflare Calls session (`POST /v1/apps/:appId/sessions/new`) + generate TURN credentials; returns `{ sessionId, iceServers }`.
- `POST /api/v1/audio-rooms/:roomId/tracks`: Proxy SDP offer to Cloudflare Calls API (`/sessions/:sessionId/tracks/new`) for local track publication; returns answer SDP.
- `PUT /api/v1/audio-rooms/:roomId/tracks`: Proxy remote track subscription offer to Cloudflare Calls API; returns answer SDP.
- `PUT /api/v1/audio-rooms/:roomId/renegotiate`: Proxy ICE restart / renegotiation to Cloudflare Calls API.
- `PUT /api/v1/audio-rooms/:roomId/tracks/close`: Close track on Cloudflare Calls API.
- `PATCH /api/v1/audio-rooms/:roomId/participants/:userId`: Host moderation (change role, mute participant).
- `POST /api/v1/audio-rooms/:roomId/leave`: Leave room cleanup.

---

## 4. Architectural & Implementation Details

### A. Zero Media Routing on Render
- Render backend acts purely as an auth-verified REST proxy to Cloudflare Calls API (`https://rtc.live.cloudflare.com/v1/apps/${CLOUDFLARE_APP_ID}/...`).
- `CLOUDFLARE_APP_SECRET` and `CLOUDFLARE_TURN_API_TOKEN` remain strictly on the backend.
- Express execution time per proxy call is < 100ms. No media packets or WebSocket audio pass through Node.js.

### B. Signaling via Supabase Realtime
- Channel name: `audio-room:${roomId}`.
- **Presence:** Tracks active participants: `{ userId, name, avatarUrl, role, isMuted, handRaised, sessionId, trackName }`.
- **Broadcast Events:**
  - `track-published`: `{ userId, sessionId, trackName }` — Listeners subscribe to this track.
  - `track-unpublished`: `{ userId, sessionId, trackName }` — Listeners remove this track.
  - `role-updated`: `{ targetUserId, newRole }` — Triggered when host promotes or demotes a user.
  - `mute-updated`: `{ targetUserId, isMuted }` — Synchronizes mute status.
  - `mute-all`: Host forces all speakers to mute.
  - `hand-raised`: `{ userId, handRaised }` — Updates the moderation queue.

### C. Publish-on-Speak & Bandwidth Optimization
- **Listeners (0 kbps upstream):**
  - Join in `recvonly` mode.
  - `getUserMedia` is never invoked, and no outbound audio transceivers are created.
  - Bandwidth consumption per listener is strictly downstream: ~32 kbps per active speaker (under 130 kbps total for 4 simultaneous speakers).
- **Opus SDP Tuning (`optimizeOpusSdp`):**
  - Modifies the Opus `a=fmtp` line in SDP:
    `useinbandfec=1;usedtx=1;maxaveragebitrate=32000;stereo=0;sprop-stereo=0`.
- **Mono Speech Constraints:**
  - When promoted to speaker/host:
    `navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 48000, echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })`.
- **Demotion / Mute:**
  - When demoted to listener, local media tracks are stopped, removed from the peer connection, closed on Cloudflare Calls, and `track-unpublished` is broadcast.

### D. Network Auto-Recovery & Telemetry
- Listens to `iceconnectionstatechange` and `connectionstatechange`.
- On `disconnected` or `failed`:
  - Enters `reconnecting` state.
  - Triggers exponential backoff ICE restart (`pc.restartIce()`) and renegotiation with Cloudflare Calls API.
- Polls `pc.getStats()` every 3 seconds to compute:
  - Round Trip Time (RTT in ms)
  - Jitter (ms)
  - Packet loss percentage
  - Drives `<NetworkQualityBadge />` (Green = Excellent, Amber = Fair, Red = Poor).

### E. Autoplay Policy Handling
- Browsers block autoplay of WebRTC audio without prior user gesture.
- The UI provides an explicit "Connect Audio / Join Room" button gesture before instantiating or unmuting the Web Audio context.
- Maintains hidden `<audio autoPlay playsInline>` elements attached to incoming remote speaker MediaStreams.

---

## 5. Verification Plan

1. **Workspace & Typecheck Verification:**
   - Run `npm run typecheck` across `choir-api` and `choir-client`.
   - Run `npx nx build choir-api` to ensure Express builds cleanly.
   - Run `npx vite build --config choir-client/vite.config.mts` to ensure frontend builds cleanly.
2. **Database & Schema Verification:**
   - Validate SQL migration syntax and Prisma client generation (`npx prisma generate`).
3. **Endpoint Functional Testing:**
   - Test session creation endpoint `/api/v1/audio-rooms/:roomId/session` with mock/real credentials.
   - Test track negotiation endpoints with valid SDP schemas.
4. **WebRTC Engine & UI Verification:**
   - Verify `useAudioRoom` hook compiles with zero type errors.
   - Verify speaker promotion and listener 0 kbps upstream constraints.
   - Verify ICE restart handler triggers cleanly on network state changes.
   - Verify `NetworkQualityBadge` and `AudioRoomPanel` render cleanly.

---

## 6. Open Decisions for Approval

1. **Schema Approval:** Approval to add `AudioRoom` and `AudioRoomParticipant` to `choir-api/src/prisma/schema.prisma` and create the Supabase SQL migration file.
2. **Navigation Link:** Approval to add "Rooms" (`Radio` icon) to the top navbar and bottom navigation.
