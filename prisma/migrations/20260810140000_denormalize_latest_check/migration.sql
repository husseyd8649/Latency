-- Add denormalized latest-check columns to Monitor
ALTER TABLE "Monitor" ADD COLUMN "lastStatus" "CheckStatus";
ALTER TABLE "Monitor" ADD COLUMN "lastResponseTimeMs" INTEGER;
ALTER TABLE "Monitor" ADD COLUMN "lastError" TEXT;

-- Backfill from existing Check data using DISTINCT ON to get latest per monitor
UPDATE "Monitor" m
SET
  "lastStatus" = latest."status",
  "lastResponseTimeMs" = latest."responseTimeMs",
  "lastError" = latest."error",
  "lastCheckedAt" = latest."checkedAt"
FROM (
  SELECT DISTINCT ON ("monitorId")
    "monitorId",
    "status",
    "responseTimeMs",
    "error",
    "checkedAt"
  FROM "Check"
  ORDER BY "monitorId", "checkedAt" DESC
) latest
WHERE m."id" = latest."monitorId";