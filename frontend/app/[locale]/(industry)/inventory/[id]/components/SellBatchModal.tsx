"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { X, AlertTriangle, DollarSign, User, Users, UserPlus } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { calculateTotalBatchPrice } from "@/lib/utils/priceConversion";
import { cn } from "@/lib/utils/cn";
import type { Batch, PriceUnit } from "@/lib/types";
import { useToast } from "@/lib/hooks/useToast";

interface SellBatchModalProps {
    batch: Batch;
    quantitySlabs: number;
    sourceStatus: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const formSchema = z.object({
    sellerType: z.enum(["USER", "CUSTOM"]),
    soldByUserId: z.string().optional(),
    sellerName: z.string().optional(),
    clientType: z.enum(["EXISTING", "NEW", "NONE"]),
    clienteId: z.string().optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    customerEmail: z.string().optional(),
    marketingOptIn: z.boolean().optional(),
    notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface UserData {
    id: string;
    name: string;
    email?: string;
    role?: string;
}

interface Cliente {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    whatsapp?: string;
}

const roleLabels: Record<string, string> = {
    "ADMIN_INDUSTRIA": "Admin",
    "VENDEDOR_INTERNO": "Vendedor",
    "BROKER": "Broker",
};

const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export function SellBatchModal({
    batch,
    quantitySlabs,
    sourceStatus,
    isOpen,
    onClose,
    onSuccess,
}: SellBatchModalProps) {
    const { success, error } = useToast();
    const [isPending, setIsPending] = useState(false);
    const [salePriceValue, setSalePriceValue] = useState<number>(0);
    const [users, setUsers] = useState<UserData[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isLoadingClientes, setIsLoadingClientes] = useState(false);

    const safeQuantitySlabs = quantitySlabs > 0 ? quantitySlabs : 1;
    const avgArea = batch.quantitySlabs > 0 ? batch.totalArea / batch.quantitySlabs : 0;
    const estimatedArea = avgArea * safeQuantitySlabs;
    const basePrice = useMemo(() =>
        calculateTotalBatchPrice(estimatedArea, batch.industryPrice, batch.priceUnit as PriceUnit),
        [estimatedArea, batch.industryPrice, batch.priceUnit]
    );

    const form = useForm<FormValues>({
        defaultValues: {
            sellerType: "CUSTOM",
            clientType: "NONE",
            marketingOptIn: false,
            notes: "",
            customerEmail: "",
        },
    });

    const sellerType = form.watch("sellerType");
    const clientType = form.watch("clientType");

    useEffect(() => {
        if (isOpen) {
            form.reset({
                sellerType: "CUSTOM",
                clientType: "NONE",
                marketingOptIn: false,
                notes: "",
                customerEmail: "",
                soldByUserId: undefined,
                sellerName: "",
                clienteId: undefined,
                customerName: "",
                customerPhone: "",
            });
            setSalePriceValue(basePrice > 0 ? basePrice : 0);
        }
    }, [isOpen, basePrice, form]);

    useEffect(() => {
        if (isOpen) {
            setIsLoadingUsers(true);
            Promise.all([
                apiClient.get<UserData[] | { users: UserData[] }>('/users').catch(() => []),
                apiClient.get<UserData[] | { brokers: UserData[] }>('/brokers').catch(() => []),
            ])
                .then(([usersData, brokersData]) => {
                    let userList: UserData[] = Array.isArray(usersData) ? usersData : (usersData as any).users || [];
                    let brokerList: UserData[] = [];
                    if (Array.isArray(brokersData)) {
                        brokerList = brokersData.map((b: any) => ({ id: b.id, name: b.name, email: b.email, role: 'BROKER' }));
                    } else if ((brokersData as any)?.brokers) {
                        brokerList = ((brokersData as any).brokers || []).map((b: any) => ({ id: b.id, name: b.name, email: b.email, role: 'BROKER' }));
                    }
                    const allUsers = [...userList, ...brokerList];
                    const uniqueUsers = allUsers.filter((user, index, self) => index === self.findIndex(u => u.id === user.id));
                    const allowedRoles = ["ADMIN_INDUSTRIA", "VENDEDOR_INTERNO", "BROKER"];
                    setUsers(uniqueUsers.filter(u => u.role && allowedRoles.includes(u.role)));
                })
                .finally(() => setIsLoadingUsers(false));
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setIsLoadingClientes(true);
            apiClient.get<{ clientes: Cliente[] } | Cliente[]>('/clientes')
                .then((data) => setClientes(Array.isArray(data) ? data : data.clientes || []))
                .catch(() => setClientes([]))
                .finally(() => setIsLoadingClientes(false));
        }
    }, [isOpen]);

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        setSalePriceValue(parseInt(rawValue, 10) / 100 || 0);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        form.setValue("customerPhone", formatPhoneNumber(e.target.value), { shouldValidate: true });
    };

    const isPriceValid = salePriceValue >= basePrice;

    const onSubmit = async (values: FormValues) => {
        try {
            setIsPending(true);

            if (values.sellerType === "USER" && !values.soldByUserId) {
                error("Selecione um vendedor do sistema");
                setIsPending(false);
                return;
            }
            if (values.sellerType === "CUSTOM" && (!values.sellerName || values.sellerName.trim() === "")) {
                error("Informe o nome do vendedor");
                setIsPending(false);
                return;
            }
            if (values.clientType === "EXISTING" && !values.clienteId) {
                error("Selecione um cliente existente");
                setIsPending(false);
                return;
            }
            if (values.clientType === "NEW") {
                if (!values.customerName?.trim()) {
                    error("Nome do cliente é obrigatório");
                    setIsPending(false);
                    return;
                }
                if (!values.customerPhone || values.customerPhone.replace(/\D/g, "").length < 10) {
                    error("Telefone do cliente é obrigatório");
                    setIsPending(false);
                    return;
                }
            }
            if (!isPriceValid) {
                error(`Preço não pode ser menor que ${formatCurrency(basePrice)}`);
                setIsPending(false);
                return;
            }

            let sellerName = "";
            let soldByUserId: string | undefined = undefined;

            if (values.sellerType === "USER" && values.soldByUserId) {
                const selectedUser = users.find(u => u.id === values.soldByUserId);
                sellerName = selectedUser?.name || "Usuário do Sistema";
                soldByUserId = values.soldByUserId;
            } else {
                sellerName = values.sellerName || "";
            }

            let customerName = "Cliente não informado";
            let customerContact = "Não informado";
            let clienteId: string | undefined = undefined;
            let newClient: { name: string; phone: string; email?: string } | undefined = undefined;

            if (values.clientType === "EXISTING" && values.clienteId) {
                const selectedClient = clientes.find(c => c.id === values.clienteId);
                customerName = selectedClient?.name || "Cliente Existente";
                customerContact = selectedClient?.email || selectedClient?.phone || "Não informado";
                clienteId = values.clienteId;
            } else if (values.clientType === "NEW") {
                customerName = values.customerName!;
                customerContact = values.customerPhone!;
                newClient = {
                    name: values.customerName!,
                    phone: values.customerPhone!.replace(/\D/g, ""),
                    email: values.customerEmail || undefined,
                };
            }

            const payload = {
                quantitySlabsSold: safeQuantitySlabs,
                totalAreaSold: parseFloat(estimatedArea.toFixed(2)),
                salePrice: salePriceValue,
                pricePerUnit: salePriceValue / estimatedArea,
                priceUnit: batch.priceUnit,
                industryId: batch.industryId,
                sellerName,
                customerName,
                customerContact,
                netIndustryValue: salePriceValue,
                brokerCommission: 0,
                soldByUserId,
                clienteId,
                newClient,
                notes: values.notes,
            };

            await apiClient.post(`/batches/${batch.id}/sell`, payload);
            success("Venda registrada com sucesso!");
            onSuccess();
            onClose();
        } catch (err: any) {
            error(err?.message || "Erro ao registrar venda");
        } finally {
            setIsPending(false);
        }
    };

    if (!isOpen) return null;

    if (quantitySlabs <= 0) {
        return (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                <div className="bg-white w-full max-w-md shadow-2xl">
                    <div className="px-6 py-5 bg-[#121212] text-white flex items-center justify-between">
                        <h2 className="font-serif text-xl">Erro</h2>
                        <button onClick={onClose} className="p-2 -mr-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="h-1 bg-rose-500" />
                    <div className="p-6">
                        <p className="text-rose-600">Quantidade de chapas inválida. Defina uma quantidade válida antes de confirmar a venda.</p>
                    </div>
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                        <button onClick={onClose} className="px-5 py-2.5 text-slate-600 text-sm font-medium hover:text-[#121212] transition-colors">
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-white w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-5 bg-[#121212] text-white flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="font-serif text-xl">Confirmar Venda</h2>
                        <p className="text-xs text-white/50 mt-0.5">Registre os detalhes da venda</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 text-white/60 hover:text-white hover:bg-white/10 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-[#C2410C] shrink-0" />

                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
                    <div className="px-6 py-6 space-y-6 overflow-y-auto flex-1">
                        {/* Warning */}
                        <div className="flex items-start gap-3 p-4 bg-slate-100 border border-slate-200">
                            <AlertTriangle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                            <p className="text-sm text-slate-700">
                                Você está vendendo <strong>{safeQuantitySlabs} chapa{safeQuantitySlabs > 1 ? 's' : ''}</strong>.
                                Para desfazer, acesse a página de Vendas.
                            </p>
                        </div>

                        {/* Sale Summary */}
                        <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Chapas</p>
                                <p className="font-serif text-lg text-[#121212]">{safeQuantitySlabs}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Área</p>
                                <p className="font-serif text-lg text-[#121212]">{estimatedArea.toFixed(2)} {batch.priceUnit === 'M2' ? 'm²' : 'ft²'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Preço Base</p>
                                <p className="font-serif text-lg text-[#121212]">{formatCurrency(basePrice)}</p>
                            </div>
                        </div>

                        {/* Sale Price */}
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-2">
                                <DollarSign className="w-3.5 h-3.5 inline mr-1" />
                                Valor da Venda
                            </label>
                            <input
                                type="text"
                                value={formatCurrency(salePriceValue)}
                                onChange={handlePriceChange}
                                className={cn(
                                    "w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors font-medium",
                                    !isPriceValid ? "border-rose-500" : "border-slate-200"
                                )}
                            />
                            {!isPriceValid && (
                                <p className="mt-1 text-xs text-rose-500">Preço não pode ser menor que {formatCurrency(basePrice)}</p>
                            )}
                        </div>

                        {/* Seller Section */}
                        <div className="space-y-3">
                            <label className="text-xs font-medium text-slate-600 block">
                                <User className="w-3.5 h-3.5 inline mr-1" />
                                Vendedor
                            </label>
                            <div className="flex bg-slate-100 p-1 gap-1">
                                <button
                                    type="button"
                                    onClick={() => { form.setValue("sellerType", "USER"); form.setValue("sellerName", ""); }}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                                        sellerType === "USER" ? "bg-white text-[#121212] shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Do Sistema
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { form.setValue("sellerType", "CUSTOM"); form.setValue("soldByUserId", undefined); }}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                                        sellerType === "CUSTOM" ? "bg-white text-[#121212] shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Personalizado
                                </button>
                            </div>
                            {sellerType === "USER" ? (
                                <select
                                    value={form.watch("soldByUserId") || ""}
                                    onChange={(e) => form.setValue("soldByUserId", e.target.value)}
                                    disabled={isLoadingUsers}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                >
                                    <option value="">{isLoadingUsers ? "Carregando..." : "Selecione um vendedor"}</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id}>
                                            {user.name} {user.role ? `(${roleLabels[user.role] || user.role})` : ''}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    {...form.register("sellerName")}
                                    placeholder="Nome do vendedor externo/parceiro"
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                />
                            )}
                        </div>

                        {/* Client Section */}
                        <div className="space-y-3">
                            <label className="text-xs font-medium text-slate-600 block">
                                <Users className="w-3.5 h-3.5 inline mr-1" />
                                Cliente <span className="text-slate-400 font-normal">(opcional)</span>
                            </label>
                            <div className="flex bg-slate-100 p-1 gap-1">
                                <button
                                    type="button"
                                    onClick={() => { form.setValue("clientType", "NONE"); form.setValue("clienteId", undefined); form.setValue("customerName", ""); form.setValue("customerPhone", ""); }}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                                        clientType === "NONE" ? "bg-white text-[#121212] shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Não Informar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { form.setValue("clientType", "EXISTING"); form.setValue("customerName", ""); form.setValue("customerPhone", ""); }}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                                        clientType === "EXISTING" ? "bg-white text-[#121212] shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Existente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { form.setValue("clientType", "NEW"); form.setValue("clienteId", undefined); }}
                                    className={cn(
                                        "flex-1 py-2 text-xs font-bold uppercase tracking-widest transition-colors",
                                        clientType === "NEW" ? "bg-white text-[#121212] shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    Novo
                                </button>
                            </div>

                            {clientType === "EXISTING" && (
                                <select
                                    value={form.watch("clienteId") || ""}
                                    onChange={(e) => form.setValue("clienteId", e.target.value)}
                                    disabled={isLoadingClientes}
                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                >
                                    <option value="">{isLoadingClientes ? "Carregando..." : "Selecione um cliente"}</option>
                                    {clientes.map((client) => (
                                        <option key={client.id} value={client.id}>
                                            {client.name}{client.email ? ` - ${client.email}` : client.phone ? ` - ${client.phone}` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}

                            {clientType === "NEW" && (
                                <div className="space-y-3 p-4 bg-slate-50 border border-slate-200">
                                    <div className="flex items-center gap-2 mb-2">
                                        <UserPlus className="w-4 h-4 text-slate-400" />
                                        <span className="text-xs font-medium text-slate-500">Novo Cliente</span>
                                    </div>
                                    <input
                                        {...form.register("customerName")}
                                        placeholder="Nome do cliente *"
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-[#C2410C] outline-none text-sm transition-colors"
                                    />
                                    <input
                                        value={form.watch("customerPhone") || ""}
                                        onChange={handlePhoneChange}
                                        placeholder="Telefone *"
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-[#C2410C] outline-none text-sm transition-colors"
                                    />
                                    <input
                                        {...form.register("customerEmail")}
                                        type="email"
                                        placeholder="Email (opcional)"
                                        className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-[#C2410C] outline-none text-sm transition-colors"
                                    />
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.watch("marketingOptIn") || false}
                                            onChange={(e) => form.setValue("marketingOptIn", e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-[#C2410C] focus:ring-[#C2410C]"
                                        />
                                        <span className="text-xs text-slate-500">Aceita comunicações de marketing</span>
                                    </label>
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="text-xs font-medium text-slate-600 block mb-2">
                                Observações <span className="text-slate-400 font-normal">(opcional)</span>
                            </label>
                            <textarea
                                {...form.register("notes")}
                                placeholder="Detalhes adicionais da venda..."
                                rows={2}
                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors resize-none"
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-slate-500 hover:text-[#121212] text-sm font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || !isPriceValid}
                            className={cn(
                                "flex items-center gap-1.5 px-6 py-2.5 text-white text-sm font-medium transition-all",
                                isPending || !isPriceValid ? "bg-slate-300 cursor-not-allowed" : "bg-[#C2410C] hover:bg-[#a03609]"
                            )}
                        >
                            {isPending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <DollarSign className="w-4 h-4" />
                                    Confirmar Venda
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
