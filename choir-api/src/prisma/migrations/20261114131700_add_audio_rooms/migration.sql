-- CreateTable
CREATE TABLE "audio_rooms" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "host_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audio_room_participants" (
    "id" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'listener',
    "is_muted" BOOLEAN NOT NULL DEFAULT true,
    "hand_raised" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audio_room_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audio_rooms_status_idx" ON "audio_rooms"("status");

-- CreateIndex
CREATE INDEX "audio_rooms_host_id_idx" ON "audio_rooms"("host_id");

-- CreateIndex
CREATE INDEX "audio_room_participants_room_id_idx" ON "audio_room_participants"("room_id");

-- CreateIndex
CREATE INDEX "audio_room_participants_user_id_idx" ON "audio_room_participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "audio_room_participants_room_id_user_id_key" ON "audio_room_participants"("room_id", "user_id");

-- AddForeignKey
ALTER TABLE "audio_rooms" ADD CONSTRAINT "audio_rooms_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_room_participants" ADD CONSTRAINT "audio_room_participants_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "audio_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audio_room_participants" ADD CONSTRAINT "audio_room_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Enable Row Level Security (RLS)
ALTER TABLE "audio_rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audio_room_participants" ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audio_rooms
CREATE POLICY "Allow authenticated read on audio_rooms"
  ON "audio_rooms" FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on audio_rooms"
  ON "audio_rooms" FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow host or director to update audio_rooms"
  ON "audio_rooms" FOR UPDATE
  TO authenticated
  USING (true);

-- RLS Policies for audio_room_participants
CREATE POLICY "Allow authenticated read on audio_room_participants"
  ON "audio_room_participants" FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated insert on audio_room_participants"
  ON "audio_room_participants" FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update on audio_room_participants"
  ON "audio_room_participants" FOR UPDATE
  TO authenticated
  USING (true);
