"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, AlertTriangle } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { calculateTotalBatchPrice } from "@/lib/utils/priceConversion";
import { cn } from "@/lib/utils/cn";

import {
    Modal,
    ModalContent,
    ModalDescription,
    ModalFooter,
    ModalHeader,
    ModalTitle,
} from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { Batch, PriceUnit } from "@/lib/types";
import { useToast } from "@/lib/hooks/useToast";

// Simple Label component
const Label = ({ children, className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label className={cn("text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70", className)} {...props}>
        {children}
    </label>
);

interface SellBatchModalProps {
    batch: Batch;
    quantitySlabs: number;
    sourceStatus: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

// Form schema - validation is done manually in onSubmit
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

interface User {
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

// Role translation map
const roleLabels: Record<string, string> = {
    "ADMIN_INDUSTRIA": "Administrador",
    "VENDEDOR_INTERNO": "Vendedor Interno",
    "BROKER": "Broker",
    "ADMIN_BROKER": "Admin Broker",
    "VIEWER": "Visualizador",
};

// Phone mask function
const formatPhoneNumber = (value: string): string => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 2) {
        return digits.length > 0 ? `(${digits}` : "";
    } else if (digits.length <= 7) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    } else if (digits.length <= 10) {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    } else {
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }
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
    const [users, setUsers] = useState<User[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [isLoadingClientes, setIsLoadingClientes] = useState(false);

    // Safe quantity value - fallback to at least 1 if provided value is invalid
    const safeQuantitySlabs = quantitySlabs > 0 ? quantitySlabs : 1;

    // Calculate derived values using the same function as the page
    const avgArea = batch.quantitySlabs > 0 ? batch.totalArea / batch.quantitySlabs : 0;
    const estimatedArea = avgArea * safeQuantitySlabs;
    const basePrice = useMemo(() =>
        calculateTotalBatchPrice(estimatedArea, batch.industryPrice, batch.priceUnit as PriceUnit),
        [estimatedArea, batch.industryPrice, batch.priceUnit]
    );

    // No zodResolver - we validate manually in onSubmit
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

    // Initialize price and reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            // Reset form to defaults when modal opens
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

    // Fetch users AND brokers using apiClient (includes CSRF)
    useEffect(() => {
        if (isOpen) {
            setIsLoadingUsers(true);

            // Fetch both users and brokers in parallel
            Promise.all([
                apiClient.get<User[] | { users: User[] }>('/users').catch(() => []),
                apiClient.get<User[] | { brokers: User[] }>('/brokers').catch(() => []),
            ])
                .then(([usersData, brokersData]) => {
                    // Parse users response
                    let userList: User[] = [];
                    if (Array.isArray(usersData)) {
                        userList = usersData;
                    } else if (usersData && 'users' in usersData) {
                        userList = usersData.users || [];
                    }

                    // Parse brokers response
                    let brokerList: User[] = [];
                    if (Array.isArray(brokersData)) {
                        brokerList = brokersData.map((b: any) => ({
                            id: b.id,
                            name: b.name,
                            email: b.email,
                            role: 'BROKER',
                        }));
                    } else if (brokersData && 'brokers' in brokersData) {
                        brokerList = (brokersData.brokers || []).map((b: any) => ({
                            id: b.id,
                            name: b.name,
                            email: b.email,
                            role: 'BROKER',
                        }));
                    }

                    // Merge and dedupe by ID
                    const allUsers = [...userList, ...brokerList];
                    const uniqueUsers = allUsers.filter((user, index, self) =>
                        index === self.findIndex(u => u.id === user.id)
                    );

                    // Filter to only include roles that can sell
                    const allowedRoles = ["ADMIN_INDUSTRIA", "VENDEDOR_INTERNO", "BROKER", "ADMIN_BROKER"];
                    const filteredUsers = uniqueUsers.filter(u => u.role && allowedRoles.includes(u.role));
                    setUsers(filteredUsers);
                })
                .catch((err) => {
                    console.error("Error fetching users/brokers:", err);
                    setUsers([]);
                })
                .finally(() => setIsLoadingUsers(false));
        }
    }, [isOpen]);

    // Fetch clientes using apiClient (includes CSRF)
    useEffect(() => {
        if (isOpen) {
            setIsLoadingClientes(true);
            apiClient.get<{ clientes: Cliente[] } | Cliente[]>('/clientes')
                .then((data) => {
                    if (Array.isArray(data)) {
                        setClientes(data);
                    } else {
                        setClientes(data.clientes || []);
                    }
                })
                .catch((err) => {
                    console.error("Error fetching clientes:", err);
                    setClientes([]);
                })
                .finally(() => setIsLoadingClientes(false));
        }
    }, [isOpen]);

    // Format price input as currency with BRL mask
    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        const numericValue = parseInt(rawValue, 10) / 100 || 0;
        setSalePriceValue(numericValue);
    };

    // Handle phone input with mask
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        form.setValue("customerPhone", formatted, { shouldValidate: true });
    };

    // Get display value for price input
    const getPriceDisplayValue = () => {
        return formatCurrency(salePriceValue);
    };

    // Check if price is valid
    const isPriceValid = salePriceValue >= basePrice;

    // Get role label
    const getRoleLabel = (role: string | undefined): string => {
        if (!role) return "";
        return roleLabels[role] || role;
    };

    const onSubmit = async (values: FormValues) => {
        try {
            setIsPending(true);

            // Validate based on ACTIVE TAB, not stored values
            // For seller: only check the field for the ACTIVE sellerType
            if (values.sellerType === "USER") {
                if (!values.soldByUserId) {
                    error("Selecione um vendedor do sistema");
                    form.setError("soldByUserId", { message: "Selecione um vendedor" });
                    setIsPending(false);
                    return;
                }
            } else if (values.sellerType === "CUSTOM") {
                if (!values.sellerName || values.sellerName.trim() === "") {
                    error("Informe o nome do vendedor");
                    form.setError("sellerName", { message: "Informe o nome do vendedor" });
                    setIsPending(false);
                    return;
                }
            }

            // For client: validate based on active clientType
            if (values.clientType === "EXISTING") {
                if (!values.clienteId) {
                    error("Selecione um cliente existente");
                    form.setError("clienteId", { message: "Selecione um cliente" });
                    setIsPending(false);
                    return;
                }
            } else if (values.clientType === "NEW") {
                if (!values.customerName || values.customerName.trim() === "") {
                    error("Nome do cliente é obrigatório");
                    form.setError("customerName", { message: "Nome do cliente obrigatório" });
                    setIsPending(false);
                    return;
                }
                if (!values.customerPhone || values.customerPhone.replace(/\D/g, "").length < 10) {
                    error("Telefone do cliente é obrigatório (mínimo 10 dígitos)");
                    form.setError("customerPhone", { message: "Telefone obrigatório" });
                    setIsPending(false);
                    return;
                }
            }

            // Validate minimum price
            if (!isPriceValid) {
                error(`Preço de venda não pode ser menor que o preço base (${formatCurrency(basePrice)})`);
                setIsPending(false);
                return;
            }

            // Get seller name BASED ON ACTIVE TAB
            let sellerName = "";
            let soldByUserId: string | undefined = undefined;

            if (values.sellerType === "USER" && values.soldByUserId) {
                const selectedUser = users.find((u: User) => u.id === values.soldByUserId);
                sellerName = selectedUser?.name || "Usuário do Sistema";
                soldByUserId = values.soldByUserId;
            } else if (values.sellerType === "CUSTOM") {
                sellerName = values.sellerName || "";
                soldByUserId = undefined; // Explicitly clear
            }

            // Get customer info BASED ON ACTIVE TAB
            let customerName = "Cliente não informado";
            let customerContact = "Não informado";
            let clienteId: string | undefined = undefined;
            let newClient: { name: string; phone: string; email?: string } | undefined = undefined;

            if (values.clientType === "EXISTING" && values.clienteId) {
                const selectedClient = clientes.find((c: Cliente) => c.id === values.clienteId);
                customerName = selectedClient?.name || "Cliente Existente";
                // Prioriza email, depois phone, depois whatsapp
                customerContact = selectedClient?.email || selectedClient?.phone || selectedClient?.whatsapp || "Não informado";
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
            // If clientType is "NONE", we don't set clienteId or newClient

            const payload = {
                quantitySlabsSold: safeQuantitySlabs,
                totalAreaSold: parseFloat(estimatedArea.toFixed(2)),
                salePrice: salePriceValue,
                pricePerUnit: salePriceValue / estimatedArea,
                priceUnit: batch.priceUnit,
                industryId: batch.industryId,
                sellerName: sellerName,
                customerName: customerName,
                customerContact: customerContact,
                netIndustryValue: salePriceValue,
                brokerCommission: 0,
                soldByUserId: soldByUserId,
                clienteId: clienteId,
                newClient: newClient,
                notes: values.notes,
            };

            await apiClient.post(`/batches/${batch.id}/sell`, payload);

            success("Venda registrada com sucesso!");
            onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            error(err?.message || "Erro ao registrar venda");
        } finally {
            setIsPending(false);
        }
    };

    // If quantitySlabs is invalid, show warning
    if (quantitySlabs <= 0) {
        return (
            <Modal open={isOpen} onClose={onClose}>
                <ModalContent className="max-w-md w-full bg-white rounded-lg p-6">
                    <ModalHeader>
                        <ModalTitle>Erro</ModalTitle>
                    </ModalHeader>
                    <div className="p-4">
                        <p className="text-red-600">
                            Quantidade de chapas inválida. Por favor, defina uma quantidade válida antes de confirmar a venda.
                        </p>
                    </div>
                    <ModalFooter>
                        <Button variant="secondary" onClick={onClose}>
                            Fechar
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        );
    }

    return (
        <Modal open={isOpen} onClose={onClose}>
            <ModalContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-full bg-white rounded-lg p-6">
                <ModalHeader>
                    <ModalTitle>Confirmar Venda</ModalTitle>
                    <ModalDescription>
                        Registre os detalhes da venda para atualizar o status das chapas.
                    </ModalDescription>
                    <div className="flex items-center gap-2 mt-2 p-3 bg-amber-50 border border-amber-200 rounded-sm">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <span className="text-sm text-amber-800">
                            Tem certeza que quer atualizar o status de <strong>{safeQuantitySlabs} chapa{safeQuantitySlabs > 1 ? 's' : ''}</strong> para vendido?
                            Para desfazer, acesse a página de Vendas e remova a venda.
                        </span>
                    </div>
                </ModalHeader>

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
                    {/* Sale Info Summary */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-md">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Quantidade</p>
                            <p className="text-lg font-semibold text-obsidian">{safeQuantitySlabs} chapa{safeQuantitySlabs > 1 ? 's' : ''}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Área Total</p>
                            <p className="text-lg font-semibold text-obsidian">{estimatedArea.toFixed(2)} {batch.priceUnit === 'M2' ? 'm²' : 'ft²'}</p>
                        </div>
                    </div>

                    {/* Sale Price */}
                    <div className="space-y-2">
                        <Label htmlFor="salePrice">Valor da Venda (opcional)</Label>
                        <Input
                            id="salePrice"
                            type="text"
                            value={getPriceDisplayValue()}
                            onChange={handlePriceChange}
                            placeholder={formatCurrency(basePrice)}
                        />
                        <p className="text-xs text-slate-500">
                            Preço base: {formatCurrency(basePrice)} ({formatCurrency(batch.industryPrice)}/{batch.priceUnit === 'M2' ? 'm²' : 'ft²'})
                        </p>
                        {!isPriceValid && (
                            <p className="text-sm text-red-500">
                                Preço não pode ser menor que o preço base
                            </p>
                        )}
                    </div>

                    {/* SELLER SECTION */}
                    <div className="border p-4 rounded-md space-y-4">
                        <h3 className="font-medium">Vendedor</h3>

                        <div className="flex space-x-2 bg-slate-100 p-1 rounded-md mb-2">
                            <button
                                type="button"
                                onClick={() => {
                                    form.setValue("sellerType", "USER");
                                    form.setValue("sellerName", ""); // Clear custom name when switching to USER tab
                                }}
                                className={cn(
                                    "flex-1 py-1.5 text-sm font-medium rounded-sm transition-colors",
                                    sellerType === "USER" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                Usuário do Sistema
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    form.setValue("sellerType", "CUSTOM");
                                    form.setValue("soldByUserId", undefined); // Clear selected user when switching to CUSTOM tab
                                }}
                                className={cn(
                                    "flex-1 py-1.5 text-sm font-medium rounded-sm transition-colors",
                                    sellerType === "CUSTOM" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                Nome Personalizado
                            </button>
                        </div>

                        {sellerType === "USER" && (
                            <div className="space-y-2">
                                <Controller
                                    control={form.control}
                                    name="soldByUserId"
                                    render={({ field }) => (
                                        <Select
                                            value={field.value || ""}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            disabled={isLoadingUsers}
                                        >
                                            <option value="">
                                                {isLoadingUsers ? "Carregando..." : "Selecione um vendedor"}
                                            </option>
                                            {users.map((user) => (
                                                <option key={user.id} value={user.id}>
                                                    {user.name} {user.role ? `(${getRoleLabel(user.role)})` : ''}
                                                </option>
                                            ))}
                                        </Select>
                                    )}
                                />
                                {users.length === 0 && !isLoadingUsers && (
                                    <p className="text-xs text-slate-500">
                                        Nenhum usuário encontrado. Use &quot;Nome Personalizado&quot; para informar manualmente.
                                    </p>
                                )}
                                {form.formState.errors.soldByUserId && (
                                    <p className="text-sm text-red-500">{form.formState.errors.soldByUserId.message}</p>
                                )}
                            </div>
                        )}

                        {sellerType === "CUSTOM" && (
                            <div className="space-y-2">
                                <Input
                                    placeholder="Nome do vendedor (externo/parceiro)"
                                    {...form.register("sellerName")}
                                />
                                {form.formState.errors.sellerName && (
                                    <p className="text-sm text-red-500">{form.formState.errors.sellerName.message}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CLIENT SECTION */}
                    <div className="border p-4 rounded-md space-y-4">
                        <h3 className="font-medium">Cliente (opcional)</h3>

                        <div className="flex space-x-2 bg-slate-100 p-1 rounded-md mb-2">
                            <button
                                type="button"
                                onClick={() => {
                                    form.setValue("clientType", "NONE");
                                    form.setValue("clienteId", undefined);
                                    form.setValue("customerName", "");
                                    form.setValue("customerPhone", "");
                                    form.setValue("customerEmail", "");
                                }}
                                className={cn(
                                    "flex-1 py-1.5 text-sm font-medium rounded-sm transition-colors",
                                    clientType === "NONE" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                Não informar
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    form.setValue("clientType", "EXISTING");
                                    form.setValue("customerName", "");
                                    form.setValue("customerPhone", "");
                                    form.setValue("customerEmail", "");
                                }}
                                className={cn(
                                    "flex-1 py-1.5 text-sm font-medium rounded-sm transition-colors",
                                    clientType === "EXISTING" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                Existente
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    form.setValue("clientType", "NEW");
                                    form.setValue("clienteId", undefined);
                                }}
                                className={cn(
                                    "flex-1 py-1.5 text-sm font-medium rounded-sm transition-colors",
                                    clientType === "NEW" ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                Novo
                            </button>
                        </div>

                        {clientType === "EXISTING" && (
                            <div className="space-y-2">
                                <Controller
                                    control={form.control}
                                    name="clienteId"
                                    render={({ field }) => (
                                        <Select
                                            value={field.value || ""}
                                            onChange={(e) => field.onChange(e.target.value)}
                                            disabled={isLoadingClientes}
                                        >
                                            <option value="">
                                                {isLoadingClientes ? "Carregando..." : "Selecione um cliente"}
                                            </option>
                                            {clientes.map((client) => (
                                                <option key={client.id} value={client.id}>
                                                    {client.name}{client.email ? ` - ${client.email}` : client.phone ? ` - ${client.phone}` : ''}
                                                </option>
                                            ))}
                                        </Select>
                                    )}
                                />
                                {clientes.length === 0 && !isLoadingClientes && (
                                    <p className="text-xs text-slate-500">
                                        Nenhum cliente encontrado. Use &quot;Novo&quot; para cadastrar.
                                    </p>
                                )}
                                {form.formState.errors.clienteId && (
                                    <p className="text-sm text-red-500">{form.formState.errors.clienteId.message}</p>
                                )}
                            </div>
                        )}

                        {clientType === "NEW" && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="customerName">Nome *</Label>
                                    <Input
                                        id="customerName"
                                        placeholder="Nome do cliente"
                                        {...form.register("customerName")}
                                    />
                                    {form.formState.errors.customerName && (
                                        <p className="text-sm text-red-500">{form.formState.errors.customerName.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="customerPhone">Telefone *</Label>
                                    <Input
                                        id="customerPhone"
                                        type="tel"
                                        placeholder="(11) 99999-9999"
                                        value={form.watch("customerPhone") || ""}
                                        onChange={handlePhoneChange}
                                    />
                                    {form.formState.errors.customerPhone && (
                                        <p className="text-sm text-red-500">{form.formState.errors.customerPhone.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="customerEmail">Email (opcional)</Label>
                                    <Input
                                        id="customerEmail"
                                        type="email"
                                        placeholder="email@exemplo.com"
                                        {...form.register("customerEmail")}
                                    />
                                    {form.formState.errors.customerEmail && (
                                        <p className="text-sm text-red-500">{form.formState.errors.customerEmail.message}</p>
                                    )}
                                </div>
                                <Checkbox
                                    id="marketingOptIn"
                                    checked={form.watch("marketingOptIn") || false}
                                    onChange={(e) => form.setValue("marketingOptIn", e.target.checked)}
                                    label="Aceita receber comunicações de marketing"
                                />
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes">Observações</Label>
                        <Textarea
                            id="notes"
                            placeholder="Detalhes adicionais da venda..."
                            {...form.register("notes")}
                        />
                    </div>

                    <ModalFooter>
                        <Button type="button" variant="secondary" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isPending || !isPriceValid}
                        >
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Venda
                        </Button>
                    </ModalFooter>
                </form>
            </ModalContent>
        </Modal>
    );
}
