import Link from "next/link";
import Image from "next/image";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Badge } from "@/components/ui/primitives";
import { OptimizedHeroImage } from "@/components/optimized-hero-image";
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
  Sparkles,
  Layers,
  TrendingUp,
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

      {/* Hero */}
      <section className="border-b border-[var(--border)] relative overflow-hidden">
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

        <div className="max-w-6xl mx-auto px-6 py-16 lg:py-20 relative">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.3fr] gap-12 lg:gap-16 items-center">
            {/* Left: copy */}
            <div className="max-w-xl">
              <Badge variant="accent" className="mb-5">
                <Sparkles className="w-3 h-3" />
                MVP prototype
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-[3.25rem] font-bold tracking-tight text-[var(--text)] leading-[1.05]">
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
              <p className="mt-5 text-base md:text-lg text-[var(--text-muted)] leading-relaxed">
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

            {/* Right: Screenshot with skeleton loader */}
            <div className="relative lg:translate-y-4">
              <div
                className="absolute -inset-4 opacity-20 blur-3xl pointer-events-none rounded-full"
                style={{
                  background: `linear-gradient(135deg, #2DD4BF 0%, #2563EB 100%)`,
                }}
              />
              
              <div className="relative rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-xl)] overflow-hidden ring-1 ring-black/5">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                  </div>
                  <div className="flex-1 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-[var(--surface)] text-[10px] text-[var(--text-muted)] font-mono border border-[var(--border)]">
                      <div className="w-3 h-3 rounded-sm bg-[var(--accent)] flex items-center justify-center">
                        <Zap className="w-2 h-2 text-white" strokeWidth={3} />
                      </div>
                      latency.app/dashboard
                    </div>
                  </div>
                  <div className="w-16" />
                </div>

                <OptimizedHeroImage 
                  src="/dashboard-screenshot.png" 
                  alt="Latency dashboard showing uptime monitoring overview with gauges, regional health status, and response time charts" 
                />
              </div>

              <div className="absolute -bottom-3 -right-3 md:bottom-6 md:-right-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-lg)]">
                  <div className="w-2 h-2 rounded-full bg-[var(--op-up)] animate-pulse" />
                  <span className="text-xs font-medium text-[var(--text)]">Live monitoring active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features - Bento Grid */}
<section id="features" className="border-b border-[var(--border)]">
  <div className="max-w-6xl mx-auto px-6 py-20">
    <div className="max-w-2xl mb-12">
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

    {/* Bento Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[160px] md:auto-rows-[200px]">
      
      {/* Large card: Multi-protocol (spans 2x2) */}
<div className="md:col-span-2 md:row-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden group hover:border-[var(--border-strong)] transition-all flex flex-col">
  <div className="p-6 flex-1 flex flex-col">
    <div className="w-10 h-10 rounded-lg bg-[#2DD4BF]/10 flex items-center justify-center mb-4">
      <Activity className="w-4 h-4 text-[#2DD4BF]" />
    </div>
    <h3 className="text-lg font-semibold mb-2">Multi-protocol monitoring</h3>
    <p className="text-sm text-[var(--text-muted)] mb-4 max-w-md">
      HTTP endpoints, TCP ports, and SSL certificate expiry—all in one unified dashboard.
    </p>
    <div className="flex-1 relative rounded-lg border border-[var(--border)] bg-[var(--surface-2)] overflow-hidden mt-auto min-h-[220px]">
      <Image
        src="/features-protocols.png"
        alt="Monitor creation interface showing HTTP, TCP, and SSL options"
        fill
        className="object-cover object-[center_15%] group-hover:scale-105 transition-transform duration-700"
        sizes="(max-width: 768px) 100vw, 66vw"
        loading="lazy"
      />
    </div>
  </div>
</div>

      {/* Standard icon card: Status pages */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all flex flex-col justify-center">
        <div className="w-10 h-10 rounded-lg bg-[#2563EB]/10 flex items-center justify-center mb-4">
          <Globe className="w-4 h-4 text-[#2563EB]" />
        </div>
        <h3 className="text-sm font-semibold">Public status pages</h3>
        <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
          Share real-time uptime with customers on a branded subdomain. No code required.
        </p>
      </div>

      {/* Standard icon card: Webhooks */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all flex flex-col justify-center">
        <div className="w-10 h-10 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center mb-4">
          <Webhook className="w-4 h-4 text-[#7C3AED]" />
        </div>
        <h3 className="text-sm font-semibold">HMAC-signed webhooks</h3>
        <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
          Cryptographically verified payloads. Your systems know it's really us.
        </p>
      </div>

      {/* Wide card: Incidents (spans 2 cols) */}
      <div className="md:col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden group hover:border-[var(--border-strong)] transition-all">
        <div className="grid grid-cols-1 sm:grid-cols-2 h-full">
          <div className="p-6 flex flex-col justify-center">
            <div className="w-10 h-10 rounded-lg bg-[#EC4899]/10 flex items-center justify-center mb-4">
              <Bell className="w-4 h-4 text-[#EC4899]" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Instant incident detection</h3>
            <p className="text-sm text-[var(--text-muted)]">
              Automatic incident creation on failure, resolution on recovery. Full timeline history with root cause analysis.
            </p>
          </div>
          <div className="relative bg-[var(--surface-2)] border-t sm:border-t-0 sm:border-l border-[var(--border)] min-h-[140px]">
            <Image
              src="/features-incidents.png"
              alt="Incident timeline showing downtime events"
              fill
              className="object-cover object-left group-hover:scale-105 transition-transform duration-700"
              sizes="(max-width: 768px) 100vw, 33vw"
              loading="lazy"
            />
          </div>
        </div>
      </div>

      {/* Tall card: CSV Import (spans 2 rows) */}
      <div className="md:row-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-[var(--border-strong)] transition-all flex flex-col">
        <div className="w-10 h-10 rounded-lg bg-[#10B981]/10 flex items-center justify-center mb-4">
          <Zap className="w-4 h-4 text-[#10B981]" />
        </div>
        <h3 className="text-sm font-semibold mb-2">Bulk CSV import</h3>
        <p className="text-xs text-[var(--text-muted)] mb-6">
          Onboard hundreds of monitors in under a minute. Intelligent parsing with validation.
        </p>
        
        {/* Live stats visualization */}
        <div className="flex-1 flex flex-col justify-end gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">Imported</span>
              <span className="font-mono font-semibold">247 monitors</span>
            </div>
            <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ width: "75%", backgroundColor: "#10B981" }} 
              />
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">Active</span>
              <span className="font-mono font-semibold text-[var(--op-up)]">244 UP</span>
            </div>
            <div className="h-2 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out delay-200"
                style={{ width: "98%", backgroundColor: "var(--op-up)" }} 
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--border)] mt-2">
            <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
              <Check className="w-3 h-3 text-[var(--op-up)]" strokeWidth={3} />
              <span>3 with warnings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Small card: SSL */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-md)] transition-all flex flex-col justify-center">
        <div className="w-10 h-10 rounded-lg bg-[#F59E0B]/10 flex items-center justify-center mb-4">
          <ShieldCheck className="w-4 h-4 text-[#F59E0B]" />
        </div>
        <h3 className="text-sm font-semibold">SSL expiry alerts</h3>
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Get warned 30, 14, and 7 days before certificates expire.
        </p>
      </div>

      {/* Metrics mini-card */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-[var(--border-strong)] transition-all flex flex-col justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Activity className="w-16 h-16" />
        </div>
        <div className="text-3xl font-bold text-[var(--text)] mb-1">99.9%</div>
        <div className="text-xs text-[var(--text-muted)] mb-3">Average uptime</div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--op-up)] font-medium">
          <TrendingUp className="w-3.5 h-3.5" strokeWidth={3} />
          <span>+0.5% this month</span>
        </div>
      </div>

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