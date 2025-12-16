"use client"

// Skeleton loader for cards
export function SkeletonCard() {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 animate-pulse">
      <div className="w-14 h-14 bg-slate-700 rounded-2xl mb-4" />
      <div className="h-5 bg-slate-700 rounded-lg w-3/4 mb-3" />
      <div className="h-4 bg-slate-700 rounded-lg w-full mb-2" />
      <div className="h-4 bg-slate-700 rounded-lg w-2/3" />
    </div>
  )
}

// Skeleton loader for application rows
export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl animate-pulse">
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-5 bg-slate-700 rounded-lg w-48" />
          <div className="h-5 bg-slate-700 rounded-full w-16" />
        </div>
        <div className="h-4 bg-slate-700 rounded-lg w-32" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-4 bg-slate-700 rounded-lg w-20 hidden sm:block" />
        <div className="h-6 bg-slate-700 rounded-lg w-16" />
      </div>
    </div>
  )
}

// Skeleton loader for the dashboard
export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-6 bg-slate-700 rounded-full w-32 mb-3 animate-pulse" />
        <div className="h-10 bg-slate-700 rounded-lg w-64 mb-2 animate-pulse" />
        <div className="h-5 bg-slate-700 rounded-lg w-48 animate-pulse" />
      </div>

      {/* Cards skeleton */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>

      {/* Applications skeleton */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-700 rounded-xl animate-pulse" />
            <div>
              <div className="h-5 bg-slate-700 rounded-lg w-40 mb-2 animate-pulse" />
              <div className="h-4 bg-slate-700 rounded-lg w-32 animate-pulse" />
            </div>
          </div>
        </div>
        <div className="p-6 space-y-3">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    </div>
  )
}

// General skeleton text
export function SkeletonText({ width = "w-full" }: { width?: string }) {
  return <div className={`h-4 bg-slate-700 rounded-lg ${width} animate-pulse`} />
}

// Skeleton circle (for avatars)
export function SkeletonCircle({ size = "w-10 h-10" }: { size?: string }) {
  return <div className={`${size} bg-slate-700 rounded-full animate-pulse`} />
}
