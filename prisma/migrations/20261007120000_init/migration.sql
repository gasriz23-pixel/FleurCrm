-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'COMMERCIAL', 'BACKOFFICE');
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'OPPORTUNITY', 'WON', 'LOST');
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELLED');
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
CREATE TYPE "SearchJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE "EnrichmentJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE "User" (
"id" TEXT NOT NULL,"name" TEXT NOT NULL,"email" TEXT NOT NULL,"role" "UserRole" NOT NULL DEFAULT 'COMMERCIAL',
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "User_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Company" (
"id" TEXT NOT NULL,"name" TEXT NOT NULL,"normalizedName" TEXT NOT NULL,"identityKey" TEXT NOT NULL,"category" TEXT,"address" TEXT,"city" TEXT,"province" TEXT,"region" TEXT,"cap" TEXT,"website" TEXT,"normalizedWebsite" TEXT,"phone" TEXT,"email" TEXT,"status" "LeadStatus" NOT NULL DEFAULT 'NEW',"rating" DOUBLE PRECISION,"reviewCount" INTEGER,"roomsOrSeats" INTEGER,"decisionMakerName" TEXT,"decisionMakerRole" TEXT,"linkedinUrl" TEXT,"confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,"lastVerifiedAt" TIMESTAMP(3),"sourceUrl" TEXT,"deletedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Company_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Contact" (
"id" TEXT NOT NULL,"companyId" TEXT NOT NULL,"name" TEXT,"role" TEXT,"email" TEXT,"phone" TEXT,"linkedinUrl" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Contact_pkey" PRIMARY KEY ("id"));
CREATE TABLE "LeadSource" (
"id" TEXT NOT NULL,"companyId" TEXT NOT NULL,"provider" TEXT NOT NULL,"url" TEXT,"verifiedAt" TIMESTAMP(3),"rawConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "LeadSource_pkey" PRIMARY KEY ("id"));
CREATE TABLE "Task" (
"id" TEXT NOT NULL,"title" TEXT NOT NULL,"description" TEXT,"status" "TaskStatus" NOT NULL DEFAULT 'TODO',"priority" "Priority" NOT NULL DEFAULT 'MEDIUM',"dueAt" TIMESTAMP(3),"assigneeId" TEXT,"creatorId" TEXT,"companyId" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Task_pkey" PRIMARY KEY ("id"));
CREATE TABLE "SearchJob" (
"id" TEXT NOT NULL,"status" "SearchJobStatus" NOT NULL DEFAULT 'QUEUED',"query" TEXT NOT NULL,"city" TEXT,"province" TEXT,"region" TEXT,"cap" TEXT,"radiusKm" DOUBLE PRECISION,"categories" JSONB NOT NULL,"filters" JSONB,"progress" INTEGER NOT NULL DEFAULT 0,"totalFound" INTEGER NOT NULL DEFAULT 0,"error" TEXT,"startedAt" TIMESTAMP(3),"completedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "SearchJob_pkey" PRIMARY KEY ("id"));
CREATE TABLE "EnrichmentJob" (
"id" TEXT NOT NULL,"companyId" TEXT NOT NULL,"status" "EnrichmentJobStatus" NOT NULL DEFAULT 'QUEUED',"progress" INTEGER NOT NULL DEFAULT 0,"pagesVisited" INTEGER NOT NULL DEFAULT 0,"fieldsFound" INTEGER NOT NULL DEFAULT 0,"error" TEXT,"startedAt" TIMESTAMP(3),"completedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "EnrichmentJob_pkey" PRIMARY KEY ("id"));
CREATE TABLE "AuditLog" (
"id" TEXT NOT NULL,"userId" TEXT,"entityType" TEXT NOT NULL,"entityId" TEXT NOT NULL,"action" TEXT NOT NULL,"payload" JSONB,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id"));

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Company_identityKey_key" ON "Company"("identityKey");
CREATE INDEX "Company_city_idx" ON "Company"("city");
CREATE INDEX "Company_province_idx" ON "Company"("province");
CREATE INDEX "Company_region_idx" ON "Company"("region");
CREATE INDEX "Company_cap_idx" ON "Company"("cap");
CREATE INDEX "Company_category_idx" ON "Company"("category");
CREATE INDEX "Company_status_idx" ON "Company"("status");
CREATE INDEX "Company_normalizedWebsite_idx" ON "Company"("normalizedWebsite");
CREATE INDEX "Company_normalizedName_city_idx" ON "Company"("normalizedName","city");
CREATE INDEX "Company_deletedAt_idx" ON "Company"("deletedAt");
CREATE INDEX "Contact_companyId_idx" ON "Contact"("companyId");
CREATE INDEX "Contact_email_idx" ON "Contact"("email");
CREATE INDEX "LeadSource_companyId_idx" ON "LeadSource"("companyId");
CREATE INDEX "LeadSource_provider_idx" ON "LeadSource"("provider");
CREATE INDEX "Task_assigneeId_status_idx" ON "Task"("assigneeId","status");
CREATE INDEX "Task_dueAt_idx" ON "Task"("dueAt");
CREATE INDEX "Task_companyId_status_idx" ON "Task"("companyId","status");
CREATE INDEX "SearchJob_status_createdAt_idx" ON "SearchJob"("status","createdAt");
CREATE INDEX "EnrichmentJob_companyId_createdAt_idx" ON "EnrichmentJob"("companyId","createdAt");
CREATE INDEX "EnrichmentJob_status_createdAt_idx" ON "EnrichmentJob"("status","createdAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType","entityId");
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId","createdAt");

ALTER TABLE "Contact" ADD CONSTRAINT "Contact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeadSource" ADD CONSTRAINT "LeadSource_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EnrichmentJob" ADD CONSTRAINT "EnrichmentJob_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;