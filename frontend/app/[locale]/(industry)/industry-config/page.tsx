'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Loader2, Building2, MapPin, Phone, Info, Globe, Plus, Trash2, Instagram, Facebook, Linkedin, Twitter, Youtube, Link as LinkIcon } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import { PhoneInput, CNPJInput, CEPInput } from '@/components/ui/masked-input';
import { ImageUploadWithCrop } from '@/components/ui/ImageUploadWithCrop';
import { useIndustryConfig, useUpdateIndustryConfig, useUploadIndustryLogo, useDeleteIndustryLogo } from '@/lib/api/queries/industryApi';
import { ESTADOS_BRASIL, CIDADES_POR_ESTADO } from '@/lib/utils/brazil-locations';
import { cn } from '@/lib/utils/cn';

const formSchema = z.object({
    name: z.string().optional(),
    cnpj: z.string().optional(),
    contactEmail: z.string().email('Email inválido').optional().or(z.literal('')),
    contactPhone: z.string().optional(),
    whatsapp: z.string().optional(),
    description: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
    addressCountry: z.string().optional(),
    addressState: z.string().optional(),
    addressCity: z.string().optional(),
    addressStreet: z.string().optional(),
    addressNumber: z.string().optional(),
    addressZipCode: z.string().optional(),
    socialLinks: z.array(z.object({
        name: z.string().min(1, 'Nome é obrigatório'),
        url: z.string().url('URL deve ser válida').min(1, 'URL é obrigatória')
    })).max(5, 'Máximo 5 redes sociais').optional(),
});

type FormValues = z.infer<typeof formSchema>;

const getSocialIcon = (url: string, name: string) => {
    const lowerUrl = url.toLowerCase();
    const lowerName = name.toLowerCase();

    if (lowerUrl.includes('instagram') || lowerName.includes('instagram')) return <Instagram className="h-4 w-4 text-pink-600" />;
    if (lowerUrl.includes('facebook') || lowerName.includes('facebook')) return <Facebook className="h-4 w-4 text-blue-600" />;
    if (lowerUrl.includes('linkedin') || lowerName.includes('linkedin')) return <Linkedin className="h-4 w-4 text-blue-700" />;
    if (lowerUrl.includes('twitter') || lowerUrl.includes('x.com') || lowerName.includes('twitter') || lowerName.includes('x')) return <Twitter className="h-4 w-4 text-sky-500" />;
    if (lowerUrl.includes('youtube') || lowerName.includes('youtube')) return <Youtube className="h-4 w-4 text-red-600" />;
    if (lowerUrl.includes('tiktok') || lowerName.includes('tiktok')) return <span className="font-bold text-xs">Tk</span>; // Lucide might not have tiktok

    return <LinkIcon className="h-4 w-4 text-slate-400" />;
};

export default function IndustryConfigPage() {
    const t = useTranslations('industryConfig');
    const tCommon = useTranslations('common');
    const { success, error: showError } = useToast();

    const { data: industry, isLoading: isLoadingConfig } = useIndustryConfig();
    const updateConfig = useUpdateIndustryConfig();
    const uploadLogo = useUploadIndustryLogo();
    const deleteLogo = useDeleteIndustryLogo();

    const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
    const [previewLogoUrl, setPreviewLogoUrl] = useState<string>('');
    const [originalLogoUrl, setOriginalLogoUrl] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [useCNPJMask, setUseCNPJMask] = useState(true);
    const [showCNPJInfo, setShowCNPJInfo] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            cnpj: '',
            contactEmail: '',
            addressCountry: 'Brasil',
        },
    });

    const { control, handleSubmit, watch, setValue, reset, register, formState: { errors, isDirty } } = form;

    const { fields, append, remove } = useFieldArray({
        control,
        name: "socialLinks"
    });

    const watchedCountry = watch('addressCountry');
    const watchedState = watch('addressState');

    // Detect if logo changed
    const isLogoDirty = selectedLogo !== null || previewLogoUrl !== originalLogoUrl;

    // Detect if form or logo has changes
    const hasChanges = isDirty || isLogoDirty;

    // Load data
    useEffect(() => {
        if (industry) {
            const logoUrl = industry.logoUrl || '';
            setOriginalLogoUrl(logoUrl);
            setPreviewLogoUrl(logoUrl);

            reset({
                name: industry.name || '',
                cnpj: industry.cnpj || '',
                contactEmail: industry.contactEmail || '',
                contactPhone: industry.contactPhone || '',
                whatsapp: industry.whatsapp || '',
                description: industry.description || '',
                addressCountry: industry.addressCountry || 'Brasil',
                addressState: industry.addressState || '',
                addressCity: industry.addressCity || '',
                addressStreet: industry.addressStreet || '',
                addressNumber: industry.addressNumber || '',
                addressZipCode: industry.addressZipCode || '',
                socialLinks: industry.socialLinks || [],
            });
        }
    }, [industry, reset]);

    const handleLogoChange = (file: File) => {
        // Create a local preview
        const objectUrl = URL.createObjectURL(file);
        setPreviewLogoUrl(objectUrl);
        setSelectedLogo(file);
    };

    const handleLogoRemove = () => {
        setPreviewLogoUrl('');
        setSelectedLogo(null);
    };

    const handleCancel = () => {
        // Liberar memória do preview local se existir
        if (selectedLogo && previewLogoUrl.startsWith('blob:')) {
            URL.revokeObjectURL(previewLogoUrl);
        }

        if (industry) {
            // Restore all form fields to original values
            reset({
                name: industry.name || '',
                cnpj: industry.cnpj || '',
                contactEmail: industry.contactEmail || '',
                contactPhone: industry.contactPhone || '',
                whatsapp: industry.whatsapp || '',
                description: industry.description || '',
                addressCountry: industry.addressCountry || 'Brasil',
                addressState: industry.addressState || '',
                addressCity: industry.addressCity || '',
                addressStreet: industry.addressStreet || '',
                addressNumber: industry.addressNumber || '',
                addressZipCode: industry.addressZipCode || '',
                socialLinks: industry.socialLinks || [],
            });

            // Restore logo preview to original
            setPreviewLogoUrl(originalLogoUrl);
        }

        // Reset selected logo
        setSelectedLogo(null);
    };

    const onSubmit = async (data: FormValues) => {
        setIsUploading(true);
        try {
            const payload: any = { ...data };

            // Handle Logo Upload only on submit
            if (selectedLogo) {
                // Upload new logo
                const url = await uploadLogo.mutateAsync(selectedLogo);
                payload.logoUrl = url;
            } else if (!previewLogoUrl && industry?.logoUrl) {
                // Logo was removed (current empty, but existed before)
                payload.logoUrl = '';
            } else if (previewLogoUrl && !selectedLogo) {
                // Keep existing logo
                payload.logoUrl = industry?.logoUrl;
            }

            await updateConfig.mutateAsync(payload);

            // Update original logo URL after successful save
            if (selectedLogo && payload.logoUrl) {
                setOriginalLogoUrl(payload.logoUrl);
            } else if (!previewLogoUrl) {
                setOriginalLogoUrl('');
            }

            // Reset local state to clean up
            setSelectedLogo(null);

            success(t('success'));
        } catch (err: any) {
            console.error(err);
            // Better error handling for 'Entity Too Large' from nginx/backend if it still happens despite client crop
            if (err?.response?.status === 413) {
                showError("A imagem ainda é muito grande. Tente reduzir o zoom da edição.");
            } else {
                showError(t('error'));
            }
        } finally {
            setIsUploading(false);
        }
    };

    // Helper for states/cities
    const stateOptions = ESTADOS_BRASIL.map(e => ({ label: e.nome, value: e.sigla }));
    const cityOptions = (watchedState && CIDADES_POR_ESTADO[watchedState])
        ? CIDADES_POR_ESTADO[watchedState].map(c => ({ label: c, value: c }))
        : [];

    if (isLoadingConfig) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-obsidian" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-mineral">
            {/* Header */}
            <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
                <h1 className="font-serif text-3xl text-obsidian mb-2">{t('title')}</h1>
                <p className="text-sm text-slate-500">{t('subtitle')}</p>
            </div>

            {/* Form */}
            <div className="px-8 py-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    {/* Identidade */}
                    <div className="bg-white border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#C2410C]/10">
                                    <Building2 className="h-5 w-5 text-[#C2410C]" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-[#121212]">{t('identity')}</h2>
                                    <p className="text-xs text-slate-500">{t('identityDesc')}</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
                                {/* Logo Upload Section */}
                                <div className="space-y-3">
                                    <label className="text-xs font-medium text-slate-600 block">
                                        {t('logo')}
                                    </label>
                                    <ImageUploadWithCrop
                                        previewUrl={previewLogoUrl}
                                        onChange={handleLogoChange}
                                        onRemove={handleLogoRemove}
                                        isUploading={isUploading}
                                        aspectRatio={1}
                                        maxSizeInMB={2}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-slate-400">
                                        Formato quadrado recomendado. Máx: 2MB
                                    </p>
                                </div>

                                {/* Form Fields */}
                                <div className="space-y-5">
                                    {/* Nome da Empresa */}
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 block mb-2">
                                            {t('companyName')}
                                        </label>
                                        <input
                                            {...register('name')}
                                            placeholder={t('companyName')}
                                            className={cn(
                                                'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                                                errors.name ? 'border-rose-500' : 'border-slate-200'
                                            )}
                                        />
                                        {errors.name && (
                                            <p className="mt-1 text-xs text-rose-500">{errors.name.message}</p>
                                        )}
                                    </div>

                                    {/* CNPJ with Toggle */}
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs font-medium text-slate-600">
                                                {useCNPJMask ? 'CNPJ' : t('businessId')}
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCNPJInfo(!showCNPJInfo)}
                                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    <Info className="h-4 w-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setUseCNPJMask(!useCNPJMask)}
                                                    className={cn(
                                                        "flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all",
                                                        useCNPJMask
                                                            ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                    )}
                                                >
                                                    <Globe className="h-3 w-3" />
                                                    {useCNPJMask ? 'BR' : 'Internacional'}
                                                </button>
                                            </div>
                                        </div>

                                        {showCNPJInfo && (
                                            <div className="mb-3 p-3 bg-slate-100 border border-slate-200 text-xs text-slate-700">
                                                Para empresas brasileiras, use o modo BR com máscara de CNPJ.
                                                Para empresas estrangeiras, alterne para modo Internacional e insira
                                                o número de identificação empresarial do seu país.
                                            </div>
                                        )}

                                        <Controller
                                            name="cnpj"
                                            control={control}
                                            render={({ field }) => (
                                                useCNPJMask ? (
                                                    <CNPJInput
                                                        {...field}
                                                        value={field.value || ''}
                                                        onChange={(val) => field.onChange(val)}
                                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                                    />
                                                ) : (
                                                    <input
                                                        {...field}
                                                        value={field.value || ''}
                                                        placeholder="Ex: 123456789"
                                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                                    />
                                                )
                                            )}
                                        />
                                        {errors.cnpj && (
                                            <p className="mt-1 text-xs text-rose-500">{errors.cnpj.message}</p>
                                        )}
                                    </div>

                                    {/* Descrição */}
                                    <div>
                                        <label className="text-xs font-medium text-slate-600 block mb-2">
                                            {t('description')}
                                        </label>
                                        <textarea
                                            {...register('description')}
                                            placeholder={t('descriptionPlaceholder')}
                                            rows={4}
                                            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors resize-none"
                                        />
                                        <div className="flex justify-between items-center mt-1">
                                            {errors.description && (
                                                <p className="text-xs text-rose-500">{errors.description.message}</p>
                                            )}
                                            <span className="text-xs text-slate-400 ml-auto">
                                                {watch('description')?.length || 0}/2000
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contato */}
                    <div className="bg-white border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#C2410C]/10">
                                    <Phone className="h-5 w-5 text-[#C2410C]" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-[#121212]">{t('contact')}</h2>
                                    <p className="text-xs text-slate-500">Informações de contato da empresa</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2">
                                    <label className="text-xs font-medium text-slate-600 block mb-2">
                                        {t('email')}
                                    </label>
                                    <input
                                        {...register('contactEmail')}
                                        type="email"
                                        placeholder="empresa@exemplo.com"
                                        className={cn(
                                            'w-full px-3 py-2.5 bg-slate-50 border focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                                            errors.contactEmail ? 'border-rose-500' : 'border-slate-200'
                                        )}
                                    />
                                    {errors.contactEmail && (
                                        <p className="mt-1 text-xs text-rose-500">{errors.contactEmail.message}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-600 block mb-2">
                                        {t('phone')}
                                    </label>
                                    <Controller
                                        name="contactPhone"
                                        control={control}
                                        render={({ field }) => (
                                            <PhoneInput
                                                {...field}
                                                value={field.value || ''}
                                                onChange={(val) => field.onChange(val)}
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                            />
                                        )}
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-slate-600 block mb-2">
                                        WhatsApp
                                    </label>
                                    <Controller
                                        name="whatsapp"
                                        control={control}
                                        render={({ field }) => (
                                            <PhoneInput
                                                {...field}
                                                value={field.value || ''}
                                                onChange={(val) => field.onChange(val)}
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                            />
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>


                    {/* Redes Sociais */}
                    <div className="bg-white border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#C2410C]/10">
                                    <Globe className="h-5 w-5 text-[#C2410C]" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-[#121212]">Redes Sociais</h2>
                                    <p className="text-xs text-slate-500">Conecte suas redes sociais (máx. 5)</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => append({ name: '', url: '' })}
                                disabled={fields.length >= 5}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                    fields.length >= 5
                                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                                        : "bg-[#C2410C]/10 text-[#C2410C] hover:bg-[#C2410C]/20"
                                )}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Adicionar
                            </button>
                        </div>
                        <div className="p-6">
                            {fields.length === 0 ? (
                                <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                    Nenhuma rede social adicionada
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {fields.map((field, index) => {
                                        // Watch values to update icon dynamically
                                        const currentUrl = watch(`socialLinks.${index}.url`);
                                        const currentName = watch(`socialLinks.${index}.name`);

                                        return (
                                            <div key={field.id} className="group relative grid grid-cols-1 md:grid-cols-[200px_1fr_auto] gap-3 items-start p-3 rounded-lg border border-slate-100 bg-slate-50 hover:border-slate-200 transition-all">
                                                <div>
                                                    <input
                                                        {...register(`socialLinks.${index}.name`)}
                                                        placeholder="Nome (ex: Instagram)"
                                                        className={cn(
                                                            "w-full px-3 py-2 bg-white border outline-none text-sm transition-colors rounded-md",
                                                            errors.socialLinks?.[index]?.name ? "border-rose-500" : "border-slate-200 focus:border-[#C2410C]"
                                                        )}
                                                    />
                                                    {errors.socialLinks?.[index]?.name && (
                                                        <p className="mt-1 text-[10px] text-rose-500">{errors.socialLinks[index]?.name?.message}</p>
                                                    )}
                                                </div>
                                                <div className="relative">
                                                    <div className="absolute left-3 top-2.5 pointer-events-none">
                                                        {getSocialIcon(currentUrl || '', currentName || '')}
                                                    </div>
                                                    <input
                                                        {...register(`socialLinks.${index}.url`)}
                                                        placeholder="URL (ex: https://instagram.com/sua-empresa)"
                                                        className={cn(
                                                            "w-full pl-9 pr-3 py-2 bg-white border outline-none text-sm transition-colors rounded-md",
                                                            errors.socialLinks?.[index]?.url ? "border-rose-500" : "border-slate-200 focus:border-[#C2410C]"
                                                        )}
                                                    />
                                                    {errors.socialLinks?.[index]?.url && (
                                                        <p className="mt-1 text-[10px] text-rose-500">{errors.socialLinks[index]?.url?.message}</p>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => remove(index)}
                                                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Endereço */}
                    <div className="bg-white border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-[#C2410C]/10">
                                    <MapPin className="h-5 w-5 text-[#C2410C]" />
                                </div>
                                <div>
                                    <h2 className="font-semibold text-[#121212]">{t('address')}</h2>
                                    <p className="text-xs text-slate-500">Localização da empresa</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <div>
                                    <label className="text-xs font-medium text-slate-600 block mb-2">
                                        {t('country')}
                                    </label>
                                    <Controller
                                        name="addressCountry"
                                        control={control}
                                        render={({ field }) => (
                                            <select
                                                {...field}
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                            >
                                                <option value="Brasil">Brasil</option>
                                                <option value="Estados Unidos">Estados Unidos</option>
                                                <option value="Itália">Itália</option>
                                                <option value="China">China</option>
                                                <option value="Índia">Índia</option>
                                                <option value="Turquia">Turquia</option>
                                                <option value="Espanha">Espanha</option>
                                                <option value="Portugal">Portugal</option>
                                                <option value="México">México</option>
                                                <option value="Canadá">Canadá</option>
                                                <option value="Emirados Árabes Unidos">Emirados Árabes Unidos</option>
                                                <option value="Arábia Saudita">Arábia Saudita</option>
                                                <option value="Catar">Catar</option>
                                                <option value="Kuwait">Kuwait</option>
                                                <option value="Outro">Outro</option>
                                            </select>
                                        )}
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <label className="text-xs font-medium text-slate-600 block mb-2">
                                        {t('zipCode')}
                                    </label>
                                    <Controller
                                        name="addressZipCode"
                                        control={control}
                                        render={({ field }) => (
                                            watchedCountry === 'Brasil' ? (
                                                <CEPInput
                                                    {...field}
                                                    value={field.value || ''}
                                                    onChange={(val) => field.onChange(val)}
                                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                                />
                                            ) : (
                                                <input
                                                    {...field}
                                                    value={field.value || ''}
                                                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                                />
                                            )
                                        )}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {watchedCountry === 'Brasil' ? (
                                    <>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 block mb-2">
                                                {t('state')}
                                            </label>
                                            <Controller
                                                name="addressState"
                                                control={control}
                                                render={({ field }) => (
                                                    <select
                                                        {...field}
                                                        onChange={(e) => {
                                                            field.onChange(e);
                                                            setValue('addressCity', '');
                                                        }}
                                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {stateOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            />
                                        </div>

                                        <div>
                                            <label className="text-xs font-medium text-slate-600 block mb-2">
                                                {t('city')}
                                            </label>
                                            <Controller
                                                name="addressCity"
                                                control={control}
                                                render={({ field }) => (
                                                    <select
                                                        {...field}
                                                        disabled={!watchedState}
                                                        className={cn(
                                                            'w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors',
                                                            !watchedState && 'opacity-50 cursor-not-allowed'
                                                        )}
                                                    >
                                                        <option value="">Selecione...</option>
                                                        {cityOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 block mb-2">
                                                {t('state')}
                                            </label>
                                            <input
                                                {...register('addressState')}
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium text-slate-600 block mb-2">
                                                {t('city')}
                                            </label>
                                            <input
                                                {...register('addressCity')}
                                                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-[1fr_auto] gap-5">
                                <div>
                                    <label className="text-xs font-medium text-slate-600 block mb-2">
                                        {t('street')}
                                    </label>
                                    <input
                                        {...register('addressStreet')}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                    />
                                </div>
                                <div className="w-32">
                                    <label className="text-xs font-medium text-slate-600 block mb-2">
                                        {t('number')}
                                    </label>
                                    <input
                                        {...register('addressNumber')}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 focus:border-[#C2410C] focus:bg-white outline-none text-sm transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 sticky bottom-6 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200/50 mx-6 mb-6">
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="px-6 py-3 text-slate-600 hover:text-[#121212] text-sm font-medium transition-colors border border-slate-200 hover:border-slate-300"
                        >
                            {tCommon('cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={!hasChanges || isUploading || updateConfig.isPending}
                            className={cn(
                                'flex items-center gap-2 px-6 py-3 text-white text-sm font-medium transition-all',
                                (!hasChanges || isUploading || updateConfig.isPending) ? 'bg-slate-300 cursor-not-allowed' : 'bg-[#C2410C] hover:bg-[#a03609]'
                            )}
                        >
                            {(isUploading || updateConfig.isPending) ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    {tCommon('loading')}
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    {tCommon('save')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}