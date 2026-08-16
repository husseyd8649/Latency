import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function protectAllMonitors() {
  const userId = process.argv[2];
  
  if (!userId) {
    console.error("Usage: npx ts-node scripts/protect-existing-monitors.ts <userId>");
    console.error("Get your user ID from the database or session");
    process.exit(1);
  }

  try {
    const result = await prisma.monitor.updateMany({
      where: { userId },
      data: { isProtected: true },
    });

    console.log(`✅ Protected ${result.count} monitors for user ${userId}`);
    console.log(`These monitors are now safe from bulk deletion.`);
  } catch (error) {
    console.error("❌ Error protecting monitors:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

protectAllMonitors();