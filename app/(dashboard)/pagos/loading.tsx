export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-48 bg-bg-surface2/50 rounded" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-lg border border-border bg-bg-surface/40" />
        ))}
      </div>
      <div className="h-48 rounded-lg border border-border bg-bg-surface/40" />
      <div className="h-64 rounded-lg border border-border bg-bg-surface/40" />
    </div>
  )
}
