import { prisma } from "@/lib/prisma";

async function getUserActivity(userEmail?: string) {
  const where = userEmail ? { user: { email: userEmail } } : {};
  
  const sessions = await prisma.loginHistory.findMany({
    where,
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  console.table(sessions.map(s => ({
    User: s.user.email,
    Device: s.deviceType,
    IP: s.ipAddress,
    Location: s.location,
    Started: s.createdAt.toLocaleString(),
    LastActive: s.lastActiveAt.toLocaleString(),
    Duration: Math.round((Date.now() - s.createdAt.getTime()) / 1000 / 60) + " min"
  })));
  
  // Summary
  const uniqueUsers = new Set(sessions.map(s => s.userId)).size;
  const devices = sessions.reduce((acc, s) => {
    acc[s.deviceType || 'unknown'] = (acc[s.deviceType || 'unknown'] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log(`\nTotal Sessions: ${sessions.length}`);
  console.log(`Unique Users: ${uniqueUsers}`);
  console.log('Devices:', devices);
}

const email = process.argv[2];
getUserActivity(email).finally(() => prisma.$disconnect());