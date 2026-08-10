-- One-time cleanup: delete Check rows older than 30 days
DELETE FROM "Check"
WHERE "checkedAt" < NOW() - INTERVAL '30 days';