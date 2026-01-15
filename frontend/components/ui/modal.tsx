import { forwardRef, type HTMLAttributes, type ReactNode, useEffect, useRef, useId, useContext, createContext } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
}

interface ModalContextValue {
  labelId: string;
  descriptionId: string;
}

const ModalContext = createContext<ModalContextValue | null>(null);

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ className, open, onClose, children, 'aria-labelledby': ariaLabelledBy, 'aria-describedby': ariaDescribedBy, ...props }, ref) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);
    const previousOverflowRef = useRef<string>('');
    const generatedId = useId();
    const labelId = ariaLabelledBy || `modal-title-${generatedId}`;
    const descriptionId = ariaDescribedBy || `modal-description-${generatedId}`;

    useEffect(() => {
      if (!open) return;

      // Store previously focused element and body overflow
      previousFocusRef.current = document.activeElement as HTMLElement;
      previousOverflowRef.current = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Focus the modal
      setTimeout(() => {
        modalRef.current?.focus();
      }, 0);

      return () => {
        document.body.style.overflow = previousOverflowRef.current || '';
        previousFocusRef.current?.focus();
      };
    }, [open]);

    useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && open) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, onClose]);

    // Focus trap
    useEffect(() => {
      if (!open) return;

      const modal = modalRef.current;
      if (!modal) return;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      };

      document.addEventListener('keydown', handleTabKey);
      return () => document.removeEventListener('keydown', handleTabKey);
    }, [open]);

    if (!open) return null;

    return (
      <ModalContext.Provider value={{ labelId, descriptionId }}>
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
            onClick={onClose}
            aria-hidden="true"
          />
          <div
            ref={(node) => {
              // Handle both refs
              (modalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
              if (typeof ref === 'function') {
                ref(node);
              } else if (ref) {
                ref.current = node;
              }
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelId}
            aria-describedby={descriptionId}
            aria-live="assertive"
            tabIndex={-1}
            className={cn(
              'relative bg-porcelain rounded-xl shadow-premium-lg',
              'w-full max-w-2xl max-h-[90vh] overflow-y-auto',
              'animate-in fade-in-0 zoom-in-95 duration-200',
              'focus:outline-none',
              className
            )}
            {...props}
          >
            {children}
          </div>
        </div>
      </ModalContext.Provider>
    );
  }
);

Modal.displayName = 'Modal';

const ModalHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('p-10 pb-6', className)}
      {...props}
    />
  )
);

ModalHeader.displayName = 'ModalHeader';

const ModalTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, id, ...props }, ref) => {
    const context = useContext(ModalContext);
    return (
      <h2
        ref={ref}
        id={id || context?.labelId}
        className={cn('font-serif text-3xl font-semibold', className)}
        {...props}
      />
    );
  }
);

ModalTitle.displayName = 'ModalTitle';

const ModalDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, id, ...props }, ref) => {
    const context = useContext(ModalContext);
    return (
      <p
        ref={ref}
        id={id || context?.descriptionId}
        className={cn('mt-2 text-sm text-slate-600', className)}
        {...props}
      />
    );
  }
);

ModalDescription.displayName = 'ModalDescription';

const ModalContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('px-10 pb-6', className)}
      {...props}
    />
  )
);

ModalContent.displayName = 'ModalContent';

const ModalFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center justify-end gap-3 px-10 py-6 border-t border-slate-100', className)}
      {...props}
    />
  )
);

ModalFooter.displayName = 'ModalFooter';

interface ModalCloseProps extends HTMLAttributes<HTMLButtonElement> {
  onClose: () => void;
}

const ModalClose = forwardRef<HTMLButtonElement, ModalCloseProps>(
  ({ className, onClose, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      onClick={onClose}
      className={cn(
        'absolute right-4 top-4 rounded-sm opacity-70 transition-opacity',
        'hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-obsidian/20',
        'disabled:pointer-events-none',
        className
      )}
      {...props}
    >
      <X className="h-5 w-5 text-slate-500" />
      <span className="sr-only">Fechar</span>
    </button>
  )
);

ModalClose.displayName = 'ModalClose';

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalContent,
  ModalFooter,
  ModalClose,
};