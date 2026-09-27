-- CreateTable
CREATE TABLE "VoiceSnippet" (
    "id" TEXT NOT NULL,
    "songPartId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceSnippet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceSnippet_songPartId_idx" ON "VoiceSnippet"("songPartId");

-- AddForeignKey
ALTER TABLE "VoiceSnippet" ADD CONSTRAINT "VoiceSnippet_songPartId_fkey" FOREIGN KEY ("songPartId") REFERENCES "SongPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceSnippet" ADD CONSTRAINT "VoiceSnippet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
