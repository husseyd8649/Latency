"use client";

import { useState, useEffect } from "react";

export function GlobalBlurProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      
      if (link?.href?.startsWith(window.location.origin)) {
        if (!link.hash && !link.hasAttribute("download")) {
          setIsLoading(true);
          // Auto-reset after 500ms (most navigations complete by then)
          setTimeout(() => setIsLoading(false), 500);
        }
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <div 
      className={`transition-opacity duration-200 ${
        isLoading ? 'opacity-70 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Simple top line - no animation */}
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-[var(--accent)] z-50" />
      )}
      {children}
    </div>
  );
}