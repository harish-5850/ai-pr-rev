-- AlterTable
ALTER TABLE "conversations" ALTER COLUMN "githubCommentId" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "organizations" ALTER COLUMN "githubId" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "pull_requests" ALTER COLUMN "githubId" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "repositories" ALTER COLUMN "githubId" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "githubId" SET DATA TYPE BIGINT;
