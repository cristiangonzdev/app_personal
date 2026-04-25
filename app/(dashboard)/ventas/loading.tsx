export default function Loading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-32 bg-bg-surface2/50 rounded animate-pulse" />
      <div className="flex gap-3 overflow-x-auto pb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="min-w-[260px] w-[260px] rounded-lg bg-bg-surface/40 border border-border p-3">
            <div className="h-4 w-24 bg-bg-surface2/60 rounded animate-pulse mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="h-20 rounded-md bg-bg-surface/60 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
