// components/ui/primitives.tsx
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

/* ------------------------------ Card ------------------------------------- */

export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-colors",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 border-b border-[var(--border)]", className)}>{children}</div>;
}

export function CardBody({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)}>{children}</div>;
}

/* ------------------------------ Button ----------------------------------- */

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", ...rest },
  ref
) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none";
  const sizes: Record<string, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-9 px-4 text-sm",
  };
  const variants: Record<string, string> = {
    primary:
       "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[var(--shadow-sm)]",
    secondary:
      "bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] border border-[var(--border)]",
    ghost:
      "bg-transparent text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]",
    danger:
      "bg-[var(--op-down)] text-white hover:opacity-90",
  };

  return (
    <button
      ref={ref}
      className={cn(base, sizes[size], variants[variant], className)}
      {...rest}
    />
  );
});

/* ------------------------------ Badge ------------------------------------ */

type BadgeVariant = "up" | "down" | "degraded" | "neutral" | "accent";

export function Badge({
  variant = "neutral",
  children,
  className,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}) {
  const styles: Record<BadgeVariant, string> = {
    up: "bg-[var(--up-soft)] text-[var(--op-up)] border-[var(--op-up)]/25",
    down: "bg-[var(--down-soft)] text-[var(--op-down)] border-[var(--op-down)]/25",
    degraded:
      "bg-[var(--degraded-soft)] text-[var(--op-degraded)] border-[var(--op-degraded)]/25",
    neutral:
      "bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]",
    accent:
      "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]/25",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-medium",
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ------------------------------ StatusDot -------------------------------- */

export function StatusDot({ variant = "up" }: { variant?: "up" | "down" | "degraded" | "neutral" }) {
  const colorMap: Record<string, string> = {
    up: "bg-[var(--op-up)]",
    down: "bg-[var(--op-down)]",
    degraded: "bg-[var(--op-degraded)]",
    neutral: "bg-[var(--text-subtle)]",
  };
  return (
    <span className="relative inline-flex w-2 h-2">
      <span className={cn("absolute inset-0 rounded-full animate-pulse-dot", colorMap[variant])} />
      <span className={cn("relative inline-flex w-2 h-2 rounded-full", colorMap[variant])} />
    </span>
  );
}

/* ------------------------------ PageHeader ------------------------------- */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-8 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h1>
        {description && (
          <p className="text-sm text-[var(--text-muted)] mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}