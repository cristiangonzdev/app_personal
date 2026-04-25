export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-32 bg-bg-surface2/50 rounded" />
      <div className="rounded-lg border border-border bg-bg-surface/40 overflow-hidden">
        <div className="h-9 bg-bg-surface2/40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-12 border-t border-border/40" />
        ))}
      </div>
    </div>
  )
}
