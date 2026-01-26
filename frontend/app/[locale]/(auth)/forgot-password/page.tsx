'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, KeyRound, CheckCircle } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { useToast } from '@/lib/hooks/useToast';
import { useForgotPassword, useResetPassword } from '@/lib/api/mutations/useAuthMutations';
import Link from 'next/link';

// Schemas
const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

const resetPasswordSchema = z.object({
  code: z.string().length(6, 'Código deve ter 6 dígitos'),
  newPassword: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmPassword: z.string().min(8, 'Confirme a senha'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

type Step = 'email' | 'code' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('auth');

  // Get email from query params (passed from login page)
  const initialEmail = searchParams.get('email') || '';
  const initialCode = searchParams.get('code') || '';

  const [step, setStep] = useState<Step>(initialCode ? 'code' : 'email');
  const [email, setEmail] = useState(initialEmail);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { success, error } = useToast();
  const forgotPasswordMutation = useForgotPassword();
  const resetPasswordMutation = useResetPassword();

  // If code comes from URL, go straight to code step
  useEffect(() => {
    if (initialCode && initialEmail) {
      setStep('code');
      setEmail(initialEmail);
    }
  }, [initialCode, initialEmail]);

  const emailForm = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: initialEmail },
  });

  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { code: initialCode },
  });

  const onSubmitEmail = async (data: ForgotPasswordInput) => {
    try {
      await forgotPasswordMutation.mutateAsync({ email: data.email });
      setEmail(data.email);
      setStep('code');
      success(t('codeSent', { email: data.email }));
    } catch (err) {
      // Always show success message for security (don't reveal if email exists)
      setEmail(data.email);
      setStep('code');
      success(t('codeSent', { email: data.email }));
    }
  };

  const onSubmitReset = async (data: ResetPasswordInput) => {
    try {
      await resetPasswordMutation.mutateAsync({
        email,
        code: data.code,
        newPassword: data.newPassword,
      });
      setStep('success');
      success(t('passwordResetSuccess'));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('invalidCode');
      error(message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 md:p-12 bg-mineral relative">
        {/* Language Switcher */}
        <div className="absolute top-6 right-6">
          <LanguageSwitcher variant="dropdown" />
        </div>

        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-obsidian rounded-sm" />
            <span className="font-serif text-2xl font-semibold text-obsidian">CAVA</span>
          </div>

          {/* Back to Login */}
          <Link 
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-obsidian transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('backToLogin')}
          </Link>

          {/* Step: Email Input */}
          {step === 'email' && (
            <>
              <div className="mb-8">
                <h1 className="font-serif text-4xl text-obsidian mb-2">
                  {t('forgotPasswordTitle')}
                </h1>
                <p className="text-slate-500">
                  {t('forgotPasswordSubtitle')}
                </p>
              </div>

              <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} className="space-y-6">
                <div className="relative">
                  <Input
                    {...emailForm.register('email')}
                    type="email"
                    placeholder={t('emailPlaceholder')}
                    error={emailForm.formState.errors.email?.message}
                    disabled={forgotPasswordMutation.isPending}
                    className="pl-12"
                  />
                  <Mail className="absolute left-4 top-[14px] w-5 h-5 text-slate-400" />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={forgotPasswordMutation.isPending}
                  className="w-full"
                >
                  {t('sendCode')}
                </Button>
              </form>
            </>
          )}

          {/* Step: Code + New Password */}
          {step === 'code' && (
            <>
              <div className="mb-8">
                <h1 className="font-serif text-4xl text-obsidian mb-2">
                  {t('enterCode')}
                </h1>
                <p className="text-slate-500">
                  {t('codeSent', { email })}
                </p>
              </div>

              <form onSubmit={resetForm.handleSubmit(onSubmitReset)} className="space-y-6">
                {/* Code Input */}
                <div className="relative">
                  <Input
                    {...resetForm.register('code')}
                    type="text"
                    placeholder={t('codePlaceholder')}
                    error={resetForm.formState.errors.code?.message}
                    disabled={resetPasswordMutation.isPending}
                    className="pl-12 text-center text-2xl tracking-[0.5em] font-mono"
                    maxLength={6}
                  />
                  <KeyRound className="absolute left-4 top-[14px] w-5 h-5 text-slate-400" />
                </div>

                {/* New Password */}
                <div className="relative">
                  <Input
                    {...resetForm.register('newPassword')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('newPasswordLabel')}
                    error={resetForm.formState.errors.newPassword?.message}
                    disabled={resetPasswordMutation.isPending}
                    className="pl-12 pr-12"
                  />
                  <Lock className="absolute left-4 top-[14px] w-5 h-5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[14px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {/* Confirm Password */}
                <div className="relative">
                  <Input
                    {...resetForm.register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder={t('confirmNewPasswordLabel')}
                    error={resetForm.formState.errors.confirmPassword?.message}
                    disabled={resetPasswordMutation.isPending}
                    className="pl-12 pr-12"
                  />
                  <Lock className="absolute left-4 top-[14px] w-5 h-5 text-slate-400" />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-[14px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={resetPasswordMutation.isPending}
                  className="w-full"
                >
                  {t('resetPassword')}
                </Button>

                {/* Resend code link */}
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="text-sm text-slate-500 hover:text-obsidian transition-colors"
                  >
                    {t('sendNewCode')}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="font-serif text-3xl text-obsidian mb-4">
                {t('passwordResetSuccess')}
              </h1>
              <p className="text-slate-500 mb-8">
                {t('passwordResetSuccessDescription')}
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={() => router.push('/login')}
                className="w-full"
              >
                {t('login')}
              </Button>
            </div>
          )}

          {/* Footer */}
          <p className="text-xs text-slate-400 text-center mt-8">
            {t('termsNotice')}
          </p>
        </div>
      </div>

      {/* Right Side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative min-h-screen">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="relative z-10 flex items-center justify-center w-full p-12 text-center">
          <div className="max-w-lg">
            <h2 className="font-serif text-5xl text-porcelain mb-6 leading-tight">
              {t('heroTitle')}
            </h2>
            <p className="text-lg text-porcelain/80 leading-relaxed">
              {t('heroSubtitle')}
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-porcelain/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-porcelain/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}
