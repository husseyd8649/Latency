"use client";

import { useState } from "react";
import Image from "next/image";

export function OptimizedHeroImage({ 
  src, 
  alt 
}: { 
  src: string; 
  alt: string 
}) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="relative aspect-[16/10] bg-[var(--surface-2)] overflow-hidden rounded-b-xl">
      {/* Skeleton loader */}
      {isLoading && (
        <div className="absolute inset-0">
          <div 
            className="absolute inset-0 animate-pulse"
            style={{
              background: `linear-gradient(
                90deg,
                var(--surface-2) 0%,
                var(--surface) 50%,
                var(--surface-2) 100%
              )`,
              backgroundSize: "200% 100%",
              animation: "shimmer 2s infinite linear"
            }}
          />
          <style jsx>{`
            @keyframes shimmer {
              0% { background-position: 200% 0; }
              100% { background-position: -200% 0; }
            }
          `}</style>
        </div>
      )}
      
      <Image
        src={src}
        alt={alt}
        fill
        className={`object-cover object-top transition-opacity duration-700 ease-out ${
          isLoading ? "opacity-0" : "opacity-100"
        }`}
        priority
        onLoad={() => setIsLoading(false)}
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
    </div>
  );
}