'use client';

import { useState, useRef, useEffect, useTransition, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import type { Locale } from '@/i18n/routing';

// Helper function to set locale cookie - defined outside component to satisfy React compiler
const setLocaleCookie = (locale: Locale) => {
  if (typeof document !== 'undefined') {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=31536000; SameSite=Lax`;
  }
};

const locales: { code: Locale; name: string; flag: string }[] = [
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

interface LanguageSwitcherProps {
  variant?: 'sidebar' | 'dropdown';
  collapsed?: boolean;
}

export function LanguageSwitcher({ variant = 'dropdown', collapsed = false }: LanguageSwitcherProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations('language');
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLocale = locales.find((l) => l.code === locale) || locales[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleLocaleChange = useCallback((newLocale: Locale) => {
    // Set cookie for persistence using helper function
    setLocaleCookie(newLocale);
    
    startTransition(() => {
      router.replace(pathname, { locale: newLocale });
    });
    
    setIsOpen(false);
  }, [pathname, router, startTransition]);

  if (variant === 'sidebar') {
    return (
      <div ref={dropdownRef} className="relative">
        {/* Dropdown Menu - appears above button */}
        {isOpen && (
          <div
            className={cn(
              'absolute bottom-full left-0 right-0 mb-2 rounded-sm',
              'bg-white shadow-premium-lg border border-slate-200',
              'animate-in fade-in-0 slide-in-from-bottom-2 duration-150',
              'py-1 z-50'
            )}
          >
            {locales.map((loc) => (
              <button
                key={loc.code}
                onClick={() => handleLocaleChange(loc.code)}
                disabled={isPending}
                className={cn(
                  'w-full px-4 py-3 text-left text-sm transition-colors duration-150',
                  'flex items-center gap-3 cursor-pointer',
                  'hover:bg-slate-50 focus:bg-slate-50 focus:outline-none',
                  locale === loc.code ? 'text-obsidian font-medium' : 'text-slate-700',
                  isPending && 'opacity-50 cursor-wait'
                )}
              >
                <span className="text-lg">{loc.flag}</span>
                <span className="flex-1">{loc.name}</span>
                {locale === loc.code && (
                  <Check className="w-4 h-4 text-emerald-600" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isPending}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-3 rounded-sm transition-colors duration-200',
            'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20',
            'text-porcelain/80 hover:text-porcelain',
            collapsed && 'justify-center',
            isPending && 'opacity-50 cursor-wait'
          )}
          aria-label={t('select')}
        >
          <Globe className="w-5 h-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 text-left text-sm">
                {currentLocale.flag} {currentLocale.name}
              </span>
              <ChevronDown
                className={cn(
                  'w-4 h-4 transition-transform duration-200',
                  isOpen && 'rotate-180'
                )}
              />
            </>
          )}
        </button>
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-2 rounded-sm',
          'border border-slate-200 bg-white text-slate-700',
          'hover:bg-slate-50 transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
          isPending && 'opacity-50 cursor-wait'
        )}
        aria-label={t('select')}
      >
        <span className="text-lg">{currentLocale.flag}</span>
        <span className="text-sm font-medium">{currentLocale.code.toUpperCase()}</span>
        <ChevronDown
          className={cn(
            'w-4 h-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute right-0 mt-2 min-w-[180px] rounded-sm',
            'bg-white shadow-premium-lg border border-slate-200',
            'animate-in fade-in-0 zoom-in-95 duration-100',
            'py-1 z-50'
          )}
        >
          {locales.map((loc) => (
            <button
              key={loc.code}
              onClick={() => handleLocaleChange(loc.code)}
              disabled={isPending}
              className={cn(
                'w-full px-4 py-2 text-left text-sm transition-colors duration-150',
                'flex items-center gap-3 cursor-pointer',
                'hover:bg-slate-50 focus:bg-slate-50 focus:outline-none',
                locale === loc.code ? 'text-obsidian font-medium' : 'text-slate-700',
                isPending && 'opacity-50 cursor-wait'
              )}
            >
              <span className="text-lg">{loc.flag}</span>
              <span className="flex-1">{loc.name}</span>
              {locale === loc.code && (
                <Check className="w-4 h-4 text-emerald-600" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
