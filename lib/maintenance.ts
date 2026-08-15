import { prisma } from "./prisma";

export async function isInMaintenanceWindow(
  monitorId: string, 
  userId: string
): Promise<boolean> {
  const now = new Date();
  
  const window = await prisma.maintenanceWindow.findFirst({
    where: {
      userId,
      startsAt: { lte: now },
      endsAt: { gte: now },
      OR: [
        { monitorIds: { has: monitorId } },
        { monitorIds: { isEmpty: true } }
      ]
    }
  });
  
  return !!window;
}