export function BlurLoading({ height = "100vh" }: { height?: string }) {
  return (
    <div 
      className="relative animate-pulse"
      style={{ height, minHeight: "400px" }}
    >
      {/* Top progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 z-50 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent w-full"
          style={{
            animation: 'shimmer 1.5s infinite',
            backgroundSize: '200% 100%'
          }}
        />
      </div>

      {/* Subtle blur overlay */}
      <div className="absolute inset-0 backdrop-blur-[1px] bg-[var(--bg)]/50" />
      
      {/* Centered loading indicator */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-[var(--accent)] animate-bounce" style={{ animationDelay: '300ms' }} />
          <span className="text-sm ml-2">Loading...</span>
        </div>
      </div>
    </div>
  );
}