// app/page.tsx
import Link from "next/link";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Badge, StatusDot } from "@/components/ui/primitives";
import { Activity, ArrowRight, Bell, Globe, ShieldCheck, Webhook, Zap } from "lucide-react";

export default async function Landing() {
  const session = await auth();

  const features = [
    { icon: Activity, title: "HTTP, TCP, SSL", desc: "One tool for endpoints, ports, and certificate expiry." },
    { icon: Globe, title: "Public status pages", desc: "Share uptime with customers on a free subdomain." },
    { icon: Webhook, title: "HMAC webhooks", desc: "Signed payloads your systems can verify." },
    { icon: Bell, title: "Instant alerts", desc: "Email you the moment a monitor changes state." },
    { icon: ShieldCheck, title: "SSL expiry alerts", desc: "Never get caught by an expired certificate again." },
    { icon: Zap, title: "5-minute setup", desc: "Add a URL, we start monitoring instantly." },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b border-[var(--border)] bg-[var(--surface)]/70 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[var(--accent)] to-[var(--accent-hover)] flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-sm font-semibold tracking-tight">Latency</span>
          </Link>
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
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)] mb-6 animate-fade-up">
            <StatusDot variant="up" />
            All systems operational
          </div>

          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight text-[var(--text)] animate-fade-up" style={{ animationDelay: "60ms" } as React.CSSProperties}>
            Uptime monitoring,{" "}
            <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-hover)] bg-clip-text text-transparent">
              built for builders.
            </span>
          </h1>

          <p className="mt-5 text-lg text-[var(--text-muted)] max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: "120ms" } as React.CSSProperties}>
            HTTP, TCP and SSL checks. Public status pages. HMAC-signed webhooks.
            Get your first monitor live in under five minutes.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3 animate-fade-up" style={{ animationDelay: "180ms" } as React.CSSProperties}>
                        <Link href={session ? "/dashboard" : "/signup"}>
              <Button>
                {session ? "Open dashboard" : "Start monitoring"}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="secondary">See features</Button>
            </Link>
          </div>

          {/* Fake monitor preview */}
          <div className="mt-16 max-w-3xl mx-auto animate-fade-up" style={{ animationDelay: "240ms" } as React.CSSProperties}>
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <StatusDot variant="up" />
                  <span className="text-xs font-mono text-[var(--text-muted)]">
                    api.example.com
                  </span>
                </div>
                <Badge variant="up">Operational</Badge>
              </div>
              <div className="relative h-32 grid-bg overflow-hidden">
                <div className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-[var(--accent-soft)] to-transparent animate-scan" />
              </div>
              <div className="grid grid-cols-3 divide-x divide-[var(--border)] border-t border-[var(--border)] text-center">
                <div className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">Uptime</div>
                  <div className="font-mono text-sm mt-1">99.98%</div>
                </div>
                <div className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">P50</div>
                  <div className="font-mono text-sm mt-1">124ms</div>
                </div>
                <div className="p-3">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)]">Checks</div>
                  <div className="font-mono text-sm mt-1">2,880</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-[var(--border)] bg-[var(--surface)]">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-center">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <p className="text-[var(--text-muted)] text-center mt-3">
            A focused toolkit for teams that ship.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-12">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="p-5 rounded-xl border border-[var(--border)] bg-[var(--bg)] hover:border-[var(--border-strong)] hover:-translate-y-0.5 transition-all"
                >
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] flex items-center justify-center mb-3">
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

      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between text-xs text-[var(--text-subtle)]">
          <div>© {new Date().getFullYear()} Latency</div>
          <div>Built as an MVP prototype.</div>
        </div>
      </footer>
    </div>
  );
}