"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/primitives";
import { X } from "lucide-react";
import Link from "next/link";

export function MonitorFilters({ 
  currentSearch = "", 
  currentStatus = "all", 
  currentType = "all" 
}: { 
  currentSearch?: string;
  currentStatus?: string;
  currentType?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    
    params.delete("page");
    router.push(`/dashboard/monitors?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const search = formData.get("search") as string;
    
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    params.delete("page");
    
    router.push(`/dashboard/monitors?${params.toString()}`);
  };

  const hasFilters = currentSearch || currentStatus !== "all" || currentType !== "all";

  return (
    <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 p-4 border border-[var(--border)] rounded-xl bg-[var(--surface)] mb-4">
      <div className="relative flex-1">
        <input
          type="text"
          name="search"
          placeholder="Search by name or target..."
          defaultValue={currentSearch}
          className="w-full h-10 px-4 rounded-md border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none transition-colors"
        />
      </div>

      <div className="flex items-center gap-2">
        <select
          value={currentStatus}
          onChange={(e) => handleFilterChange("status", e.target.value)}
          className="h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="up">Up</option>
          <option value="down">Down</option>
          <option value="paused">Paused</option>
          <option value="pending">Pending</option>
        </select>

        <select
          value={currentType}
          onChange={(e) => handleFilterChange("type", e.target.value)}
          className="h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none transition-colors cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="http">HTTP</option>
          <option value="tcp">TCP</option>
          <option value="ssl">SSL</option>
        </select>

        <button type="submit" className="hidden">Search</button>
        
        {hasFilters && (
          <Link href="/dashboard/monitors">
            <Button type="button" variant="secondary" size="sm" className="h-10">
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          </Link>
        )}
      </div>
    </form>
  );
}