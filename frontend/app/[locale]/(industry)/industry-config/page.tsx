'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Loader2, Building2, MapPin, Phone, Info, Globe } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { PhoneInput, CNPJInput, CEPInput } from '@/components/ui/masked-input';
import { ImageUploadWithCrop } from '@/components/ui/ImageUploadWithCrop';
import { useIndustryConfig, useUpdateIndustryConfig, useUploadIndustryLogo, useDeleteIndustryLogo } from '@/lib/api/queries/industryApi';
import { ESTADOS_BRASIL, CIDADES_POR_ESTADO } from '@/lib/utils/brazil-locations';
import { cn } from '@/lib/utils/cn';

const formSchema = z.object({
    name: z.string().min(2, 'Nome muito curto'),
    cnpj: z.string().min(1, 'CNPJ/identificação é obrigatória'),
    contactEmail: z.string().email('Email inválido'),
    contactPhone: z.string().optional(),
    whatsapp: z.string().optional(),
    description: z.string().max(2000, 'Máximo 2000 caracteres').optional(),
    addressCountry: z.string().optional(),
    addressState: z.string().optional(),
    addressCity: z.string().optional(),
    addressStreet: z.string().optional(),
    addressNumber: z.string().optional(),
    addressZipCode: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

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

    const { control, handleSubmit, watch, setValue, reset, register, formState: { errors } } = form;

    const watchedCountry = watch('addressCountry');
    const watchedState = watch('addressState');

    // Load data
    useEffect(() => {
        if (industry) {
            reset({
                name: industry.name,
                cnpj: industry.cnpj || '',
                contactEmail: industry.contactEmail,
                contactPhone: industry.contactPhone || '',
                whatsapp: industry.whatsapp || '',
                description: industry.description || '',
                addressCountry: industry.addressCountry || 'Brasil',
                addressState: industry.addressState || '',
                addressCity: industry.addressCity || '',
                addressStreet: industry.addressStreet || '',
                addressNumber: industry.addressNumber || '',
                addressZipCode: industry.addressZipCode || '',
            });

            if (industry.logoUrl) {
                setPreviewLogoUrl(industry.logoUrl);
            }
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

            // Refetch or invalidation is handled by mutation hook ideally, 
            // but we reset local state to clean up
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
        <div className="container mx-auto max-w-5xl py-8 space-y-8">
            <div className="space-y-1">
                <h1 className="text-3xl font-serif font-bold text-obsidian">{t('title')}</h1>
                <p className="text-slate-600">{t('subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                {/* Identidade */}
                <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-gold-500/10">
                                <Building2 className="h-5 w-5 text-gold-600" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">{t('identity')}</CardTitle>
                                <CardDescription className="text-sm">{t('identityDesc')}</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
                            {/* Logo Upload Section */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">{t('logo')}</Label>
                                <ImageUploadWithCrop
                                    previewUrl={previewLogoUrl}
                                    onChange={handleLogoChange}
                                    onRemove={handleLogoRemove}
                                    isUploading={isUploading}
                                    aspectRatio={1}
                                    maxSizeInMB={2}
                                    className="w-full"
                                />
                                <p className="text-xs text-slate-500">
                                    Formato quadrado recomendado. Máx: 2MB
                                </p>
                            </div>

                            {/* Form Fields */}
                            <div className="space-y-5">
                                {/* Nome da Empresa */}
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium">
                                        {t('companyName')}

                                    </Label>
                                    <Input
                                        id="name"
                                        {...register('name')}
                                        placeholder={t('companyName')}
                                        className="h-11"
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            {errors.name.message}
                                        </p>
                                    )}
                                </div>

                                {/* CNPJ with Toggle */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="cnpj" className="text-sm font-medium">
                                            {useCNPJMask ? 'CNPJ' : t('businessId')}

                                        </Label>
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
                                                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                                                    useCNPJMask
                                                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                                )}
                                            >
                                                <Globe className="h-3.5 w-3.5" />
                                                {useCNPJMask ? 'BR' : 'Internacional'}
                                            </button>
                                        </div>
                                    </div>

                                    {showCNPJInfo && (
                                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                                            <p>
                                                Para empresas brasileiras, use o modo BR com máscara de CNPJ.
                                                Para empresas estrangeiras, alterne para modo Internacional e insira
                                                o número de identificação empresarial do seu país.
                                            </p>
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
                                                    className="h-11"
                                                />
                                            ) : (
                                                <Input
                                                    {...field}
                                                    value={field.value || ''}
                                                    placeholder="Ex: 123456789"
                                                    className="h-11"
                                                />
                                            )
                                        )}
                                    />
                                    {errors.cnpj && (
                                        <p className="text-xs text-red-500">{errors.cnpj.message}</p>
                                    )}
                                </div>

                                {/* Descrição */}
                                <div className="space-y-2">
                                    <Label htmlFor="description" className="text-sm font-medium">
                                        {t('description')}
                                    </Label>
                                    <Textarea
                                        id="description"
                                        {...register('description')}
                                        placeholder={t('descriptionPlaceholder')}
                                        className="h-28 resize-none"
                                    />
                                    <div className="flex justify-between items-center">
                                        {errors.description && (
                                            <p className="text-xs text-red-500">{errors.description.message}</p>
                                        )}
                                        <span className="text-xs text-slate-400 ml-auto">
                                            {watch('description')?.length || 0}/2000
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Contato */}
                <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-gold-500/10">
                                <Phone className="h-5 w-5 text-gold-600" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">{t('contact')}</CardTitle>
                                <CardDescription className="text-sm">
                                    Informações de contato da empresa
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    {t('email')}

                                </Label>
                                <Input
                                    id="email"
                                    {...register('contactEmail')}
                                    type="email"
                                    placeholder="empresa@exemplo.com"
                                    className="h-11"
                                />
                                {errors.contactEmail && (
                                    <p className="text-xs text-red-500">{errors.contactEmail.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-medium">
                                    {t('phone')}
                                </Label>
                                <Controller
                                    name="contactPhone"
                                    control={control}
                                    render={({ field }) => (
                                        <PhoneInput
                                            {...field}
                                            value={field.value || ''}
                                            onChange={(val) => field.onChange(val)}
                                            className="h-11"
                                        />
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="whatsapp" className="text-sm font-medium">
                                    WhatsApp
                                </Label>
                                <Controller
                                    name="whatsapp"
                                    control={control}
                                    render={({ field }) => (
                                        <PhoneInput
                                            {...field}
                                            value={field.value || ''}
                                            onChange={(val) => field.onChange(val)}
                                            className="h-11"
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Endereço */}
                <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-gold-500/10">
                                <MapPin className="h-5 w-5 text-gold-600" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">{t('address')}</CardTitle>
                                <CardDescription className="text-sm">
                                    Localização da empresa
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('country')}</Label>
                                <Controller
                                    name="addressCountry"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            {...field}
                                            options={[
                                                { value: 'Brasil', label: 'Brasil' },
                                                { value: 'Estados Unidos', label: 'Estados Unidos' },
                                                { value: 'Outro', label: 'Outro' }
                                            ]}
                                        />
                                    )}
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-sm font-medium">{t('zipCode')}</Label>
                                <Controller
                                    name="addressZipCode"
                                    control={control}
                                    render={({ field }) => (
                                        watchedCountry === 'Brasil' ? (
                                            <CEPInput
                                                {...field}
                                                value={field.value || ''}
                                                onChange={(val) => field.onChange(val)}
                                                className="h-11"
                                            />
                                        ) : (
                                            <Input
                                                {...field}
                                                value={field.value || ''}
                                                className="h-11"
                                            />
                                        )
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {watchedCountry === 'Brasil' ? (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">{t('state')}</Label>
                                        <Controller
                                            name="addressState"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    {...field}
                                                    options={stateOptions}
                                                    onChange={(e) => {
                                                        field.onChange(e);
                                                        setValue('addressCity', '');
                                                    }}
                                                />
                                            )}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">{t('city')}</Label>
                                        <Controller
                                            name="addressCity"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    {...field}
                                                    options={cityOptions}
                                                    disabled={!watchedState}
                                                />
                                            )}
                                        />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">{t('state')}</Label>
                                        <Input {...register('addressState')} className="h-11" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">{t('city')}</Label>
                                        <Input {...register('addressCity')} className="h-11" />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-[1fr_auto] gap-5">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('street')}</Label>
                                <Input {...register('addressStreet')} className="h-11" />
                            </div>
                            <div className="space-y-2 w-32">
                                <Label className="text-sm font-medium">{t('number')}</Label>
                                <Input {...register('addressNumber')} className="h-11" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 sticky bottom-6 bg-white/95 backdrop-blur-md p-4 rounded-xl shadow-xl border border-slate-200/50">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => reset()}
                        className="min-w-[100px]"
                    >
                        {tCommon('cancel')}
                    </Button>
                    <Button
                        type="submit"
                        disabled={isUploading || updateConfig.isPending}
                        className="min-w-[120px]"
                    >
                        {isUploading || updateConfig.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {tCommon('loading')}
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {tCommon('save')}
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}