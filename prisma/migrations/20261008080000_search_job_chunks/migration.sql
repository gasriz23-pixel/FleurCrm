CREATE TABLE "SearchJobChunk" (
  "id" TEXT NOT NULL,
  "searchJobId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "location" TEXT NOT NULL,
  "status" "SearchJobStatus" NOT NULL DEFAULT 'QUEUED',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "found" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SearchJobChunk_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SearchJobChunk_searchJobId_sequence_key" ON "SearchJobChunk"("searchJobId", "sequence");
CREATE INDEX "SearchJobChunk_searchJobId_status_idx" ON "SearchJobChunk"("searchJobId", "status");

ALTER TABLE "SearchJobChunk" ADD CONSTRAINT "SearchJobChunk_searchJobId_fkey"
  FOREIGN KEY ("searchJobId") REFERENCES "SearchJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;