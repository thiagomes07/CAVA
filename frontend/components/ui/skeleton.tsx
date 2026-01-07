import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return (
    <div
      className={cn(
        'animate-pulse motion-reduce:animate-none rounded-sm bg-slate-200/50',
        className
      )}
      role="status"
      aria-busy="true"
      aria-live="polite"
      {...props}
    />
  );
};

Skeleton.displayName = 'Skeleton';

const SkeletonCard = ({ className }: { className?: string }) => {
  return (
    <div className={cn('bg-porcelain border border-slate-100 rounded-sm p-8', className)}>
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
};

SkeletonCard.displayName = 'SkeletonCard';

const SkeletonTable = ({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) => {
  return (
    <div className="w-full">
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
};

SkeletonTable.displayName = 'SkeletonTable';

const SkeletonImage = ({ className }: { className?: string }) => {
  return (
    <Skeleton className={cn('aspect-[4/3] w-full', className)} />
  );
};

SkeletonImage.displayName = 'SkeletonImage';

export { Skeleton, SkeletonCard, SkeletonTable, SkeletonImage };