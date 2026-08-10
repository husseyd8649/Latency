-- One-time cleanup: delete Check rows older than 30 days
-- Older data isn't queried by any page (dailyUptimeForMonitor only needs 30 days)
DELETE FROM "Check"
WHERE "checkedAt" < NOW() - INTERVAL '30 days';

-- Reclaim disk space and update query planner stats
VACUUM ANALYZE "Check";