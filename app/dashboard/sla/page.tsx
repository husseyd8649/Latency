import { requireUser } from "@/lib/auth-helpers";
import { generateSLAReport, getAvailableMonths } from "@/lib/sla";
import { Calendar, Activity, Clock, Shield, AlertCircle } from "lucide-react";
import Link from "next/link";
import { ExportPDFButton } from "@/components/sla-export-button";

export default async function SLAPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  
  const now = new Date();
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;
  
  const report = await generateSLAReport(user.id, year, month);
  const availableMonths = getAvailableMonths();

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text)]">SLA Reports</h1>
            <p className="text-sm text-[var(--text-muted)]">Uptime calculations excluding maintenance windows</p>
          </div>
        </div>
        
        <ExportPDFButton report={report} />
      </div>

      {/* Month Selector */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-[var(--text)]">
            <Calendar className="w-4 h-4 text-[var(--accent)]" />
            <span className="font-medium">Reporting Period</span>
          </div>
          
          <div className="flex gap-2">
            {availableMonths.slice(0, 6).map((m) => (
              <Link
                key={`${m.year}-${m.month}`}
                href={`/dashboard/sla?year=${m.year}&month=${m.month}`}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  m.year === year && m.month === month
                    ? "bg-[var(--accent)] text-white"
                    : "bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--accent)]/10"
                }`}
              >
                {m.label}
              </Link>
            ))}
          </div>
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
          subtitle="Active tracked"
          icon={Shield}
          trend="neutral"
        />
      </div>

      {/* Monitors Detail */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="font-semibold text-[var(--text)]">Monitor Details</h2>
          <span className="text-xs text-[var(--text-muted)]">
            Showing {report.monitors.length} monitors
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
                  {monitor.incidents.map((incident) => (
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
                        {incident.effectiveDowntimeMinutes}m downtime
                        {incident.durationMinutes > incident.effectiveDowntimeMinutes && (
                          <span className="text-[var(--text-subtle)] ml-1">
                            ({incident.durationMinutes}m total)
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Calculation Note */}
      <div className="p-4 bg-[var(--surface)] border border-[var(--border)] rounded-xl">
        <h3 className="font-medium text-[var(--text)] mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--accent)]" />
          SLA Calculation Method
        </h3>
        <ul className="text-sm text-[var(--text-muted)] space-y-1 list-disc list-inside">
          <li>Uptime = (Total Time - Downtime) / Total Time × 100</li>
          <li>Downtime excludes any period overlapping with scheduled maintenance windows</li>
          <li>Incidents still open at month end use current time as resolution (pro-rated)</li>
          <li>Calculations use UTC timezone for consistency</li>
        </ul>
      </div>
    </div>
  );
}

function SLACard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend 
}: { 
  title: string; 
  value: string; 
  subtitle: string; 
  icon: any;
  trend: "good" | "warning" | "neutral";
}) {
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