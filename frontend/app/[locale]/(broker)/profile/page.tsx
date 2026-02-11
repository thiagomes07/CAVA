'use client';

import { useState, useEffect } from 'react';
import { useForm, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { User, Lock, Save, CheckCircle, Eye, EyeOff, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/masked-input';
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
  whatsapp: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, '')),
      'WhatsApp inválido'
    ),
  preferredCurrency: z.enum(['BRL', 'USD']),
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

function checkPasswordRequirements(password: string) {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs ${met ? 'text-green-600' : 'text-slate-400'}`}>
      {met ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
      <span>{label}</span>
    </div>
  );
}

function PasswordRequirementsIndicator({ password, confirmPassword, t }: { password: string; confirmPassword: string; t: (key: string) => string }) {
  if (!password) return null;
  const requirements = checkPasswordRequirements(password);
  const allMet = requirements.minLength && requirements.hasUppercase && requirements.hasNumber;
  const passwordsMatch = password.length > 0 && confirmPassword.length > 0 && password === confirmPassword;
  const isStrong = allMet && passwordsMatch;

  return (
    <div className="bg-slate-50 rounded-lg p-4 space-y-2 mb-4 transition-all animate-in fade-in slide-in-from-top-2">
      <p className="text-xs font-medium text-slate-600 mb-2">{t('passwordRequirements')}</p>
      <RequirementItem met={requirements.minLength} label={t('passwordMinLengthReq')} />
      <RequirementItem met={requirements.hasUppercase} label={t('passwordUppercaseReq')} />
      <RequirementItem met={requirements.hasNumber} label={t('passwordNumberReq')} />
      {confirmPassword.length > 0 && (
        <RequirementItem met={passwordsMatch} label={t('passwordMatchReq')} />
      )}
      {isStrong && (
        <div className="flex items-center gap-2 text-green-600 pt-2 border-t border-slate-200 mt-2">
          <CheckCircle className="w-4 h-4" />
          <span className="text-xs font-medium">{t('passwordStrong')}</span>
        </div>
      )}
    </div>
  );
}

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export default function ProfilePage() {
  const { success, error } = useToast();

  const t = useTranslations('profile');
  const tValidation = useTranslations('validation');

  const { user: authUser, setUser } = useAuthStore();

  const [profile, setProfile] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form para perfil
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
    control: profileControl,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      preferredCurrency: 'BRL',
    },
  });

  const { field: phoneField } = useController({
    name: 'phone',
    control: profileControl,
    defaultValue: ''
  });

  const { field: whatsappField } = useController({
    name: 'whatsapp',
    control: profileControl,
    defaultValue: ''
  });

  // Form para senha
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
    watch: watchPassword,
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const watchedNewPassword = watchPassword('newPassword') || '';
  const watchedConfirmNewPassword = watchPassword('confirmNewPassword') || '';

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const data = await apiClient.get<UserType>('/profile');
      setProfile(data);
      resetProfile({
        name: data.name,
        phone: data.phone ? formatPhoneInput(data.phone) : '',
        whatsapp: data.whatsapp ? formatPhoneInput(data.whatsapp) : '',
        preferredCurrency: data.preferredCurrency || 'BRL',
      });
    } catch {
      error(t('loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const onUpdateProfile = async (data: UpdateProfileInput) => {
    try {
      setIsUpdatingProfile(true);

      // Note: Backend ignores 'whatsapp' if not supported, but we send it.
      const updatedUser = await apiClient.patch<UserType>('/profile', {
        name: data.name,
        phone: sanitizePhone(data.phone) || null,
        whatsapp: sanitizePhone(data.whatsapp) || null,
        preferredCurrency: data.preferredCurrency,
      });

      setProfile(updatedUser);

      // Atualizar store de autenticação
      if (authUser) {
        setUser({
          ...authUser,
          name: updatedUser.name,
          phone: updatedUser.phone,
          preferredCurrency: updatedUser.preferredCurrency,
        });
      }

      success(t('profileUpdated'));
    } catch (err) {
      if (err instanceof ApiError && err.code === 'VALIDATION_ERROR' && err.message) {
        error(err.message);
      } else {
        error(t('profileUpdateError'));
      }
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
      <div className="page-header">
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
      <div className="px-8 py-8 max-w-3xl mx-auto">
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

                <PhoneInput
                  value={phoneField.value || ''}
                  onChange={(value) => phoneField.onChange(value)}
                  label={t('phone')}
                  placeholder="(11) 98765-4321"
                  error={profileErrors.phone?.message}
                  disabled={isUpdatingProfile}
                />

                <PhoneInput
                  value={whatsappField.value || ''}
                  onChange={(value) => whatsappField.onChange(value)}
                  label="WhatsApp"
                  placeholder="(11) 98765-4321"
                  error={profileErrors.whatsapp?.message}
                  disabled={isUpdatingProfile}
                />

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Moeda preferida
                  </label>
                  <select
                    {...registerProfile('preferredCurrency')}
                    disabled={isUpdatingProfile}
                    className="w-full h-10 px-3 bg-white border border-slate-200 focus:border-slate-400 focus:outline-none text-sm"
                  >
                    <option value="BRL">Real (BRL)</option>
                    <option value="USD">Dollar (USD)</option>
                  </select>
                  {profileErrors.preferredCurrency && (
                    <p className="mt-1 text-xs text-rose-500">{profileErrors.preferredCurrency.message}</p>
                  )}
                </div>

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
                <div className="relative">
                  <Input
                    {...registerPassword('currentPassword')}
                    type={showCurrentPassword ? 'text' : 'password'}
                    label={t('currentPassword')}
                    placeholder="••••••••"
                    error={passwordErrors.currentPassword?.message}
                    disabled={isChangingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    {...registerPassword('newPassword')}
                    type={showNewPassword ? 'text' : 'password'}
                    label={t('newPassword')}
                    placeholder="••••••••"
                    error={passwordErrors.newPassword?.message}
                    disabled={isChangingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    {...registerPassword('confirmNewPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    label={t('confirmNewPassword')}
                    placeholder="••••••••"
                    error={passwordErrors.confirmNewPassword?.message}
                    disabled={isChangingPassword}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <PasswordRequirementsIndicator
                  password={watchedNewPassword}
                  confirmPassword={watchedConfirmNewPassword}
                  t={tValidation}
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
        </div>
      </div>
    </div>
  );
}
