-- CreateEnum
CREATE TYPE "VoicePartType" AS ENUM ('SOPRANO', 'ALTO', 'TENOR');

-- CreateEnum
CREATE TYPE "SongStatus" AS ENUM ('REHEARSAL', 'ACTIVE_SUNDAY', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SongComplexity" AS ENUM ('EASY', 'MODERATE', 'CHALLENGING');

-- CreateEnum
CREATE TYPE "LinkPlatform" AS ENUM ('SPOTIFY', 'YOUTUBE', 'AUDIOMACK', 'OTHER');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DIRECTOR', 'SECTION_LEADER', 'CHORISTER');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'CHORISTER',
    "leadsVoicePart" "VoicePartType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Song" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "composer" TEXT,
    "complexity" "SongComplexity" NOT NULL DEFAULT 'MODERATE',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "SongStatus" NOT NULL DEFAULT 'ACTIVE_SUNDAY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Song_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongPart" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "voicePart" "VoicePartType" NOT NULL,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SongPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SongLink" (
    "id" TEXT NOT NULL,
    "songId" TEXT NOT NULL,
    "platform" "LinkPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SongLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "Song_title_idx" ON "Song"("title");

-- CreateIndex
CREATE INDEX "Song_status_idx" ON "Song"("status");

-- CreateIndex
CREATE INDEX "Song_complexity_idx" ON "Song"("complexity");

-- CreateIndex
CREATE INDEX "Song_tags_idx" ON "Song" USING GIN ("tags");

-- CreateIndex
CREATE INDEX "SongPart_voicePart_idx" ON "SongPart"("voicePart");

-- CreateIndex
CREATE UNIQUE INDEX "SongPart_songId_voicePart_key" ON "SongPart"("songId", "voicePart");

-- CreateIndex
CREATE INDEX "SongLink_songId_idx" ON "SongLink"("songId");

-- AddForeignKey
ALTER TABLE "SongPart" ADD CONSTRAINT "SongPart_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SongLink" ADD CONSTRAINT "SongLink_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song"("id") ON DELETE CASCADE ON UPDATE CASCADE;
