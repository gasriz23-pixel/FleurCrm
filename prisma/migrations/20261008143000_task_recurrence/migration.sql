ALTER TABLE "Task" ADD COLUMN "recurrenceRule" TEXT;
ALTER TABLE "Task" ADD COLUMN "nextRunAt" TIMESTAMP(3);
CREATE INDEX "Task_nextRunAt_idx" ON "Task"("nextRunAt");
