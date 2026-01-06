import { forwardRef, type LabelHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  error?: boolean;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, error, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'block uppercase tracking-widest text-[10px] font-semibold mb-2',
        error ? 'text-rose-600' : 'text-slate-500',
        className
      )}
      {...props}
    />
  )
);

Label.displayName = 'Label';

export { Label };