import Link from "next/link";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Badge } from "@/components/ui/primitives";
import { LandingMiniGauge } from "@/components/landing-mini-gauge";
import { LandingMiniSparkline } from "@/components/landing-mini-sparkline";
import {
  Activity,
  ArrowRight,
  Bell,
  Globe,
  ShieldCheck,
  Webhook,
  Zap,
  Check,
  Minus,
  Trophy,
  TrendingUp,
  Sparkles,
  Layers,
} from "lucide-react";

export default async function Landing() {
  const session = await auth();

  const features = [
    {
      icon: Activity,
      title: "HTTP, TCP, SSL",
      desc: "One tool for endpoints, ports, and certificate expiry.",
      accent: "#2DD4BF",
    },
    {
      icon: Globe,
      title: "Public status pages",
      desc: "Share uptime with customers on a free subdomain.",
      accent: "#2563EB",
    },
    {
      icon: Webhook,
      title: "HMAC webhooks",
      desc: "Signed payloads your systems can verify.",
      accent: "#7C3AED",
    },
    {
      icon: Bell,
      title: "Instant detection",
      desc: "Automatic incident open on failure, resolve on recovery.",
      accent: "#EC4899",
    },
    {
      icon: ShieldCheck,
      title: "SSL expiry alerts",
      desc: "Get warned before a certificate expires.",
      accent: "#F59E0B",
    },
    {
      icon: Zap,
      title: "Bulk CSV import",
      desc: "Onboard hundreds of monitors in under a minute.",
      accent: "#10B981",
    },
  ];

  const comparison = [
    { feature: "HTTP monitoring", latency: true, generic: true },
    { feature: "TCP port checks", latency: true, generic: false },
    { feature: "SSL expiry monitoring", latency: true, generic: false },
    { feature: "Public status pages", latency: true, generic: true },
    { feature: "HMAC-signed webhooks", latency: true, generic: false },
    { feature: "Bulk CSV import", latency: true, generic: false },
    { feature: "Zero-config setup", latency: true, generic: false },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center shadow-[var(--shadow-sm)]">
              <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold tracking-tight">Latency</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-xs text-[var(--text-muted)]">
            <a href="#features" className="hover:text-[var(--text)] transition-colors">Features</a>
            <a href="#comparison" className="hover:text-[var(--text)] transition-colors">Compare</a>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <Link href="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/signin">
                  <Button size="sm" variant="secondary">Sign in</Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm">Sign up</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero — with gauge visual */}
      <section className="border-b border-[var(--border)] relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 30% 40%, #2563EB, transparent 70%)`,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 50% 40% at 80% 60%, #2DD4BF, transparent 70%)`,
          }}
        />

        <div className="max-w-6xl mx-auto px-6 py-20 relative">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 items-center">
            {/* Left: copy */}
            <div>
              <Badge variant="accent" className="mb-5">
                <Sparkles className="w-3 h-3" />
                MVP prototype
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-[var(--text)] leading-[1.05]">
                Uptime monitoring for teams that{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage:
                      "linear-gradient(to right, #2DD4BF, #2563EB)",
                  }}
                >
                  ship.
                </span>
              </h1>
              <p className="mt-5 text-base md:text-lg text-[var(--text-muted)] max-w-xl leading-relaxed">
                HTTP, TCP, and SSL checks. Public status pages. HMAC-signed
                webhooks. Bulk CSV import. Live in under five minutes.
              </p>
              <div className="mt-7 flex items-center gap-3 flex-wrap">
                <Link href={session ? "/dashboard" : "/signup"}>
                  <Button>
                    {session ? "Open dashboard" : "Get started"}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button variant="secondary">See features</Button>
                </Link>
              </div>

              {/* Micro-signal row */}
              <div className="mt-8 flex items-center gap-5 text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[var(--op-up)]" strokeWidth={3} />
                  No credit card
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[var(--op-up)]" strokeWidth={3} />
                  Deploy anywhere
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[var(--op-up)]" strokeWidth={3} />
                  Open patterns
                </div>
              </div>
            </div>

            {/* Right: gauge visual */}
            <div className="hidden lg:flex justify-center">
              <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] p-6 w-full max-w-[280px]">
                <div
                  className="absolute inset-0 opacity-[0.08] pointer-events-none rounded-2xl"
                  style={{
                    background: `radial-gradient(ellipse 60% 55% at 50% 45%, #3B82F6, transparent 70%)`,
                  }}
                />
                <div className="relative flex flex-col items-center">
                  <LandingMiniGauge
                    value={99.92}
                    label="SITE HEALTH"
                    displayValue="99"
                    tierLabel="EXCELLENT"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Product snapshot */}
          <div className="mt-14 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--op-down)]/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--op-degraded)]/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--op-up)]/60" />
                </div>
                <div className="text-xs font-mono text-[var(--text-muted)] ml-2">
                  latency.app / dashboard
                </div>
              </div>
              <Badge variant="up">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--op-up)] animate-pulse-dot" />
                Operational
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
              <Stat label="Monitors" value="500" />
              <Stat label="Uptime (24h)" value="99.92%" trend="up" />
              <div className="p-4 text-center flex flex-col items-center justify-center">
                <div className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] mb-2">
                  Response Trend
                </div>
                <LandingMiniSparkline />
              </div>
              <Stat label="Active incidents" value="2" trend="none" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-2xl">
            <Badge variant="neutral" className="mb-4">
              <Layers className="w-3 h-3" />
              Features
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Everything you need.{" "}
              <span className="text-[var(--text-muted)]">Nothing extra.</span>
            </h2>
            <p className="text-[var(--text-muted)] mt-3 text-base leading-relaxed">
              A focused toolkit for teams that value speed and clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group relative p-6 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all overflow-hidden"
                >
                  {/* Soft accent glow on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-[0.05] transition-opacity pointer-events-none"
                    style={{
                      background: `radial-gradient(ellipse 60% 60% at 30% 30%, ${f.accent}, transparent 70%)`,
                    }}
                  />
                  <div className="relative">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 shadow-[var(--shadow-sm)]"
                      style={{
                        backgroundColor: `${f.accent}20`,
                        color: f.accent,
                      }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-sm font-semibold text-[var(--text)]">
                      {f.title}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] mt-1.5 leading-relaxed">
                      {f.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="comparison" className="border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6 py-20">
          <div className="max-w-2xl">
            <Badge variant="neutral" className="mb-4">
              <Trophy className="w-3 h-3" />
              Comparison
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              How Latency compares
            </h2>
            <p className="text-[var(--text-muted)] mt-3">
              Feature parity against a generic uptime monitor.
            </p>
          </div>

          <div className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-[var(--shadow-sm)]">
            <div className="grid grid-cols-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
              <div className="p-4 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                Feature
              </div>
              <div className="p-4 text-center text-[10px] font-bold uppercase tracking-wider">
                <span
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(to right, #2DD4BF, #2563EB)",
                  }}
                >
                  Latency
                </span>
              </div>
              <div className="p-4 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                Others
              </div>
            </div>
            {comparison.map((c, i) => (
              <div
                key={c.feature}
                className={`grid grid-cols-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/40 transition-colors ${
                  i % 2 === 1 ? "bg-[var(--surface-2)]/20" : ""
                }`}
              >
                <div className="p-4 text-sm text-[var(--text)] font-medium">
                  {c.feature}
                </div>
                <div className="p-4 flex items-center justify-center">
                  {c.latency ? (
                    <div className="w-6 h-6 rounded-full bg-[var(--accent-soft)] flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-[var(--accent)]" strokeWidth={3} />
                    </div>
                  ) : (
                    <Minus className="w-4 h-4 text-[var(--text-subtle)]" />
                  )}
                </div>
                <div className="p-4 flex items-center justify-center">
                  {c.generic ? (
                    <Check className="w-4 h-4 text-[var(--text-subtle)]" />
                  ) : (
                    <Minus className="w-4 h-4 text-[var(--text-subtle)]" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-subtle)] mt-3">
            Comparison based on typical free tiers. Verify current features against each vendor.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-b border-[var(--border)] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 60% at 50% 50%, #2563EB, transparent 70%)`,
          }}
        />
        <div className="max-w-3xl mx-auto px-6 py-20 text-center relative">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--accent-soft)] mb-5">
            <Zap className="w-5 h-5 text-[var(--accent)]" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Ready to start{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{
                backgroundImage: "linear-gradient(to right, #2DD4BF, #2563EB)",
              }}
            >
              monitoring
            </span>
            ?
          </h2>
          <p className="mt-4 text-[var(--text-muted)] text-base">
            Add your first monitor in under a minute. No credit card required.
          </p>
          <Link href={session ? "/dashboard" : "/signup"} className="inline-block mt-7">
            <Button>
              {session ? "Open dashboard" : "Get started"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-[var(--text-subtle)]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-[var(--accent)] flex items-center justify-center">
              <Zap className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
            </div>
            <span>© {new Date().getFullYear()} Latency</span>
          </div>
          <div>Built as an MVP prototype.</div>
        </div>
      </footer>
    </div>
  );
}

function Stat({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: "up" | "down" | "none";
}) {
  return (
    <div className="p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
        {label}
      </div>
      <div className="font-mono text-lg mt-1 font-semibold flex items-center justify-center gap-1.5">
        {value}
        {trend === "up" && (
          <TrendingUp className="w-3.5 h-3.5 text-[var(--op-up)]" strokeWidth={3} />
        )}
      </div>
    </div>
  );
}