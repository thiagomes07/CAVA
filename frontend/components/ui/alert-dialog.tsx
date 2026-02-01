import * as React from "react"
import { Modal, ModalContent, ModalHeader, ModalFooter, ModalTitle, ModalDescription, type ModalProps } from "@/components/ui/modal"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils/cn"

const AlertDialogContext = React.createContext<{
    cancel: () => void
} | null>(null)

interface AlertDialogProps extends ModalProps {
    onOpenChange?: (open: boolean) => void
}

const AlertDialog = React.forwardRef<HTMLDivElement, AlertDialogProps>(
    ({ open, onOpenChange, children, onClose, ...props }, ref) => {
        const cancel = () => {
            if (onOpenChange) {
                onOpenChange(false)
            }
            if (onClose) {
                onClose()
            }
        }

        return (
            <AlertDialogContext.Provider value={{ cancel }}>
                <Modal open={open} onClose={cancel} {...props} ref={ref}>
                    {children}
                </Modal>
            </AlertDialogContext.Provider>
        )
    }
)
AlertDialog.displayName = "AlertDialog"

const AlertDialogContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <ModalContent ref={ref} className={cn("", className)} {...props} />
))
AlertDialogContent.displayName = "AlertDialogContent"

const AlertDialogHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <ModalHeader ref={ref} className={cn("sm:text-left", className)} {...props} />
))
AlertDialogHeader.displayName = "AlertDialogHeader"

const AlertDialogFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <ModalFooter
        ref={ref}
        className={cn("sm:flex-col-reverse sm:space-x-0 border-t-0 pt-2", className)}
        {...props}
    />
))
AlertDialogFooter.displayName = "AlertDialogFooter"

const AlertDialogTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <ModalTitle ref={ref} className={cn("text-lg", className)} {...props} />
))
AlertDialogTitle.displayName = "AlertDialogTitle"

const AlertDialogDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <ModalDescription
        ref={ref}
        className={cn("text-sm text-slate-500", className)}
        {...props}
    />
))
AlertDialogDescription.displayName = "AlertDialogDescription"

const AlertDialogAction = React.forwardRef<
    HTMLButtonElement,
    React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => (
    <Button ref={ref} className={cn(className)} {...props} />
))
AlertDialogAction.displayName = "AlertDialogAction"

const AlertDialogCancel = React.forwardRef<
    HTMLButtonElement,
    React.HTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
    const context = React.useContext(AlertDialogContext)

    return (
        <Button
            variant="secondary"
            className={cn("mt-2 sm:mt-0", className)}
            onClick={(e) => {
                context?.cancel()
                props.onClick?.(e as any)
            }}
            ref={ref}
            {...props}
        />
    )
})
AlertDialogCancel.displayName = "AlertDialogCancel"

export {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
}
