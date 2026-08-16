import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Calendar, Activity, Clock, Shield, AlertCircle, FileText, BarChart3 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ExportPDFButton } from "@/components/sla-export-button";

export default async function SLAPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    generate?: string; 
    monitorIds?: string; 
    from?: string; 
    to?: string;
    error?: string;
  }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  
  // Fetch monitors for selection (lightweight query)
  const monitors = await prisma.monitor.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, type: true, target: true, lastStatus: true },
    orderBy: { name: "asc" },
  });

  // Show configuration form if not generating
  if (!params.generate) {
    return <SLAConfigForm monitors={monitors} error={params.error} urlParams={params} />;
  }

  // Parse selections for report generation
  const selectedMonitorIds = params.monitorIds ? params.monitorIds.split(",").filter(id => id) : [];
  const fromDate = params.from ? new Date(params.from) : null;
  const toDate = params.to ? new Date(params.to) : null;

  // Validate
  if (selectedMonitorIds.length === 0 || !fromDate || !toDate || isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
    redirect("/dashboard/sla?error=Please select at least one monitor and valid dates");
  }

  if (fromDate > toDate) {
    redirect("/dashboard/sla?error=From date must be before To date");
  }

  // Limit date range to prevent excessive load (max 1 year)
  const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in ms
  if (toDate.getTime() - fromDate.getTime() > maxRange) {
    redirect("/dashboard/sla?error=Date range cannot exceed 1 year");
  }

  // Generate report only on-demand
  console.log(`[SLA] Generating report for ${selectedMonitorIds.length} monitors`);
  const report = await generateSLAReport(user.id, selectedMonitorIds, fromDate, toDate);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text)]">SLA Report</h1>
            <p className="text-sm text-[var(--text-muted)]">
              {fromDate.toLocaleDateString()} - {toDate.toLocaleDateString()} • {selectedMonitorIds.length} monitors
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Link 
            href="/dashboard/sla"
            className="px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors text-sm font-medium"
          >
            New Report
          </Link>
          <ExportPDFButton report={report} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SLACard
          title="Uptime"
          value={`${report.overall.uptimePercentage.toFixed(3)}%`}
          subtitle="Target: 99.9%"
          icon={Activity}
          trend={report.overall.uptimePercentage >= 99.9 ? "good" : "warning"}
        />
        <SLACard
          title="Downtime"
          value={`${Math.floor(report.overall.downtimeMinutes / 60)}h ${report.overall.downtimeMinutes % 60}m`}
          subtitle={`${report.overall.incidentCount} incidents`}
          icon={AlertCircle}
          trend={report.overall.downtimeMinutes === 0 ? "good" : "neutral"}
        />
        <SLACard
          title="Maintenance"
          value={`${Math.floor(report.overall.maintenanceMinutes / 60)}h ${report.overall.maintenanceMinutes % 60}m`}
          subtitle="Excluded from SLA"
          icon={Clock}
          trend="neutral"
        />
        <SLACard
          title="Monitors"
          value={`${report.monitors.length}`}
          subtitle="Selected for report"
          icon={Shield}
          trend="neutral"
        />
      </div>

      {/* Results Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text)]">Monitor Details</h2>
          <span className="text-xs text-[var(--text-muted)]">
            Calculated {report.monitors.length} monitors
          </span>
        </div>
        
        <div className="divide-y divide-[var(--border)]">
          {report.monitors.map((monitor) => (
            <div key={monitor.id} className="p-4 hover:bg-[var(--surface-2)]/50 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    monitor.uptimePercentage >= 99.9 ? 'bg-green-500' :
                    monitor.uptimePercentage >= 99.0 ? 'bg-yellow-500' : 'bg-red-500'
                  }`} />
                  <div>
                    <h3 className="font-medium text-[var(--text)]">{monitor.name}</h3>
                    <p className="text-xs text-[var(--text-muted)]">{monitor.target}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${
                    monitor.uptimePercentage >= 99.9 ? 'text-green-600 dark:text-green-400' :
                    monitor.uptimePercentage >= 99.0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {monitor.uptimePercentage.toFixed(3)}%
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">uptime</div>
                </div>
              </div>
              
              {monitor.incidents.length > 0 && (
                <div className="mt-3 pl-5 space-y-2">
                  {monitor.incidents.map((incident: any) => (
                    <div key={incident.id} className="flex items-center justify-between text-sm p-2 bg-[var(--surface-2)] rounded">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        <span className="text-[var(--text)]">
                          {new Date(incident.startedAt).toLocaleDateString()}
                        </span>
                        {incident.overlapsMaintenance && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                            Maintenance excluded
                          </span>
                        )}
                      </div>
                      <div className="text-[var(--text-muted)]">
                        {incident.effectiveDowntimeMinutes}m effective downtime
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Methodology */}
      <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
        <h3 className="font-medium text-[var(--text)] mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--accent)]" />
          Calculation Method
        </h3>
        <ul className="text-sm text-[var(--text-muted)] space-y-1 list-disc list-inside">
          <li>Period: {Math.floor(report.overall.totalMinutes / 1440)} days</li>
          <li>Uptime = (Total Time - Downtime) / Total Time × 100</li>
          <li>Downtime excludes maintenance window overlaps</li>
          <li>Incidents open at period end use report generation time</li>
        </ul>
      </div>
    </div>
  );
}

// Configuration Form Component
function SLAConfigForm({ 
  monitors, 
  error,
  urlParams 
}: { 
  monitors: any[]; 
  error?: string;
  urlParams: any;
}) {
  // Use URL params for date defaults if provided (from quick links)
  const defaultFrom = urlParams?.from || new Date(new Date().setDate(1)).toISOString().split('T')[0];
  const defaultTo = urlParams?.to || new Date().toISOString().split('T')[0];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-[var(--accent)]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Generate SLA Report</h1>
          <p className="text-sm text-[var(--text-muted)]">Select monitors and date range for uptime analysis</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <form action={generateReport} className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-6 space-y-6">
        {/* Monitor Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-[var(--text)]">Select Monitors</label>
          
          <div className="max-h-64 overflow-y-auto border border-[var(--border)] rounded-md bg-[var(--surface-2)] p-2 space-y-1">
            {monitors.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)] p-4 text-center">
                No monitors available. <Link href="/dashboard/add" className="text-[var(--accent)] hover:underline">Add one first</Link>
              </p>
            ) : (
              monitors.map((m) => (
                <label key={m.id} className="flex items-center gap-3 p-3 rounded hover:bg-[var(--surface)] cursor-pointer transition-colors group">
                  <input 
                    type="checkbox" 
                    name="monitorIds" 
                    value={m.id}
                    className="w-4 h-4 rounded border-[var(--border)] bg-[var(--surface)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <div className="flex-1 flex items-center gap-3">
                    <span className="font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">{m.name}</span>
                    <span className="text-xs text-[var(--text-muted)]">{m.type}</span>
                    <span className={`w-2 h-2 rounded-full ${
                      m.lastStatus === 'UP' ? 'bg-green-500' : 
                      m.lastStatus === 'DOWN' ? 'bg-red-500' : 'bg-gray-400'
                    }`} />
                  </div>
                </label>
              ))
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Select specific monitors to include in the report
          </p>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)]">From Date</label>
            <input 
              type="date" 
              name="from"
              required
              defaultValue={defaultFrom}
              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[var(--text)]">To Date</label>
            <input 
              type="date" 
              name="to"
              required
              defaultValue={defaultTo}
              className="w-full px-3 py-2 bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 focus:border-[var(--accent)]"
            />
          </div>
        </div>

        {/* Quick Presets - Fixed to only set dates, not auto-submit */}
        <div className="flex flex-wrap gap-2">
          <QuickDateLink label="This Month" />
          <QuickDateLink label="Last Month" offset={1} />
          <QuickDateLink label="Last 7 Days" days={7} />
          <QuickDateLink label="Last 30 Days" days={30} />
          <QuickDateLink label="Last 90 Days" days={90} />
        </div>

        <div className="pt-4 border-t border-[var(--border)]">
          <button 
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-[var(--accent)] text-white rounded-md hover:opacity-90 transition-opacity font-medium flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Generate Report
          </button>
        </div>
      </form>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <h3 className="font-medium text-[var(--text)] mb-2 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--accent)]" />
            What is SLA?
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            Service Level Agreement tracking calculates uptime percentage excluding scheduled maintenance. 
            Use these reports for customer SLAs and compliance documentation.
          </p>
        </div>
        
        <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
          <h3 className="font-medium text-[var(--text)] mb-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[var(--accent)]" />
            Maintenance Exclusion
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            Any downtime occurring during scheduled maintenance windows is automatically excluded from calculations. 
            Configure windows in the Maintenance section.
          </p>
        </div>
      </div>
    </div>
  );
}

// Fixed QuickDateLink - only sets dates, doesn't auto-submit
function QuickDateLink({ label, offset, days }: { label: string; offset?: number; days?: number }) {
  const to = new Date();
  const from = new Date();
  
  if (days) {
    // Last N days
    from.setDate(from.getDate() - days);
  } else if (offset) {
    // Previous month
    from.setMonth(from.getMonth() - offset);
    from.setDate(1);
    to.setMonth(to.getMonth() - offset + 1);
    to.setDate(0);
  } else {
    // This month (default)
    from.setDate(1);
  }
  
  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];
  
  return (
    <Link
      href={`/dashboard/sla?from=${fromStr}&to=${toStr}`}
      className="px-3 py-1.5 text-sm bg-[var(--surface-2)] border border-[var(--border)] rounded-md text-[var(--text)] hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/30 transition-colors"
    >
      {label}
    </Link>
  );
}

async function generateReport(formData: FormData) {
  "use server";
  
  const monitorIds = formData.getAll("monitorIds").map(String);
  const from = formData.get("from") as string;
  const to = formData.get("to") as string;
  
  if (monitorIds.length === 0) {
    redirect("/dashboard/sla?error=Please select at least one monitor");
  }
  
  const params = new URLSearchParams({
    generate: "true",
    monitorIds: monitorIds.join(","),
    from,
    to,
  });
  
  redirect(`/dashboard/sla?${params.toString()}`);
}

// Optimized SLA calculation for selected monitors only
async function generateSLAReport(
  userId: string, 
  monitorIds: string[], 
  fromDate: Date, 
  toDate: Date
) {
  console.log(`[SLA] Generating report for ${monitorIds.length} monitors, ${fromDate.toISOString()} to ${toDate.toISOString()}`);
  
  const totalMinutes = Math.floor((toDate.getTime() - fromDate.getTime()) / (1000 * 60));
  
  // Fetch only selected monitors
  const monitors = await prisma.monitor.findMany({
    where: { 
      id: { in: monitorIds },
      userId,
    },
    select: { id: true, name: true, type: true, target: true },
  });

  // Fetch maintenance windows overlapping period
  const maintenanceWindows = await prisma.maintenanceWindow.findMany({
    where: {
      userId,
      startsAt: { lte: toDate },
      endsAt: { gte: fromDate },
    },
  });

  // Fetch incidents for selected monitors in date range
  const incidents = await prisma.incident.findMany({
    where: {
      monitorId: { in: monitorIds },
      startedAt: { lte: toDate },
      OR: [
        { resolvedAt: null },
        { resolvedAt: { gte: fromDate } },
      ],
    },
  });

  const monitorSLAs = monitors.map(monitor => {
    const monitorIncidents = incidents.filter(i => i.monitorId === monitor.id);
    let downtimeMinutes = 0;
    let maintenanceMinutes = 0;

    const incidentDetails = monitorIncidents.map(incident => {
      const start = new Date(incident.startedAt);
      const end = incident.resolvedAt ? new Date(incident.resolvedAt) : toDate;
      
      // Clamp to report period
      const effectiveStart = start < fromDate ? fromDate : start;
      const effectiveEnd = end > toDate ? toDate : end;
      const duration = Math.max(0, Math.floor((effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60)));

      // Check maintenance overlap
      let overlapMinutes = 0;
      for (const window of maintenanceWindows) {
        if (window.monitorIds.length > 0 && !window.monitorIds.includes(monitor.id)) continue;
        
        const winStart = new Date(window.startsAt);
        const winEnd = new Date(window.endsAt);
        const overlapStart = effectiveStart > winStart ? effectiveStart : winStart;
        const overlapEnd = effectiveEnd < winEnd ? effectiveEnd : winEnd;
        
        if (overlapEnd > overlapStart) {
          overlapMinutes += Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
        }
      }

      const effectiveDowntime = Math.max(0, duration - overlapMinutes);
      downtimeMinutes += effectiveDowntime;
      maintenanceMinutes += overlapMinutes;

      return {
        id: incident.id,
        startedAt: start,
        resolvedAt: incident.resolvedAt,
        durationMinutes: duration,
        cause: incident.cause,
        overlapsMaintenance: overlapMinutes > 0,
        effectiveDowntimeMinutes: effectiveDowntime,
      };
    });

    const uptime = totalMinutes > 0 ? ((totalMinutes - downtimeMinutes) / totalMinutes) * 100 : 100;

    return {
      id: monitor.id,
      name: monitor.name,
      type: monitor.type,
      target: monitor.target,
      uptimePercentage: Math.round(uptime * 100) / 100,
      totalMinutes,
      downtimeMinutes,
      incidentCount: monitorIncidents.length,
      incidents: incidentDetails,
      maintenanceMinutes,
    };
  });

  const totalDowntime = monitorSLAs.reduce((sum, m) => sum + m.downtimeMinutes, 0);
  const avgUptime = monitorSLAs.length > 0 
    ? monitorSLAs.reduce((sum, m) => sum + m.uptimePercentage, 0) / monitorSLAs.length 
    : 100;

  return {
    period: { start: fromDate, end: toDate, totalMinutes },
    overall: {
      uptimePercentage: Math.round(avgUptime * 100) / 100,
      totalMinutes,
      downtimeMinutes: totalDowntime,
      incidentCount: incidents.length,
      maintenanceMinutes: monitorSLAs.reduce((sum, m) => sum + m.maintenanceMinutes, 0),
    },
    monitors: monitorSLAs,
  };
}

function SLACard({ title, value, subtitle, icon: Icon, trend }: any) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-[var(--text-muted)]">{title}</span>
        <Icon className={`w-4 h-4 ${
          trend === 'good' ? 'text-green-500' : 
          trend === 'warning' ? 'text-yellow-500' : 'text-[var(--text-muted)]'
        }`} />
      </div>
      <div className="text-2xl font-bold text-[var(--text)] mb-1">{value}</div>
      <div className="text-xs text-[var(--text-muted)]">{subtitle}</div>
    </div>
  );
}