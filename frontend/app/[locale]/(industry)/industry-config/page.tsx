'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Loader2, Building2, MapPin, Phone } from 'lucide-react';
import { useToast } from '@/lib/hooks/useToast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { PhoneInput, CNPJInput, CEPInput } from '@/components/ui/masked-input';
import { PhotoUpload, type MediaFile } from '@/components/ui/photo-upload';
import { useIndustryConfig, useUpdateIndustryConfig, useUploadIndustryLogo, useDeleteIndustryLogo } from '@/lib/api/queries/industryApi';
import { ESTADOS_BRASIL, CIDADES_POR_ESTADO } from '@/lib/utils/brazil-locations';
import { cn } from '@/lib/utils/cn';

const formSchema = z.object({
    name: z.string().min(2, 'Nome muito curto'),
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

    const [logoFiles, setLogoFiles] = useState<MediaFile[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            contactEmail: '',
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
                setLogoFiles([{
                    id: 'current-logo',
                    url: industry.logoUrl,
                    isNew: false,
                }]);
            } else {
                setLogoFiles([]);
            }
        }
    }, [industry, reset]);

    const onSubmit = async (data: FormValues) => {
        try {
            // Prepare payload
            const payload: any = { ...data };

            // We'll upload on submit to be safe and atomic-ish.
            if (logoFiles.length > 0 && logoFiles[0].isNew && logoFiles[0].file) {
                setIsUploading(true);
                try {
                    const url = await uploadLogo.mutateAsync(logoFiles[0].file);
                    payload.logoUrl = url;
                } finally {
                    setIsUploading(false);
                }
            } else if (logoFiles.length === 0 && industry?.logoUrl) {
                // Removed
                payload.logoUrl = '';
            }

            await updateConfig.mutateAsync(payload);
            success(t('success'));
            // Reset logic handled by react-query invalidation reloading data

        } catch (err) {
            console.error(err);
            showError(t('error'));
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
        <div className="container mx-auto max-w-4xl py-8 space-y-8">
            <div>
                <h1 className="text-3xl font-serif font-bold text-obsidian">{t('title')}</h1>
                <p className="text-slate-500 mt-2">{t('subtitle')}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

                {/* Identidade Visual */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-gold-500" />
                            <CardTitle>{t('visualIdentity')}</CardTitle>
                        </div>
                        <CardDescription>{t('visualIdentityDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <Label>{t('logo')}</Label>
                            <PhotoUpload
                                value={logoFiles}
                                onChange={setLogoFiles}
                                maxFiles={1}
                                maxSizeInMB={2}
                                acceptedTypes={['image/jpeg', 'image/png', 'image/webp']}
                                className="w-full sm:w-1/3"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Read Only Fields */}
                            <div className="space-y-2">
                                <Label>{t('companyName')}</Label>
                                <Input {...register('name')} placeholder={t('companyName')} />
                                {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label>{t('cnpj')}</Label>
                                <div className="relative">
                                    <CNPJInput
                                        value={industry?.cnpj || ''}
                                        disabled
                                        className="bg-slate-50 text-slate-500"
                                    />
                                </div>
                                <p className="text-xs text-slate-400">{t('cnpjReadOnly')}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>{t('description')}</Label>
                            <Textarea
                                {...register('description')}
                                placeholder={t('descriptionPlaceholder')}
                                className="h-24"
                            />
                            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
                        </div>
                    </CardContent>
                </Card>

                {/* Contato */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Phone className="h-5 w-5 text-gold-500" />
                            <CardTitle>{t('contact')}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{t('email')}</Label>
                            <Input {...register('contactEmail')} />
                            {errors.contactEmail && <p className="text-xs text-red-500">{errors.contactEmail.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>{t('whatsapp')}</Label>
                            <Controller
                                name="whatsapp"
                                control={control}
                                render={({ field }) => (
                                    <PhoneInput
                                        {...field}
                                        value={field.value || ''}
                                        onChange={(val) => field.onChange(val)}
                                    />
                                )}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>{t('phone')}</Label>
                            <Controller
                                name="contactPhone"
                                control={control}
                                render={({ field }) => (
                                    <PhoneInput
                                        {...field}
                                        value={field.value || ''}
                                        onChange={(val) => field.onChange(val)}
                                    />
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Endereço */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-gold-500" />
                            <CardTitle>{t('address')}</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('country')}</Label>
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

                            <div className="space-y-2">
                                <Label>{t('zipCode')}</Label>
                                <Controller
                                    name="addressZipCode"
                                    control={control}
                                    render={({ field }) => (
                                        watchedCountry === 'Brasil' ? (
                                            <CEPInput
                                                {...field}
                                                value={field.value || ''}
                                                onChange={(val) => field.onChange(val)}
                                            />
                                        ) : (
                                            <Input {...field} value={field.value || ''} />
                                        )
                                    )}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {watchedCountry === 'Brasil' ? (
                                <>
                                    <div className="space-y-2">
                                        <Label>{t('state')}</Label>
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
                                        <Label>{t('city')}</Label>
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
                                        <Label>{t('state')}</Label>
                                        <Input {...register('addressState')} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>{t('city')}</Label>
                                        <Input {...register('addressCity')} />
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="grid grid-cols-[2fr_1fr] gap-4">
                            <div className="space-y-2">
                                <Label>{t('street')}</Label>
                                <Input {...register('addressStreet')} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('number')}</Label>
                                <Input {...register('addressNumber')} />
                            </div>
                        </div>
                    </CardContent>
                </Card>



                <div className="flex justify-end gap-4 sticky bottom-6 bg-white/80 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-slate-200">
                    <Button type="button" variant="secondary" onClick={() => reset()}>{tCommon('cancel')}</Button>
                    <Button type="submit" disabled={isUploading || updateConfig.isPending}>
                        {isUploading || updateConfig.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-4 w-4" />
                        )}
                        {tCommon('save')}
                    </Button>
                </div>

            </form>
        </div>
    );
}
