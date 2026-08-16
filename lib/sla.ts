import { prisma } from "./prisma";

export type SLAMonth = {
  year: number;
  month: number;
  label: string;
};

export type SLAReport = {
  period: {
    start: Date;
    end: Date;
    month: number;
    year: number;
  };
  overall: {
    uptimePercentage: number;
    totalMinutes: number;
    downtimeMinutes: number;
    incidentCount: number;
    maintenanceMinutes: number;
  };
  monitors: MonitorSLA[];
};

export type MonitorSLA = {
  id: string;
  name: string;
  type: string;
  target: string;
  uptimePercentage: number;
  totalMinutes: number;
  downtimeMinutes: number;
  incidentCount: number;
  incidents: IncidentDetail[];
  maintenanceMinutes: number;
};

export type IncidentDetail = {
  id: string;
  startedAt: Date;
  resolvedAt: Date | null;
  durationMinutes: number;
  cause: string | null;
  overlapsMaintenance: boolean;
  effectiveDowntimeMinutes: number;
};

export async function generateSLAReport(
  userId: string,
  year: number,
  month: number
): Promise<SLAReport> {
  // Calculate month boundaries
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
  
  const totalMinutesInMonth = Math.floor(
    (endOfMonth.getTime() - startOfMonth.getTime()) / (1000 * 60)
  );

  // Get all monitors for user
  const monitors = await prisma.monitor.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      type: true,
      target: true,
    },
  });

  // Get maintenance windows for this month
  const maintenanceWindows = await prisma.maintenanceWindow.findMany({
    where: {
      userId,
      OR: [
        {
          startsAt: { lte: endOfMonth },
          endsAt: { gte: startOfMonth },
        },
      ],
    },
  });

  const monitorSLAs: MonitorSLA[] = [];
  let totalDowntime = 0;
  let totalMaintenance = 0;
  let totalIncidents = 0;

  for (const monitor of monitors) {
    // Get incidents for this monitor in this month
    const incidents = await prisma.incident.findMany({
      where: {
        monitorId: monitor.id,
        startedAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      orderBy: { startedAt: "asc" },
    });

    let monitorDowntime = 0;
    let monitorMaintenance = 0;
    const incidentDetails: IncidentDetail[] = [];

    for (const incident of incidents) {
      const incidentStart = new Date(incident.startedAt);
      const incidentEnd = incident.resolvedAt 
        ? new Date(incident.resolvedAt) 
        : new Date(); // Still open

      // Clamp to month boundaries
      const effectiveStart = incidentStart < startOfMonth ? startOfMonth : incidentStart;
      const effectiveEnd = incidentEnd > endOfMonth ? endOfMonth : incidentEnd;
      
      const durationMs = effectiveEnd.getTime() - effectiveStart.getTime();
      const durationMinutes = Math.max(0, Math.floor(durationMs / (1000 * 60)));

      // Check if overlaps with maintenance
      let overlapsMaintenance = false;
      let maintenanceOverlapMinutes = 0;

      for (const window of maintenanceWindows) {
        // Check if this window applies to this monitor
        const appliesToAll = window.monitorIds.length === 0;
        const appliesToThis = window.monitorIds.includes(monitor.id);
        
        if (!appliesToAll && !appliesToThis) continue;

        const windowStart = new Date(window.startsAt);
        const windowEnd = new Date(window.endsAt);

        // Calculate overlap
        const overlapStart = effectiveStart > windowStart ? effectiveStart : windowStart;
        const overlapEnd = effectiveEnd < windowEnd ? effectiveEnd : windowEnd;
        
        if (overlapEnd > overlapStart) {
          overlapsMaintenance = true;
          const overlapMs = overlapEnd.getTime() - overlapStart.getTime();
          maintenanceOverlapMinutes += Math.floor(overlapMs / (1000 * 60));
        }
      }

      const effectiveDowntime = Math.max(0, durationMinutes - maintenanceOverlapMinutes);
      
      monitorDowntime += effectiveDowntime;
      monitorMaintenance += maintenanceOverlapMinutes;

      incidentDetails.push({
        id: incident.id,
        startedAt: incidentStart,
        resolvedAt: incident.resolvedAt,
        durationMinutes,
        cause: incident.cause,
        overlapsMaintenance,
        effectiveDowntimeMinutes: effectiveDowntime,
      });
    }

    const uptimePercentage = ((totalMinutesInMonth - monitorDowntime) / totalMinutesInMonth) * 100;

    monitorSLAs.push({
      id: monitor.id,
      name: monitor.name,
      type: monitor.type,
      target: monitor.target,
      uptimePercentage: Math.round(uptimePercentage * 100) / 100,
      totalMinutes: totalMinutesInMonth,
      downtimeMinutes: monitorDowntime,
      incidentCount: incidents.length,
      incidents: incidentDetails,
      maintenanceMinutes: monitorMaintenance,
    });

    totalDowntime += monitorDowntime;
    totalMaintenance += monitorMaintenance;
    totalIncidents += incidents.length;
  }

  // Calculate overall (average across all monitors, or aggregate?)
  // For SLA reports, typically we calculate per-monitor and show aggregate
  const avgUptime = monitorSLAs.length > 0
    ? monitorSLAs.reduce((sum, m) => sum + m.uptimePercentage, 0) / monitorSLAs.length
    : 100;

  return {
    period: {
      start: startOfMonth,
      end: endOfMonth,
      month,
      year,
    },
    overall: {
      uptimePercentage: Math.round(avgUptime * 100) / 100,
      totalMinutes: totalMinutesInMonth,
      downtimeMinutes: totalDowntime,
      incidentCount: totalIncidents,
      maintenanceMinutes: totalMaintenance,
    },
    monitors: monitorSLAs,
  };
}

export function getAvailableMonths(): SLAMonth[] {
  const months: SLAMonth[] = [];
  const now = new Date();
  
  // Go back 12 months
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      label: d.toLocaleString('default', { month: 'long', year: 'numeric' }),
    });
  }
  
  return months;
}