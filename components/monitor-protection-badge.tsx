import { Shield } from "lucide-react";

export function MonitorProtectionBadge({ isProtected }: { isProtected: boolean }) {
  if (!isProtected) return null;
  
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
      title="Protected from deletion and bulk operations"
    >
      <Shield className="w-3 h-3" />
      Protected
    </span>
  );
}