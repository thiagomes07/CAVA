'use client';

import { useState, useEffect } from 'react';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { User, Lock, Save, CheckCircle, Building2, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { LoadingState } from '@/components/shared/LoadingState';
import { apiClient, ApiError } from '@/lib/api/client';
import { useToast } from '@/lib/hooks/useToast';
import { useAuthStore } from '@/store/auth.store';
import { z } from 'zod';
import formatPhoneInput, { sanitizePhone } from '@/lib/utils/formatPhoneInput';
import type { User as UserType } from '@/lib/types';

// Schema para atualização de perfil
const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .refine((v) => v.trim().length >= 2, 'Nome deve ter no mínimo 2 caracteres')
    .transform((v) => v.trim()),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, '')),
      'Telefone inválido'
    ),
});

// Schema para alteração de senha
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(1, 'Nova senha é obrigatória')
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  confirmNewPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmNewPassword'],
});

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export default function ProfilePage() {
  const { success, error } = useToast();
  const t = useTranslations('profile');

  const { user: authUser, setUser } = useAuthStore();

  const [profile, setProfile] = useState<UserType | null>(null);
  const [industry, setIndustry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingIndustry, setIsLoadingIndustry] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingIndustry, setIsUpdatingIndustry] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [industryError, setIndustryError] = useState<string | null>(null);

  // Form para perfil
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
    control: profileControl,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
  });

  const { field: phoneField } = useController({ 
    name: 'phone', 
    control: profileControl, 
    defaultValue: '' 
  });

  // Form para senha
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    fetchProfile();
    fetchIndustry();
  }, []);

  const fetchIndustry = async () => {
    try {
      setIsLoadingIndustry(true);
      setIndustryError(null);
      const data = await apiClient.get('/industry');
      setIndustry(data);
    } catch (err: any) {
      console.error('Erro ao buscar dados da indústria:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Erro ao carregar configurações do depósito';
      setIndustryError(errorMessage);
      // Ainda mostra a seção mesmo com erro, para permitir tentar novamente
      setIndustry({});
    } finally {
      setIsLoadingIndustry(false);
    }
  };

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<UserType>('/profile');
      setProfile(data);
      resetProfile({
        name: data.name,
        phone: data.phone || '',
      });
      if (data.phone) {
        phoneField.onChange(formatPhoneInput(data.phone));
      }
    } catch {
      error(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const onUpdateProfile = async (data: UpdateProfileInput) => {
    try {
      setIsUpdatingProfile(true);

      const updatedUser = await apiClient.patch<UserType>('/profile', {
        name: data.name,
        phone: sanitizePhone(data.phone) || null,
      });

      setProfile(updatedUser);
      
      // Atualizar store de autenticação
      if (authUser) {
        setUser({
          ...authUser,
          name: updatedUser.name,
          phone: updatedUser.phone,
        });
      }

      success(t('profileUpdated'));
    } catch {
      error(t('profileUpdateError'));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const onChangePassword = async (data: ChangePasswordInput) => {
    try {
      setIsChangingPassword(true);

      await apiClient.patch('/profile/password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      resetPassword();
      setPasswordChanged(true);
      success(t('passwordChanged'));
      
      // Resetar flag após 3 segundos
      setTimeout(() => setPasswordChanged(false), 3000);
    } catch (err) {
      if (err instanceof ApiError && err.code === 'UNAUTHORIZED') {
        error(t('incorrectPassword'));
      } else {
        error(t('passwordChangeError'));
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-mineral p-8">
        <LoadingState variant="form" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mineral">
      {/* Header */}
      <div className="bg-porcelain border-b border-slate-100 px-8 py-6">
        <div>
          <h1 className="font-serif text-3xl text-obsidian mb-2">
            {t('title')}
          </h1>
          <p className="text-sm text-slate-500">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-8 max-w-3xl">
        <div className="space-y-8">
          {/* Informações Pessoais */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-full">
                  <User className="w-5 h-5 text-obsidian" />
                </div>
                <div>
                  <CardTitle>{t('personalInfo')}</CardTitle>
                  <CardDescription>{t('personalInfoDescription')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleProfileSubmit(onUpdateProfile)} className="space-y-6">
                <Input
                  {...registerProfile('name')}
                  label={t('name')}
                  placeholder="Seu nome completo"
                  error={profileErrors.name?.message}
                  disabled={isUpdatingProfile}
                />

                <Input
                  value={profile?.email || ''}
                  label={t('email')}
                  disabled
                  helperText="O email não pode ser alterado"
                />

                <Input
                  value={phoneField.value}
                  onChange={(e) => phoneField.onChange(formatPhoneInput(e.target.value))}
                  label={t('phone')}
                  placeholder="(11) 98765-4321"
                  error={profileErrors.phone?.message}
                  disabled={isUpdatingProfile}
                />

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isUpdatingProfile}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {t('saveChanges')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Segurança */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-full">
                  <Lock className="w-5 h-5 text-obsidian" />
                </div>
                <div>
                  <CardTitle>{t('security')}</CardTitle>
                  <CardDescription>{t('securityDescription')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-6">
                <Input
                  {...registerPassword('currentPassword')}
                  type="password"
                  label={t('currentPassword')}
                  placeholder="••••••••"
                  error={passwordErrors.currentPassword?.message}
                  disabled={isChangingPassword}
                />

                <Input
                  {...registerPassword('newPassword')}
                  type="password"
                  label={t('newPassword')}
                  placeholder="••••••••"
                  helperText="Mínimo 8 caracteres, 1 maiúscula e 1 número"
                  error={passwordErrors.newPassword?.message}
                  disabled={isChangingPassword}
                />

                <Input
                  {...registerPassword('confirmNewPassword')}
                  type="password"
                  label={t('confirmNewPassword')}
                  placeholder="••••••••"
                  error={passwordErrors.confirmNewPassword?.message}
                  disabled={isChangingPassword}
                />

                <div className="flex justify-end items-center gap-4">
                  {passwordChanged && (
                    <span className="flex items-center gap-2 text-emerald-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      {t('passwordChanged')}
                    </span>
                  )}
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isChangingPassword}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    {t('changePassword')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Configurações do Depósito */}
          <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-full">
                    <Building2 className="w-5 h-5 text-obsidian" />
                  </div>
                  <div>
                    <CardTitle>Configurações do Depósito</CardTitle>
                    <CardDescription>Configure como seu depósito aparece no catálogo público</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingIndustry ? (
                  <LoadingState variant="form" rows={5} />
                ) : industryError ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm">
                    <p className="text-sm text-amber-800 mb-2">{industryError}</p>
                    <Button
                      variant="secondary"
                      onClick={fetchIndustry}
                      size="sm"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      setIsUpdatingIndustry(true);
                      const formData = new FormData(e.currentTarget);
                      const updated = await apiClient.patch('/industry', {
                        name: formData.get('name') || null,
                        city: formData.get('city') || null,
                        state: formData.get('state') || null,
                        bannerUrl: formData.get('bannerUrl') || null,
                        logoUrl: formData.get('logoUrl') || null,
                        isPublic: formData.get('isPublic') === 'on',
                      });
                      setIndustry(updated);
                      success('Configurações do depósito atualizadas');
                    } catch (err) {
                      error('Erro ao atualizar configurações');
                    } finally {
                      setIsUpdatingIndustry(false);
                    }
                  }}
                  className="space-y-6"
                >
                  <Input
                    name="name"
                    label="Nome da Indústria"
                    defaultValue={industry?.name || ''}
                    placeholder="Nome do seu depósito"
                    disabled={isUpdatingIndustry || isLoadingIndustry}
                    required
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      name="city"
                      label="Cidade"
                      defaultValue={industry?.city || ''}
                      placeholder="São Paulo"
                      disabled={isUpdatingIndustry || isLoadingIndustry}
                    />
                    <Input
                      name="state"
                      label="Estado (UF)"
                      defaultValue={industry?.state || ''}
                      placeholder="SP"
                      maxLength={2}
                      disabled={isUpdatingIndustry || isLoadingIndustry}
                    />
                  </div>

                  <Input
                    name="bannerUrl"
                    label="URL do Banner"
                    defaultValue={industry?.bannerUrl || ''}
                    placeholder="https://exemplo.com/banner.jpg"
                    type="url"
                    disabled={isUpdatingIndustry || isLoadingIndustry}
                    helperText="URL da imagem do banner (recomendado: 1200x300px)"
                  />

                  <Input
                    name="logoUrl"
                    label="URL do Logo"
                    defaultValue={industry?.logoUrl || ''}
                    placeholder="https://exemplo.com/logo.png"
                    type="url"
                    disabled={isUpdatingIndustry || isLoadingIndustry}
                    helperText="URL da imagem do logo (recomendado: 200x200px)"
                  />

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-sm">
                    <div>
                      <p className="font-medium text-obsidian">Aparecer no catálogo público</p>
                      <p className="text-sm text-slate-500">
                        Seu depósito será visível na busca pública de depósitos
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      name="isPublic"
                      defaultChecked={industry?.isPublic || false}
                      disabled={isUpdatingIndustry || isLoadingIndustry}
                      className="w-5 h-5 rounded border-slate-300"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      variant="primary"
                      loading={isUpdatingIndustry}
                      disabled={isLoadingIndustry}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Configurações
                    </Button>
                  </div>
                </form>
                )}
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
