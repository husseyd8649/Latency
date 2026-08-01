// app/page.tsx
import Link from "next/link";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Badge } from "@/components/ui/primitives";
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
} from "lucide-react";

export default async function Landing() {
  const session = await auth();

  const features = [
    { icon: Activity, title: "HTTP, TCP, SSL", desc: "One tool for endpoints, ports, and certificate expiry." },
    { icon: Globe, title: "Public status pages", desc: "Share uptime with customers on a free subdomain." },
    { icon: Webhook, title: "HMAC webhooks", desc: "Signed payloads your systems can verify." },
    { icon: Bell, title: "Instant detection", desc: "Automatic incident open on failure, resolve on recovery." },
    { icon: ShieldCheck, title: "SSL expiry alerts", desc: "Get warned before a certificate expires." },
    { icon: Zap, title: "Bulk CSV import", desc: "Onboard hundreds of monitors in under a minute." },
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

  const faqs = [
    {
      q: "How often are checks run?",
      a: "You choose the interval per monitor — from every minute to once a day. Default is five minutes.",
    },
    {
      q: "How do I verify webhook signatures?",
      a: "Every payload is signed with HMAC-SHA256 using your webhook secret. The signature is in the X-Latency-Signature header. See the in-app Architecture page for a Node.js verification snippet.",
    },
    {
      q: "Is there a free tier?",
      a: "Yes. All features are free during the prototype phase. Paid plans will be introduced later.",
    },
    {
      q: "Can I self-host?",
      a: "Yes. The codebase runs anywhere Node.js runs. Deploy to Render, Fly, Railway, or your own server.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[var(--accent)] flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold tracking-tight">Latency</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-xs text-[var(--text-muted)]">
            <a href="#features" className="hover:text-[var(--text)] transition-colors">Features</a>
            <a href="#comparison" className="hover:text-[var(--text)] transition-colors">Compare</a>
            <a href="#pricing" className="hover:text-[var(--text)] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[var(--text)] transition-colors">FAQ</a>
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

      {/* Hero — tight, information-forward, no animation */}
      <section className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="max-w-3xl">
            <Badge variant="neutral" className="mb-5">MVP prototype</Badge>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[var(--text)]">
              Uptime monitoring for teams that ship.
            </h1>
            <p className="mt-4 text-base md:text-lg text-[var(--text-muted)] max-w-2xl">
              HTTP, TCP, and SSL checks. Public status pages. HMAC-signed
              webhooks. Bulk CSV import. Live in under five minutes.
            </p>
            <div className="mt-6 flex items-center gap-3">
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
          </div>

          {/* Product snapshot — static, no animation */}
          <div className="mt-14 rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] bg-[var(--surface-2)]">
              <div className="text-xs font-mono text-[var(--text-muted)]">
                latency.app / dashboard
              </div>
              <Badge variant="up">Operational</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[var(--border)]">
              <Stat label="Monitors" value="500" />
              <Stat label="Uptime (24h)" value="99.92%" />
              <Stat label="Avg. latency" value="184ms" />
              <Stat label="Active incidents" value="2" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Everything you need. Nothing extra.
          </h2>
          <p className="text-[var(--text-muted)] mt-2 max-w-2xl">
            A focused toolkit for teams that value speed and clarity.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-10">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-5 rounded-lg border border-[var(--border)] bg-[var(--surface)]"
                >
                  <div className="w-8 h-8 rounded-md bg-[var(--accent-soft)] flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4 text-[var(--accent)]" />
                  </div>
                  <div className="text-sm font-medium">{f.title}</div>
                  <div className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                    {f.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section id="comparison" className="border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            How Latency compares
          </h2>
          <p className="text-[var(--text-muted)] mt-2">
            Feature parity against a generic uptime monitor.
          </p>

          <div className="mt-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
            <div className="grid grid-cols-3 border-b border-[var(--border)] bg-[var(--surface-2)]">
              <div className="p-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                Feature
              </div>
              <div className="p-3 text-center text-[10px] font-semibold text-[var(--accent)] uppercase tracking-wider">
                Latency
              </div>
              <div className="p-3 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-subtle)]">
                Others
              </div>
            </div>
            {comparison.map((c) => (
              <div
                key={c.feature}
                className="grid grid-cols-3 border-b border-[var(--border)] last:border-0"
              >
                <div className="p-3 text-sm text-[var(--text)]">{c.feature}</div>
                <div className="p-3 flex items-center justify-center">
                  {c.latency ? (
                    <Check className="w-4 h-4 text-[var(--accent)]" strokeWidth={3} />
                  ) : (
                    <Minus className="w-4 h-4 text-[var(--text-subtle)]" />
                  )}
                </div>
                <div className="p-3 flex items-center justify-center">
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

      {/* Pricing */}
      <section id="pricing" className="border-b border-[var(--border)]">
        <div className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Simple pricing
          </h2>
          <p className="text-[var(--text-muted)] mt-2">
            Free during prototype. Paid plans later.
          </p>

          <div className="mt-8 max-w-md">
            <div className="rounded-lg border border-[var(--accent)] bg-[var(--surface)] p-6">
              <div className="text-[10px] uppercase tracking-wider text-[var(--accent)] font-semibold">
                Prototype
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-3xl font-semibold">$0</span>
                <span className="text-sm text-[var(--text-muted)]">/ month</span>
              </div>
              <ul className="mt-5 space-y-2 text-sm">
                {[
                  "Unlimited HTTP / TCP / SSL monitors",
                  "1-minute check intervals",
                  "Unlimited public status pages",
                  "Unlimited HMAC webhooks",
                  "Bulk CSV import (up to 1000 rows)",
                  "Email + password + magic-link auth",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-[var(--accent)] mt-0.5 shrink-0" strokeWidth={3} />
                    <span className="text-[var(--text)]">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href={session ? "/dashboard" : "/signup"} className="block mt-6">
                <Button className="w-full">
                  {session ? "Open dashboard" : "Get started"}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Frequently asked
          </h2>

          <div className="mt-8 space-y-2">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 open:bg-[var(--surface-2)]"
              >
                <summary className="text-sm font-medium text-[var(--text)] cursor-pointer flex items-center justify-between list-none">
                  {f.q}
                  <span className="text-[var(--accent)] group-open:rotate-45 transition-transform">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-[var(--text-muted)] leading-relaxed">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA — no big animated push */}
      <section className="border-b border-[var(--border)]">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Ready to start monitoring?
          </h2>
          <p className="mt-3 text-[var(--text-muted)]">
            Add your first monitor in under a minute. No credit card required.
          </p>
          <Link
            href={session ? "/dashboard" : "/signup"}
            className="inline-block mt-6"
          >
            <Button>
              {session ? "Open dashboard" : "Get started"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6">
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 text-center">
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">
        {label}
      </div>
      <div className="font-mono text-lg mt-1 font-semibold">{value}</div>
    </div>
  );
}
