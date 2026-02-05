import { useEffect, useState } from "react";
import { useForm, useController } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { User, Phone, AlertTriangle } from "lucide-react";
import {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalContent,
  ModalFooter,
  ModalClose,
} from "@/components/ui/modal";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils/cn";
import formatPhoneInput, { sanitizePhone } from "@/lib/utils/formatPhoneInput";
import {
  updateBrokerSchema,
  UpdateBrokerInput,
} from "@/lib/schemas/auth.schema";
import type { BrokerWithStats } from "@/lib/types";
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

interface BrokerFormModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: UpdateBrokerInput) => Promise<void>;
  initialData?: BrokerWithStats | null;
  isLoading?: boolean;
}

export function BrokerFormModal({
  open,
  onClose,
  onSave,
  initialData,
  isLoading,
}: BrokerFormModalProps) {
  const t = useTranslations("brokers");
  const tCommon = useTranslations("common");
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
  } = useForm<UpdateBrokerInput>({
    resolver: zodResolver(updateBrokerSchema),
    defaultValues: {
      name: "",
      phone: "",
      whatsapp: "",
    },
  });

  const { field: phoneField } = useController({
    name: "phone",
    control,
    defaultValue: "",
  });
  const { field: whatsappField } = useController({
    name: "whatsapp",
    control,
    defaultValue: "",
  });

  const phoneValue = watch("phone");

  // Reset form when modal opens or initialData changes
  useEffect(() => {
    if (open && initialData) {
      reset({
        name: initialData.name,
        phone: initialData.phone ? formatPhoneInput(initialData.phone) : "",
        whatsapp: initialData.whatsapp
          ? formatPhoneInput(initialData.whatsapp)
          : "",
      });

      // Check if phone and whatsapp are the same
      if (
        initialData.phone &&
        initialData.whatsapp &&
        initialData.phone === initialData.whatsapp
      ) {
        setUseSamePhoneForWhatsapp(true);
      } else {
        setUseSamePhoneForWhatsapp(false);
      }
    }
  }, [open, initialData, reset]);

  // Sync whatsapp with phone when checkbox is checked
  useEffect(() => {
    if (useSamePhoneForWhatsapp && phoneValue) {
      setValue("whatsapp", phoneValue, { shouldDirty: true });
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneInput(e.target.value);
    phoneField.onChange(formatted);
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!useSamePhoneForWhatsapp) {
      const formatted = formatPhoneInput(e.target.value);
      whatsappField.onChange(formatted);
    }
  };

  const handleFormSubmit = async (data: UpdateBrokerInput) => {
    try {
      // Sanitize phone numbers before submitting
      const sanitizedData: UpdateBrokerInput = {
        ...data,
        phone: data.phone ? sanitizePhone(data.phone) : undefined,
        whatsapp: data.whatsapp ? sanitizePhone(data.whatsapp) : undefined,
      };

      await onSave(sanitizedData);
      reset(data); // Reset with saved values to clear dirty state
    } catch (error) {
      console.error("Error saving broker:", error);
    }
  };

  const isEditMode = !!initialData;

  return (
    <>
      <Modal open={open} onClose={handleClose}>
        <ModalClose onClose={handleClose} />
        <ModalHeader>
          <ModalTitle>
            {isEditMode ? t("editBrokerTitle") : t("inviteBrokerTitle")}
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
                  {tCommon("name")} <span className="text-red-500">*</span>
                </label>
                <input
                  {...register("name")}
                  id="name"
                  type="text"
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border transition-colors",
                    errors.name
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500",
                  )}
                  placeholder={tCommon("namePlaceholder")}
                />
                {errors.name && (
                  <p className="text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Telefone */}
              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-slate-700 flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  {tCommon("phone")}
                </label>
                <input
                  {...phoneField}
                  id="phone"
                  type="tel"
                  onChange={handlePhoneChange}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border transition-colors",
                    errors.phone
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500",
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
                <input
                  {...whatsappField}
                  id="whatsapp"
                  type="tel"
                  onChange={handleWhatsappChange}
                  disabled={useSamePhoneForWhatsapp}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border transition-colors",
                    useSamePhoneForWhatsapp && "bg-slate-50 cursor-not-allowed",
                    errors.whatsapp
                      ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500",
                  )}
                  placeholder="(11) 91234-5678"
                />
                {errors.whatsapp && (
                  <p className="text-sm text-red-600">
                    {errors.whatsapp.message}
                  </p>
                )}

                {/* Checkbox para usar mesmo telefone */}
                <div className="flex items-center space-x-2 mt-2">
                  <Checkbox
                    id="samePhone"
                    checked={useSamePhoneForWhatsapp}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setUseSamePhoneForWhatsapp(e.target.checked);
                      if (e.target.checked && phoneValue) {
                        setValue("whatsapp", phoneValue, { shouldDirty: true });
                      }
                    }}
                  />
                  <label
                    htmlFor="samePhone"
                    className="text-sm text-slate-600 cursor-pointer select-none"
                  >
                    {tCommon("useSamePhoneForWhatsapp")}
                  </label>
                </div>
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
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={!isDirty || isLoading}
                className={cn(
                  "flex items-center gap-1.5 px-5 py-2.5 text-white text-sm font-medium transition-all",
                  !isDirty || isLoading
                    ? "bg-slate-300 cursor-not-allowed"
                    : "bg-[#C2410C] hover:bg-[#a03609]",
                )}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    {tCommon("saving")}
                  </>
                ) : (
                  <>
                    <User className="w-4 h-4" />
                    {tCommon("save")}
                  </>
                )}
              </button>
            </div>
          </ModalFooter>
        </form>
      </Modal>

      {/* Confirmation dialog for discarding changes */}
      <AlertDialog
        open={showDiscardConfirm}
        onOpenChange={setShowDiscardConfirm}
      >
        <AlertDialogContent className="w-full max-w-md p-6 mx-auto">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 flex-shrink-0 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-bold text-slate-800">
                  Descartar alterações?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-slate-600 mt-1 leading-relaxed">
                  Existem alterações não salvas. Deseja realmente descartá-las?
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4 flex justify-center gap-3">
            <AlertDialogCancel className="h-8 px-4 text-sm rounded border border-slate-200">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDiscard}
              className="bg-amber-600 hover:bg-amber-700 h-8 px-4 text-sm rounded"
            >
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
