import { useEffect, useState } from 'react';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { User, Mail, Phone, AlertTriangle, Shield, UserPlus } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, ModalClose } from '@/components/ui/modal';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils/cn';
import { sanitizePhone } from '@/lib/utils/formatPhoneInput';
import { PhoneInput } from '@/components/ui/masked-input';
import { inviteSellerSchema, InviteSellerInput } from '@/lib/schemas/auth.schema';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TeamMemberInviteModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: InviteSellerInput) => Promise<void>;
    isLoading?: boolean;
}

export function TeamMemberInviteModal({
    open,
    onClose,
    onSave,
    isLoading
}: TeamMemberInviteModalProps) {
    const t = useTranslations('team');
    const tCommon = useTranslations('common');
    const [useSamePhoneForWhatsapp, setUseSamePhoneForWhatsapp] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        control,
        formState: { errors, isDirty },
    } = useForm<InviteSellerInput>({
        resolver: zodResolver(inviteSellerSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            whatsapp: '',
            isAdmin: false,
        },
    });

    const { field: phoneField } = useController({ name: 'phone', control, defaultValue: '' });
    const { field: whatsappField } = useController({ name: 'whatsapp', control, defaultValue: '' });

    const phoneValue = watch('phone');

    // Reset form when modal opens
    useEffect(() => {
        if (open) {
            reset({
                name: '',
                email: '',
                phone: '',
                whatsapp: '',
                isAdmin: false,
            });
            setUseSamePhoneForWhatsapp(false);
        }
    }, [open, reset]);

    // Sync whatsapp with phone when checkbox is checked
    useEffect(() => {
        if (useSamePhoneForWhatsapp && phoneValue) {
            setValue('whatsapp', phoneValue, { shouldDirty: true });
        }
    }, [useSamePhoneForWhatsapp, phoneValue, setValue]);

    const handleClose = () => {
        if (isDirty) {
            setShowDiscardConfirm(true);
        } else {
            onClose();
        }
    };

    const handleConfirmDiscard = () => {
        setShowDiscardConfirm(false);
        setUseSamePhoneForWhatsapp(false);
        reset();
        onClose();
    };

    const handleWhatsappChange = (value: string) => {
        if (!useSamePhoneForWhatsapp) {
            whatsappField.onChange(value);
        }
    };

    const handleFormSubmit = async (data: InviteSellerInput) => {
        try {
            // Sanitize phone numbers before submitting
            const sanitizedData: InviteSellerInput = {
                ...data,
                phone: data.phone ? sanitizePhone(data.phone) : undefined,
                whatsapp: data.whatsapp ? sanitizePhone(data.whatsapp) : undefined,
            };

            await onSave(sanitizedData);
            reset();
        } catch (error) {
            console.error('Error inviting team member:', error);
        }
    };

    return (
        <>
            <Modal open={open} onClose={handleClose}>
                <ModalClose onClose={handleClose} />
                <ModalHeader>
                    <ModalTitle>
                        {t('addSellerTitle')}
                    </ModalTitle>
                </ModalHeader>

                <form onSubmit={handleSubmit(handleFormSubmit)}>
                    <ModalContent>
                        <div className="space-y-6">
                            {/* Nome */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="name"
                                    className="text-sm font-medium text-slate-700 flex items-center gap-2"
                                >
                                    <User className="h-4 w-4" />
                                    {tCommon('name')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    {...register('name')}
                                    id="name"
                                    type="text"
                                    className={cn(
                                        "w-full px-4 py-2.5 rounded-lg border transition-colors",
                                        errors.name
                                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                            : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                    )}
                                    placeholder={tCommon('namePlaceholder')}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-600">{errors.name.message}</p>
                                )}
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="email"
                                    className="text-sm font-medium text-slate-700 flex items-center gap-2"
                                >
                                    <Mail className="h-4 w-4" />
                                    {tCommon('email')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    {...register('email')}
                                    id="email"
                                    type="email"
                                    className={cn(
                                        "w-full px-4 py-2.5 rounded-lg border transition-colors",
                                        errors.email
                                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                            : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                    )}
                                    placeholder={tCommon('emailPlaceholder')}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-600">{errors.email.message}</p>
                                )}
                            </div>

                            {/* Telefone */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="phone"
                                    className="text-sm font-medium text-slate-700 flex items-center gap-2"
                                >
                                    <Phone className="h-4 w-4" />
                                    {tCommon('phone')}
                                </label>
                                <PhoneInput
                                    id="phone"
                                    value={phoneField.value || ''}
                                    onChange={(value) => phoneField.onChange(value)}
                                    className={cn(
                                        "w-full px-4 py-2.5 rounded-lg border transition-colors",
                                        errors.phone
                                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                            : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                    )}
                                    placeholder="(11) 91234-5678"
                                />
                                {errors.phone && (
                                    <p className="text-sm text-red-600">{errors.phone.message}</p>
                                )}
                            </div>

                            {/* WhatsApp */}
                            <div className="space-y-2">
                                <label
                                    htmlFor="whatsapp"
                                    className="text-sm font-medium text-slate-700 flex items-center gap-2"
                                >
                                    <Phone className="h-4 w-4" />
                                    WhatsApp
                                </label>
                                <PhoneInput
                                    id="whatsapp"
                                    onChange={handleWhatsappChange}
                                    value={whatsappField.value || ''}
                                    disabled={useSamePhoneForWhatsapp}
                                    className={cn(
                                        "w-full px-4 py-2.5 rounded-lg border transition-colors",
                                        useSamePhoneForWhatsapp && "bg-slate-50 cursor-not-allowed",
                                        errors.whatsapp
                                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                                            : "border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                    )}
                                    placeholder="(11) 91234-5678"
                                />
                                {errors.whatsapp && (
                                    <p className="text-sm text-red-600">{errors.whatsapp.message}</p>
                                )}

                                {/* Checkbox para usar mesmo telefone */}
                                <div className="flex items-center space-x-2 mt-2">
                                    <Checkbox
                                        id="samePhone"
                                        checked={useSamePhoneForWhatsapp}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            setUseSamePhoneForWhatsapp(e.target.checked);
                                            if (e.target.checked && phoneValue) {
                                                setValue('whatsapp', phoneValue, { shouldDirty: true });
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor="samePhone"
                                        className="text-sm text-slate-600 cursor-pointer select-none"
                                    >
                                        {tCommon('useSamePhoneForWhatsapp')}
                                    </label>
                                </div>
                            </div>

                            {/* Admin Checkbox */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        {...register('isAdmin')}
                                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#C2410C] focus:ring-[#C2410C]"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-amber-600" />
                                            {t('isAdmin')}
                                        </span>
                                        <span className="text-xs text-slate-400 mt-0.5">
                                            {t('isAdminDescription')}
                                        </span>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </ModalContent>

                    <ModalFooter>
                        <div className="flex items-center justify-end w-full gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                disabled={isLoading}
                                className="text-slate-500 hover:text-[#121212] text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {tCommon('cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={!isDirty || isLoading}
                                className={cn(
                                    'flex items-center gap-1.5 px-5 py-2.5 text-white text-sm font-medium transition-all',
                                    !isDirty || isLoading ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#C2410C] hover:bg-[#a03609]'
                                )}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        {tCommon('sending')}
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="w-4 h-4" />
                                        {t('createAccess')}
                                    </>
                                )}
                            </button>
                        </div>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Confirmation dialog for discarding changes */}
            <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm} onClose={() => setShowDiscardConfirm(false)}>
                <AlertDialogContent className="w-full max-w-md p-6 mx-auto">
                    <AlertDialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-amber-100 flex-shrink-0 flex items-center justify-center">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                                <AlertDialogTitle className="text-lg font-bold text-slate-800">Descartar alterações?</AlertDialogTitle>
                                <AlertDialogDescription className="text-sm text-slate-600 mt-1 leading-relaxed">
                                    Existem alterações não salvas. Deseja realmente descartá-las?
                                </AlertDialogDescription>
                            </div>
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="pt-4 flex justify-center gap-3">
                        <AlertDialogCancel className="h-8 px-4 text-sm rounded border border-slate-200">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDiscard} className="bg-amber-600 hover:bg-amber-700 h-8 px-4 text-sm rounded">
                            Descartar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
