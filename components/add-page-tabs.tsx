"use client";

import { useState } from "react";
import { Card, CardBody } from "@/components/ui/primitives";
import { MonitorForm } from "@/components/monitor-form";
import { ImportCsvForm } from "@/components/import-csv-form";
import { cn } from "@/lib/utils";
import { PlusCircle, Upload } from "lucide-react";

type Tab = "single" | "import";

type Region = {
  id: string;
  name: string;
  color: string;
};

export function AddPageTabs({ regions = [] }: { regions?: Region[] }) {
  const [tab, setTab] = useState<Tab>("single");

  return (
    <>
      <div className="flex gap-2 mb-4">
        <TabButton
          active={tab === "single"}
          onClick={() => setTab("single")}
          icon={<PlusCircle className="w-3.5 h-3.5" />}
          label="Single monitor"
        />
        <TabButton
          active={tab === "import"}
          onClick={() => setTab("import")}
          icon={<Upload className="w-3.5 h-3.5" />}
          label="Import CSV"
        />
      </div>
      <Card>
        <CardBody>
          {tab === "single" ? (
            <MonitorForm regions={regions} />
          ) : (
            <ImportCsvForm regions={regions} />          )}
        </CardBody>
      </Card>
    </>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 px-3 h-9 rounded-md text-sm transition-colors",
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)]/30"
          : "bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text)] border border-[var(--border)]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}