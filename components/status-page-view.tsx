"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Bell, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/primitives";

type Monitor = {
  id: string;
  name: string;
  type: string;
  target: string;
  lastStatus: "UP" | "DOWN" | null;
  lastResponseTimeMs: number | null;
  lastCheckedAt: Date | null;
};

type Incident = {
  id: string;
  monitor: { name: string; type: string };
  startedAt: Date;
  resolvedAt: Date | null;
  cause: string | null;
};

type Props = {
  title: string;
  description?: string | null;
  slug: string;
  monitors: Monitor[];
  incidents: Incident[];
  overallStatus: "operational" | "degraded" | "major-outage";
  uptime30d: string;
  totalMonitors: number;
  downCount: number;
};

export function StatusPageView({
  title,
  description,
  slug,
  monitors,
  incidents,
  overallStatus,
  uptime30d,
  totalMonitors,
  downCount,
}: Props) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      window.location.reload();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    try {
      const res = await fetch(`/api/status-pages/${slug}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setSubscribed(true);
        setEmail("");
      } else {
        const data = await res.json();
        setError(data.error || "Failed to subscribe");
      }
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const statusConfig = {
    operational: {
      icon: CheckCircle2,
      label: "All Systems Operational",
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
    },
    degraded: {
      icon: AlertTriangle,
      label: "Partial Outage",
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
    },
    "major-outage": {
      icon: XCircle,
      label: "Major Outage",
      color: "text-red-500",
      bg: "bg-red-500/10",
      border: "border-red-500/20",
    },
  };

  const config = statusConfig[overallStatus];
  const StatusIcon = config.icon;

  const activeIncidents = incidents.filter(i => !i.resolvedAt);
  const recentResolved = incidents.filter(i => i.resolvedAt).slice(0, 5);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-3">
            {title}
          </h1>
          {description && (
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>

        {/* Status Banner */}
        <div className={`rounded-2xl border ${config.border} ${config.bg} p-8 mb-8 text-center`}>
          <StatusIcon className={`w-16 h-16 ${config.color} mx-auto mb-4`} />
          <h2 className={`text-2xl md:text-3xl font-bold ${config.color} mb-2`}>
            {config.label}
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            {downCount === 0 
              ? `All ${totalMonitors} services are running smoothly` 
              : `${downCount} of ${totalMonitors} services experiencing issues`}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <StatCard
            label="Uptime (30 days)"
            value={`${uptime30d}%`}
            subValue="Target: 99.9%"
          />
          <StatCard
            label="Active Monitors"
            value={totalMonitors.toString()}
            subValue={`${totalMonitors - downCount} healthy`}
          />
          <StatCard
            label="Active Incidents"
            value={activeIncidents.length.toString()}
            subValue={activeIncidents.length === 0 ? "All clear" : "In progress"}
            alert={activeIncidents.length > 0}
          />
        </div>

        {/* Monitors List */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm mb-10">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Service Status
            </h3>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {monitors.map((monitor) => (
              <MonitorRow key={monitor.id} monitor={monitor} />
            ))}
          </div>
        </div>

        {/* Active Incidents */}
        {activeIncidents.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Active Incidents
            </h3>
            <div className="space-y-4">
              {activeIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} active />
              ))}
            </div>
          </div>
        )}

        {/* Recent History */}
        {recentResolved.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Recent Incidents
            </h3>
            <div className="space-y-3">
              {recentResolved.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))}
            </div>
          </div>
        )}

        {/* Subscribe */}
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 p-6 md:p-8">
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-slate-500" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Get notified
            </h3>
          </div>
          
          {subscribed ? (
            <div className="text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ You&apos;ll receive email notifications for new incidents
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Button type="submit" className="whitespace-nowrap">
                Subscribe to updates
              </Button>
            </form>
          )}
          {error && (
            <p className="text-red-500 text-sm mt-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center justify-center gap-2 mb-2">
            <RefreshCw className="w-4 h-4" />
            <span>Auto-refreshes every 30 seconds</span>
          </div>
          <p>
            Last updated: {lastUpdated.toLocaleString()} • 
            Powered by <a href="https://latency-4hkf.onrender.com" className="text-blue-500 hover:underline">Latency</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  subValue, 
  alert = false 
}: { 
  label: string; 
  value: string; 
  subValue: string;
  alert?: boolean;
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border p-6 text-center ${
      alert ? "border-red-200 dark:border-red-900/50 bg-red-50/50" : "border-slate-200 dark:border-slate-800"
    }`}>
      <div className={`text-3xl font-bold mb-1 ${
        alert ? "text-red-600 dark:text-red-400" : "text-slate-900 dark:text-white"
      }`}>
        {value}
      </div>
      <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">{label}</div>
      <div className="text-xs text-slate-400 dark:text-slate-500">{subValue}</div>
    </div>
  );
}

function MonitorRow({ monitor }: { monitor: Monitor }) {
  const isUp = monitor.lastStatus === "UP";
  const isDown = monitor.lastStatus === "DOWN";
  
  return (
    <div className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${
          isUp ? "bg-emerald-500" : isDown ? "bg-red-500" : "bg-slate-300"
        }`} />
        <div>
          <div className="font-medium text-slate-900 dark:text-white">
            {monitor.name}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            {monitor.target}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-medium ${
          isUp ? "text-emerald-600 dark:text-emerald-400" : 
          isDown ? "text-red-600 dark:text-red-400" : "text-slate-400"
        }`}>
          {isUp ? "Operational" : isDown ? "Down" : "Unknown"}
        </div>
        {monitor.lastResponseTimeMs && (
          <div className="text-xs text-slate-400 dark:text-slate-500">
            {monitor.lastResponseTimeMs}ms
          </div>
        )}
      </div>
    </div>
  );
}

function IncidentCard({ incident, active = false }: { incident: Incident; active?: boolean }) {
  const duration = incident.resolvedAt
    ? formatDuration(incident.resolvedAt.getTime() - incident.startedAt.getTime())
    : formatDuration(Date.now() - incident.startedAt.getTime());

  return (
    <div className={`rounded-lg border p-4 ${
      active 
        ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/20" 
        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="font-medium text-slate-900 dark:text-white mb-1">
            {incident.monitor.name} - {active ? "Ongoing" : "Resolved"}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {incident.cause || "Service disruption detected"}
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-500">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Started {incident.startedAt.toLocaleString()}
            </span>
            <span>Duration: {duration}</span>
          </div>
        </div>
        {active && (
          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">
            Active
          </span>
        )}
      </div>
    </div>
  );
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ${min % 60}m`;
  const days = Math.floor(hr / 24);
  return `${days}d ${hr % 24}h`;
}