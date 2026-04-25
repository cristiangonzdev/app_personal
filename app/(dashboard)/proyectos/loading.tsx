export default function Loading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-32 bg-bg-surface2/50 rounded" />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 rounded-lg border border-border bg-bg-surface/40" />
        ))}
      </div>
    </div>
  )
}
