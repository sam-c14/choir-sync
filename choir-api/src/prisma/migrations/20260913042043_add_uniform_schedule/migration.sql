-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "UniformSchedule" (
    "id" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "femaleOutfit" TEXT NOT NULL,
    "maleOutfit" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UniformSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UniformSchedule_serviceDate_idx" ON "UniformSchedule"("serviceDate");
