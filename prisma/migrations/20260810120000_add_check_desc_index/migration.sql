-- Drop old ascending index if it exists
DROP INDEX IF EXISTS "Check_monitorId_checkedAt_idx";

-- Recreate with descending checkedAt to match latest-check query patterns
CREATE INDEX "Check_monitorId_checkedAt_idx"
ON "Check" ("monitorId", "checkedAt" DESC);