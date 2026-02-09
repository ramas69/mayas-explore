import { Skeleton } from './skeleton';

export function ParentDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-48 bg-amber-500/10 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40 bg-amber-500/10 rounded-xl" />
          <Skeleton className="h-10 w-32 bg-amber-500/10 rounded-xl" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-6 rounded-xl border border-amber-500/20 bg-slate-900/50"
          >
            <div className="flex items-center gap-3 mb-3">
              <Skeleton className="w-10 h-10 rounded-lg bg-amber-500/10" />
              <Skeleton className="h-4 w-24 bg-amber-500/10 rounded" />
            </div>
            <Skeleton className="h-8 w-16 mb-2 bg-amber-500/10 rounded" />
            <Skeleton className="h-3 w-full bg-amber-500/10 rounded" />
            <Skeleton className="h-2 w-full mt-3 bg-amber-500/10 rounded-full" />
          </div>
        ))}
      </div>

      {/* Bulletin section */}
      <div className="p-6 rounded-2xl border border-amber-500/20 bg-slate-900/30">
        <Skeleton className="h-6 w-40 mb-4 bg-amber-500/10 rounded" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton
              key={i}
              className="h-9 w-28 bg-amber-500/10 rounded-full"
            />
          ))}
        </div>
      </div>

      {/* Progress section */}
      <div className="p-6 rounded-xl border border-amber-500/20 bg-slate-900/30">
        <Skeleton className="h-6 w-48 mb-4 bg-amber-500/10 rounded" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <div className="flex justify-between mb-1">
                <Skeleton className="h-4 w-24 bg-amber-500/10 rounded" />
                <Skeleton className="h-4 w-12 bg-amber-500/10 rounded" />
              </div>
              <Skeleton className="h-2 w-full bg-amber-500/10 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Activity section */}
      <div className="p-6 rounded-xl border border-amber-500/20 bg-slate-900/30">
        <Skeleton className="h-6 w-36 mb-4 bg-amber-500/10 rounded" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex justify-between p-3 rounded-lg bg-slate-900/50"
            >
              <div>
                <Skeleton className="h-4 w-24 mb-2 bg-amber-500/10 rounded" />
                <Skeleton className="h-3 w-20 bg-amber-500/10 rounded" />
              </div>
              <Skeleton className="h-4 w-12 bg-amber-500/10 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
