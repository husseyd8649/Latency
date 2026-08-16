"use client";

import { useState } from "react";
import { Copy, CheckCircle } from "lucide-react";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <button 
      onClick={copy}
      className="px-3 py-2 bg-[var(--surface-2)] hover:bg-[var(--surface)] border border-[var(--border)] rounded-md text-[var(--text)] transition-colors flex items-center gap-2 shrink-0"
      type="button"
    >
      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}