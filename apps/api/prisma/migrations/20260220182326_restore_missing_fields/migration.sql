-- CreateEnum
CREATE TYPE "ExperienceLevel" AS ENUM ('JUNIOR', 'MID', 'SENIOR');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "experienceLevel" "ExperienceLevel" NOT NULL DEFAULT 'MID',
ADD COLUMN     "issuesResolved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reviewsReceived" INTEGER NOT NULL DEFAULT 0;
