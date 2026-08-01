// components/copy-url-button.tsx
"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyUrlButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this URL:", url);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="p-2 rounded-md text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors"
      title="Copy URL"
    >
      {copied ? <Check className="w-4 h-4 text-[var(--op-up)]" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}