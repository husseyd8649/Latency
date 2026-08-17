"use client";

import { ReactNode } from "react";

interface TransitionWrapperProps {
  children: ReactNode;
  isLoading: boolean;
}

export function TransitionWrapper({ children, isLoading }: TransitionWrapperProps) {
  return (
    <div 
      className={`relative transition-all duration-500 ease-out ${
        isLoading 
          ? 'opacity-50 blur-[2px] scale-[0.995] pointer-events-none select-none' 
          : 'opacity-100 blur-0 scale-100 pointer-events-auto'
      }`}
    >
      {/* Top progress bar */}
      {isLoading && (
        <div className="fixed top-0 left-0 right-0 h-1 z-50 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent w-full"
            style={{
              animation: 'shimmer 1.5s infinite',
              backgroundSize: '200% 100%'
            }}
          />
        </div>
      )}
      
      {/* Subtle glow effect */}
      {isLoading && (
        <div className="absolute inset-0 pointer-events-none z-40">
          <div className="absolute inset-0 bg-[var(--accent)]/5 animate-pulse" />
        </div>
      )}

      {children}
    </div>
  );
}