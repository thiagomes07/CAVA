import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

interface LoadingStateProps {
  variant?: 'cards' | 'table' | 'form' | 'dashboard';
  rows?: number;
  columns?: number;
  className?: string;
}

export function LoadingState({
  variant = 'cards',
  rows = 5,
  columns = 4,
  className,
}: LoadingStateProps) {
  if (variant === 'cards') {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="bg-porcelain border border-slate-100 rounded-sm p-6">
            <Skeleton className="aspect-[4/3] w-full mb-4" />
            <Skeleton className="h-6 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div className={cn('w-full', className)}>
        <div className="bg-mineral border-b-2 border-slate-200 p-4 flex gap-6">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-24" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="border-b border-slate-100 p-4 flex gap-6">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-32" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'form') {
    return (
      <div className={cn('space-y-6 max-w-2xl', className)}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-12 w-full" />
          </div>
        ))}
        <div className="flex justify-end gap-3 pt-6">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <div className={cn('space-y-8', className)}>
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-porcelain border border-slate-100 rounded-sm p-8">
              <Skeleton className="h-12 w-24 mb-4" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-40" />
          ))}
        </div>

        {/* Table */}
        <div>
          <Skeleton className="h-6 w-48 mb-4" />
          <LoadingState variant="table" rows={5} columns={5} />
        </div>
      </div>
    );
  }

  return null;
}

export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center min-h-[400px]', className)}>
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-obsidian" />
    </div>
  );
}

export function LoadingOverlay() {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-porcelain rounded-xl p-8 shadow-premium-lg">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-obsidian" />
      </div>
    </div>
  );
}