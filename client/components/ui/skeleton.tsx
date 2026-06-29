import { cn } from '@/lib/utils';

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('skeleton rounded-lg', className)} {...props} />;
}

export function IssueCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          
          <Skeleton className="h-5 w-3/4 mb-1" />
          
          {!compact && (
            <div className="mt-1 space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
          )}
          
          <div className="flex items-center gap-4 mt-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="w-5 h-5 mt-2 rounded-full" />
      </div>
      
      {!compact && (
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      )}
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass-card p-4">
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  );
}
