'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/lib/hooks/useToast';
import { loginSchema, type LoginInput } from '@/lib/schemas/auth.schema';
import { useAuth } from '@/lib/hooks/useAuth';

import { toCanonicalPath } from '@/lib/utils/routes';

function getSafeRedirectTarget(callbackUrl: string | null): string | null {
  if (!callbackUrl) return null;

  // Prevent open-redirects; only allow same-origin path
  if (!callbackUrl.startsWith('/')) return null;

  return toCanonicalPath(callbackUrl);
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getDashboardRoute } = useAuth();
  const t = useTranslations('auth');

  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((state) => state.login);
  const { success, error } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setIsLoading(true);

      await login(data.email, data.password);

      // Obter o nome do usuário do store após o login
      const user = useAuthStore.getState().user;
      const userName = user?.name?.split(' ')[0] || 'usuário';
      
      success(t('welcomeBack', { name: userName }));

      // Use callback URL if provided, otherwise use role-based dashboard
      const callbackUrl = searchParams.get('callbackUrl');
      const redirectTo = getSafeRedirectTarget(callbackUrl) || getDashboardRoute();
      router.push(redirectTo);
    } catch (err) {
      console.error('Login error:', err);
      const message = err instanceof Error ? err.message : t('invalidCredentials');
      error(message);
    } finally {
      setIsLoading(false);
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

          {/* Title */}
          <div className="mb-8">
            <h1 className="font-serif text-4xl text-obsidian mb-2">
              {t('accessAccount')}
            </h1>
            <p className="text-slate-500">
              {t('enterCredentials')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Email */}
            <div className="relative">
              <Input
                {...register('email')}
                type="email"
                placeholder={t('emailPlaceholder')}
                error={errors.email?.message}
                disabled={isLoading}
                className="pl-12"
              />
              <Mail className="absolute left-4 top-[14px] w-5 h-5 text-slate-400" />
            </div>

            {/* Password */}
            <div className="relative">
              <Input
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                placeholder={t('passwordPlaceholder')}
                error={errors.password?.message}
                disabled={isLoading}
                className="pl-12 pr-12"
              />
              <Lock className="absolute left-4 top-[14px] w-5 h-5 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-[14px] text-slate-400 hover:text-slate-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-obsidian transition-colors"
              >
                {t('forgotPassword')}
              </button>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isLoading}
              className="w-full"
            >
              {t('login')}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-xs text-slate-400 text-center mt-8">
            {t('termsNotice')}
          </p>
        </div>
      </div>

      {/* Right Side - Hero Image */}
      <div className="hidden lg:flex lg:w-1/2 relative min-h-screen">
        {/* Placeholder for hero image */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-800" />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center w-full p-12 text-center">
          <div className="max-w-lg">
            <h2 className="font-serif text-5xl text-porcelain mb-6 clienteing-tight">
              {t('heroTitle')}
            </h2>
            <p className="text-lg text-porcelain/80 clienteing-relaxed">
              {t('heroSubtitle')}
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-porcelain/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-porcelain/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}