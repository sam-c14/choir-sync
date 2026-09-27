-- CreateEnum
CREATE TYPE "VoicePartRosterRole" AS ENUM ('SOPRANO', 'ALTO', 'TENOR', 'LEAD');

-- CreateTable
CREATE TABLE "ServiceRoster" (
    "id" TEXT NOT NULL,
    "playlistId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServiceRoster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RosterMember" (
    "id" TEXT NOT NULL,
    "rosterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedRole" "VoicePartRosterRole" NOT NULL,
    "notes" TEXT,
    "notified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RosterMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRoster_playlistId_key" ON "ServiceRoster"("playlistId");

-- CreateIndex
CREATE UNIQUE INDEX "RosterMember_rosterId_userId_key" ON "RosterMember"("rosterId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- AddForeignKey
ALTER TABLE "ServiceRoster" ADD CONSTRAINT "ServiceRoster_playlistId_fkey" FOREIGN KEY ("playlistId") REFERENCES "Playlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterMember" ADD CONSTRAINT "RosterMember_rosterId_fkey" FOREIGN KEY ("rosterId") REFERENCES "ServiceRoster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RosterMember" ADD CONSTRAINT "RosterMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
