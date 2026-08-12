import { prisma } from "@/lib/prisma";

const BATCH_SIZE = 5000;

async function cleanup() {
  console.log("Starting database cleanup...");
  
  // 1. Cleanup Checks (Keep 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  let totalDeletedChecks = 0;
  
  while (true) {
    const checks = await prisma.check.findMany({
      where: { checkedAt: { lt: sevenDaysAgo } },
      select: { id: true },
      take: BATCH_SIZE,
    });
    
    if (checks.length === 0) break;
    
    const result = await prisma.check.deleteMany({
      where: { id: { in: checks.map(c => c.id) } }
    });
    
    totalDeletedChecks += result.count;
    console.log(`Deleted ${totalDeletedChecks} checks so far...`);
    
    // Small delay to prevent overwhelming the DB
    await new Promise(r => setTimeout(r, 100));
  }
  
  // 2. Cleanup Resolved Incidents (Keep 90 days)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const incidents = await prisma.incident.deleteMany({
    where: {
      resolvedAt: { not: null },
      startedAt: { lt: ninetyDaysAgo }
    }
  });
  
  console.log(`✓ Cleanup complete:`);
  console.log(`  - Deleted ${totalDeletedChecks} old checks`);
  console.log(`  - Deleted ${incidents.count} old resolved incidents`);
  
  // Show current counts
  const [checkCount, incidentCount] = await Promise.all([
    prisma.check.count(),
    prisma.incident.count()
  ]);
  
  console.log(`\nCurrent totals:`);
  console.log(`  - Checks: ${checkCount}`);
  console.log(`  - Incidents: ${incidentCount}`);
}

cleanup()
  .catch(console.error)
  .finally(() => prisma.$disconnect());