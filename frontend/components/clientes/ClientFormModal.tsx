import { useEffect, useState } from 'react';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { User, Mail, Check, X, Trash2, AlertTriangle } from 'lucide-react';
import { Modal, ModalHeader, ModalTitle, ModalContent, ModalFooter, ModalClose } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';
import formatPhoneInput, { sanitizePhone } from '@/lib/utils/formatPhoneInput';
import { createClienteSchema, CreateClienteForm } from '@/lib/schemas/lead.schema';
import type { Cliente } from '@/lib/types';
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

interface ClientFormModalProps {
    open: boolean;
    onClose: () => void;
    onSave: (data: CreateClienteForm) => Promise<void>;
    onDelete?: () => Promise<void>;
    initialData?: Cliente | null;
    isLoading?: boolean;
}

export function ClientFormModal({
    open,
    onClose,
    onSave,
    onDelete,
    initialData,
    isLoading
}: ClientFormModalProps) {
    const t = useTranslations('clientes');
    const tCommon = useTranslations('common');
    const [useSamePhoneForWhatsapp, setUseSamePhoneForWhatsapp] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        watch,
        setValue,
        control,
        formState: { errors, isDirty },
    } = useForm<CreateClienteForm>({
        resolver: zodResolver(createClienteSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            whatsapp: '',
            message: '',
            marketingOptIn: false,
        },
    });

    const { field: phoneField } = useController({ name: 'phone', control, defaultValue: '' });
    const { field: whatsappField } = useController({ name: 'whatsapp', control, defaultValue: '' });

    const phoneValue = watch('phone');

    // Reset form when modal opens or initialData changes
    useEffect(() => {
        if (open) {
            if (initialData) {
                reset({
                    name: initialData.name,
                    email: initialData.email || '',
                    phone: initialData.phone ? formatPhoneInput(initialData.phone) : '',
                    whatsapp: initialData.whatsapp ? formatPhoneInput(initialData.whatsapp) : '',
                    message: initialData.message || '',
                    marketingOptIn: initialData.marketingOptIn,
                });

                // Check if phone and whatsapp are the same
                if (initialData.phone && initialData.whatsapp &&
                    initialData.phone === initialData.whatsapp) {
                    setUseSamePhoneForWhatsapp(true);
                } else {
                    setUseSamePhoneForWhatsapp(false);
                }
            } else {
                reset({
                    name: '',
                    email: '',
                    phone: '',
                    whatsapp: '',
                    message: '',
                    marketingOptIn: false,
                });
                setUseSamePhoneForWhatsapp(false);
            }
        }
    }, [open, initialData, reset]);

    // Sync whatsapp with phone
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

    const isEditMode = !!initialData;

    return (
        <>
            <Modal open={open} onClose={handleClose}>
                <ModalClose onClose={handleClose} />
                <ModalHeader>
                    <ModalTitle>
                        {isEditMode ? t('editClienteTitle') || 'Editar Cliente' : t('addClienteTitle')}
                    </ModalTitle>
                </ModalHeader>

                <form onSubmit={handleSubmit(onSave)} className="flex flex-col h-full">
                    <ModalContent className="space-y-5">
                        {/* Name */}
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-2">
                                {t('name')} <span className="text-[#C2410C]">*</span>
                            </label>
                            <input
                                {...register('name')}
                                placeholder={t('namePlaceholder')}
                                className={cn(
                                    'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                                    errors.name ? 'border-rose-500' : 'border-slate-200'
                                )}
                            />
                            {errors.name && <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-2">
                                {tCommon('email')}
                            </label>
                            <input
                                {...register('email')}
                                type="email"
                                placeholder={t('emailPlaceholder')}
                                className={cn(
                                    'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                                    errors.email ? 'border-rose-500' : 'border-slate-200'
                                )}
                            />
                            {errors.email && <p className="mt-1 text-xs text-rose-500">{errors.email.message}</p>}
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-2">
                                {t('phonePlaceholder')}
                            </label>
                            <input
                                value={phoneField.value}
                                onChange={(e) => phoneField.onChange(formatPhoneInput(e.target.value))}
                                placeholder="(11) 98765-4321"
                                className={cn(
                                    'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                                    errors.phone ? 'border-rose-500' : 'border-slate-200'
                                )}
                            />
                            <p className="mt-1 text-xs text-slate-400">{t('contactHelperText')}</p>
                            {errors.phone && <p className="mt-1 text-xs text-rose-500">{errors.phone.message}</p>}
                        </div>

                        {/* WhatsApp */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-xs font-medium text-slate-600">
                                    WhatsApp
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useSamePhoneForWhatsapp}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setUseSamePhoneForWhatsapp(checked);
                                            if (checked && phoneField.value) {
                                                setValue('whatsapp', phoneField.value, { shouldDirty: true });
                                            }
                                        }}
                                        className="h-3.5 w-3.5 rounded border-slate-300 text-[#C2410C] focus:ring-[#C2410C]"
                                    />
                                    <span className="text-xs text-slate-500">{t('useSamePhone')}</span>
                                </label>
                            </div>
                            <input
                                value={whatsappField.value}
                                onChange={(e) => whatsappField.onChange(formatPhoneInput(e.target.value))}
                                placeholder="(11) 98765-4321"
                                disabled={useSamePhoneForWhatsapp}
                                className={cn(
                                    'w-full px-3 py-2.5 border outline-none text-sm transition-colors',
                                    useSamePhoneForWhatsapp
                                        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                                        : 'bg-slate-50 focus:border-[#C2410C] focus:bg-white',
                                    errors.whatsapp ? 'border-rose-500' : 'border-slate-200'
                                )}
                            />
                            {errors.whatsapp && <p className="mt-1 text-xs text-rose-500">{errors.whatsapp.message}</p>}
                        </div>

                        {/* Message */}
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-2">
                                {t('noteOptional')}
                            </label>
                            <textarea
                                {...register('message')}
                                placeholder={t('notePlaceholder')}
                                rows={3}
                                className={cn(
                                    'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors resize-none',
                                    errors.message ? 'border-rose-500' : 'border-slate-200'
                                )}
                            />
                            {errors.message && <p className="mt-1 text-xs text-rose-500">{errors.message.message}</p>}
                        </div>

                        {/* Marketing Opt-in */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-400" />
                                <div>
                                    <p className="text-sm font-medium">{t('marketingOptInLabel')}</p>
                                    <p className="text-xs text-slate-400">{t('marketingOptInDescription')}</p>
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                {...register('marketingOptIn')}
                                className="h-4 w-4 rounded border-slate-300 text-[#C2410C] focus:ring-[#C2410C]"
                            />
                        </div>
                    </ModalContent>

                    <ModalFooter className="flex items-center justify-between gap-3">
                        <div className="flex gap-2">
                            {isEditMode && onDelete && (
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-sm transition-colors"
                                    title={tCommon('delete')}
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="text-slate-500 hover:text-[#121212] text-sm font-medium transition-colors"
                            >
                                {tCommon('cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading || !isDirty}
                                className={cn(
                                    'flex items-center gap-1.5 px-5 py-2.5 text-white text-sm font-medium transition-all',
                                    isLoading || !isDirty ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#C2410C] hover:bg-[#a03609]'
                                )}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        {tCommon('saving')}
                                    </>
                                ) : (
                                    <>
                                        <User className="w-4 h-4" />
                                        {tCommon('save')}
                                    </>
                                )}
                            </button>
                        </div>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{tCommon('confirmDeleteTitle') || 'Confirmar exclusão'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {tCommon('confirmDeleteDescription') || 'Tem certeza que deseja excluir este item? Esta ação não pode ser desfeita.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>{tCommon('cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                if (onDelete) {
                                    onDelete().then(() => setShowDeleteConfirm(false));
                                }
                            }}
                            className="bg-rose-600 hover:bg-rose-700 focus:ring-rose-600"
                            disabled={isLoading}
                        >
                            {isLoading ? tCommon('deleting') : tCommon('delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Discard Changes Confirmation */}
            <AlertDialog open={showDiscardConfirm} onOpenChange={setShowDiscardConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('discardChangesTitle') || 'Descartar alterações?'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('discardChangesDescription') || 'Existem alterações não salvas. Deseja realmente descartá-las?'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                setShowDiscardConfirm(false);
                                onClose();
                            }}
                            className="bg-slate-800 hover:bg-slate-900"
                        >
                            {tCommon('discard') || 'Descartar'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
