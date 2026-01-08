import { type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center min-h-[400px] py-12 px-6',
        className
      )}
      role="status"
      aria-label={title}
    >
      <Icon className="w-12 h-12 text-slate-300 mb-6" strokeWidth={1.5} />
      
      <h3 
        className="font-serif text-2xl text-slate-400 mb-2 text-center"
        title={title}
      >
        {truncateText(title, TRUNCATION_LIMITS.PAGE_TITLE)}
      </h3>
      
      <p 
        className="text-sm text-slate-400 max-w-md text-center mb-6"
        title={description}
      >
        {truncateText(description, TRUNCATION_LIMITS.DESCRIPTION_SHORT)}
      </p>
      
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="primary">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}