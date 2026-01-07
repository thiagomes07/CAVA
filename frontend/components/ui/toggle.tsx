import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';

export interface ToggleProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  ({ className, label, id, ...props }, ref) => {
    const toggleId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex items-center">
        <button
          type="button"
          role="switch"
          aria-checked={props.checked}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            props.checked ? 'bg-obsidian' : 'bg-slate-200 hover:bg-slate-300',
            className
          )}
          onClick={() => {
            const syntheticEvent = {
              target: { checked: !props.checked },
              currentTarget: { checked: !props.checked },
            } as React.ChangeEvent<HTMLInputElement>;
            props.onChange?.(syntheticEvent);
          }}
          disabled={props.disabled}
        >
          <span className="sr-only">{label || 'Toggle'}</span>
          <span
            className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200',
              props.checked ? 'translate-x-6' : 'translate-x-1'
            )}
          />
        </button>
        <input
          ref={ref}
          id={toggleId}
          type="checkbox"
          className="sr-only"
          {...props}
        />
        {label && (
          <label
            htmlFor={toggleId}
            className="ml-3 text-sm text-slate-600 cursor-pointer"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Toggle.displayName = 'Toggle';

export { Toggle };