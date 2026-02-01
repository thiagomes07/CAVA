'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  Package,
  Layers,
  Users,
  Receipt,
  Link2,
  Inbox,
  UserPlus,
  PackageOpen,
  LogOut,
  ChevronUp,
  User,
  BookOpen,
  Building2,
  X,
  UserCircle,
  Menu,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { truncateText } from '@/lib/utils/truncateText';
import { TRUNCATION_LIMITS } from '@/lib/config/truncationLimits';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { useToast } from '@/lib/hooks/useToast';
import { LanguageSwitcher } from './LanguageSwitcher';
import type { UserRole } from '@/lib/types';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  children?: MenuItem[];
}

// Menu items organized by role with proper route prefixes
const industryMenuItems: MenuItem[] = [
  {
    label: 'navigation.dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  },
  {
    label: 'navigation.catalog',
    href: '/catalog',
    icon: Package,
    roles: ['ADMIN_INDUSTRIA'],
  },
  {
    label: 'navigation.inventory',
    href: '/inventory',
    icon: Layers,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  },
  {
    label: 'navigation.sales',
    href: '/sales',
    icon: Receipt,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  },
  {
    label: 'navigation.reservations',
    href: '/reservations',
    icon: ClipboardList,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  },
  {
    label: 'navigation.bi',
    href: '/bi',
    icon: BarChart3,
    roles: ['ADMIN_INDUSTRIA'],
  },
  {
    label: 'navigation.links',
    href: '/links',
    icon: Link2,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  },
  {
    label: 'navigation.catalogos',
    href: '/catalogos',
    icon: BookOpen,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  },
  {
    label: 'navigation.clientes',
    href: '/clientes',
    icon: Inbox,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  },
  {
    label: 'navigation.brokers',
    href: '/brokers',
    icon: Users,
    roles: ['ADMIN_INDUSTRIA'],
  },
  {
    label: 'navigation.team',
    href: '/team',
    icon: UserPlus,
    roles: ['ADMIN_INDUSTRIA'],
  },
  {
    label: 'industryConfig.title',
    href: '/industry-config',
    icon: Building2,
    roles: ['ADMIN_INDUSTRIA'],
  },
];

const brokerMenuItems: MenuItem[] = [
  {
    label: 'navigation.dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['BROKER'],
  },
  {
    label: 'navigation.sharedInventory',
    href: '/shared-inventory',
    icon: PackageOpen,
    roles: ['BROKER'],
  },
  {
    label: 'navigation.reservations',
    href: '/reservations',
    icon: ClipboardList,
    roles: ['BROKER'],
  },
  {
    label: 'navigation.links',
    href: '/links',
    icon: Link2,
    roles: ['BROKER'],
  },
  {
    label: 'navigation.catalogos',
    href: '/catalogos',
    icon: BookOpen,
    roles: ['BROKER'],
  },
  {
    label: 'navigation.clientes',
    href: '/clientes',
    icon: Inbox,
    roles: ['BROKER'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { success, error: showError } = useToast();
  const t = useTranslations();
  const tAuth = useTranslations('auth');
  const tRoles = useTranslations('roles');

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close user menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setUserMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      success(tAuth('logoutSuccess'));
      router.push('/login');
    } catch {
      showError(tAuth('logoutError'));
    }
  };

  const filteredMenuItems = useMemo(() => {
    if (!user) return [];

    if (user.role === 'ADMIN_INDUSTRIA') {
      return industryMenuItems.filter((item) => item.roles.includes(user.role));
    } else if (user.role === 'VENDEDOR_INTERNO') {
      return industryMenuItems.filter((item) => item.roles.includes(user.role));
    } else if (user.role === 'BROKER') {
      return brokerMenuItems;
    }

    return [];
  }, [user]);

  const isActive = (href: string) => {
    if (href.endsWith('/dashboard')) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  if (!user) return null;

  const getRoleLabel = () => {
    if (user.role === 'ADMIN_INDUSTRIA') return tRoles('admin');
    if (user.role === 'VENDEDOR_INTERNO') return tRoles('seller');
    if (user.role === 'BROKER') return tRoles('broker');
    return '';
  };

  return (
    <>
      {/* ============================================ */}
      {/* MOBILE: Fixed Header + Full Screen Menu */}
      {/* ============================================ */}
      
      {/* Mobile Header - Fixed at top */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#121212] border-b border-white/10 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-[#C2410C] rounded-sm flex items-center justify-center shadow-lg shadow-[#C2410C]/20 rotate-3">
              <span className="text-white font-serif font-bold text-base">C</span>
            </div>
            <h1 className="text-lg font-serif font-bold tracking-tight text-white">CAVA</h1>
          </div>
          
          {/* Menu Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-400 hover:text-white transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-[#121212] lg:hidden pt-14 flex flex-col">
          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 overflow-y-auto">
            <div className="space-y-1">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center space-x-4 px-4 py-4 rounded-sm transition-all',
                      active
                        ? 'text-white bg-white/10'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    )}
                  >
                    <Icon className={cn(
                      'w-5 h-5',
                      active ? 'text-[#C2410C]' : 'text-slate-500'
                    )} />
                    <span className={cn(
                      'text-base',
                      active && 'font-semibold'
                    )}>
                      {t(item.label)}
                    </span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* Language Switcher */}
          <div className="px-4 py-3 border-t border-white/10">
            <LanguageSwitcher variant="sidebar" collapsed={false} />
          </div>

          {/* User Section */}
          <div className="px-4 py-4 border-t border-white/10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center">
                <UserCircle className="w-6 h-6 text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-bold text-white font-serif">
                  {truncateText(user.name, TRUNCATION_LIMITS.SIDEBAR_USER_NAME)}
                </p>
                <p className="text-xs text-[#C2410C] capitalize">
                  {getRoleLabel()}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/profile"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 rounded-sm text-slate-300 hover:bg-white/10 transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="text-sm">{t('navigation.profile')}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 rounded-sm text-slate-300 hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">{tAuth('logout')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Content Spacer */}
      <div className="h-14 lg:hidden" />

      {/* ============================================ */}
      {/* DESKTOP: Traditional Sidebar */}
      {/* ============================================ */}
      <aside
        className={cn(
          'hidden lg:flex lg:flex-col',
          'h-screen bg-[#121212] text-white transition-all duration-300',
          'border-r border-white/5 shrink-0',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Desktop Logo */}
        <div
          className={cn(
            'p-8 pb-10 transition-all duration-200',
            !sidebarOpen && 'p-4 pb-4'
          )}
        >
          <div className={cn(
            'flex items-center',
            sidebarOpen ? 'space-x-4' : 'justify-center'
          )}>
            <div className={cn(
              'bg-[#C2410C] rounded-sm flex items-center justify-center shadow-lg shadow-[#C2410C]/20 rotate-3 transition-transform hover:rotate-0',
              sidebarOpen ? 'w-10 h-10' : 'w-8 h-8'
            )}>
              <span className={cn(
                'text-white font-serif font-bold',
                sidebarOpen ? 'text-2xl' : 'text-lg'
              )}>C</span>
            </div>
            {sidebarOpen && (
              <div>
                <h1 className="text-2xl font-serif font-bold tracking-tight text-white">CAVA</h1>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'relative w-full flex items-center space-x-3 px-3 py-3 rounded-sm transition-all duration-300 group overflow-hidden',
                  active
                    ? 'text-white bg-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/5',
                  !sidebarOpen && 'justify-center px-0'
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-[#C2410C] shadow-[0_0_10px_#C2410C]" />
                )}
                <Icon className={cn(
                  'w-5 h-5 transition-colors duration-300 shrink-0',
                  active ? 'text-[#C2410C]' : 'text-slate-500 group-hover:text-slate-300'
                )} />
                {sidebarOpen && (
                  <span className={cn(
                    'font-medium text-sm tracking-wide truncate',
                    active && 'font-semibold'
                  )}>
                    {t(item.label)}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Language Switcher */}
        <div className="px-3 py-2 border-t border-white/5">
          <LanguageSwitcher variant="sidebar" collapsed={!sidebarOpen} />
        </div>

        {/* Desktop User Card */}
        <div className="p-3 border-t border-white/5" ref={userMenuRef}>
          <div className="relative">
            {/* User Menu Dropdown */}
            {userMenuOpen && sidebarOpen && (
              <div
                className={cn(
                  'absolute bottom-full left-0 right-0 mb-2 rounded-sm',
                  'bg-white shadow-premium-lg border border-slate-200',
                  'animate-in fade-in-0 slide-in-from-bottom-2 duration-150',
                  'py-1'
                )}
              >
                <Link
                  href="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className={cn(
                    'w-full px-4 py-3 text-left text-sm transition-colors duration-150',
                    'flex items-center gap-3 cursor-pointer',
                    'text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none'
                  )}
                >
                  <User className="w-4 h-4" />
                  {t('navigation.profile')}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={cn(
                    'w-full px-4 py-3 text-left text-sm transition-colors duration-150',
                    'flex items-center gap-3 cursor-pointer',
                    'text-slate-700 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none'
                  )}
                >
                  <LogOut className="w-4 h-4" />
                  {tAuth('logout')}
                </button>
              </div>
            )}

            {/* User Card */}
            {sidebarOpen ? (
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className={cn(
                  'w-full bg-white/5 rounded-sm p-3 flex items-center space-x-3',
                  'hover:bg-white/10 transition-colors cursor-pointer border border-white/5'
                )}
              >
                <div className="w-9 h-9 rounded-sm bg-gradient-to-br from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-slate-300 shadow-inner shrink-0">
                  <UserCircle className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-bold text-white truncate font-serif tracking-wide">
                    {truncateText(user.name, TRUNCATION_LIMITS.SIDEBAR_USER_NAME)}
                  </p>
                  <p className="text-[11px] text-[#C2410C] truncate capitalize tracking-wider">
                    {getRoleLabel()}
                  </p>
                </div>
                <ChevronUp
                  className={cn(
                    'w-4 h-4 text-slate-500 transition-transform duration-200 shrink-0',
                    userMenuOpen && 'rotate-180'
                  )}
                />
              </button>
            ) : (
              <div className="flex flex-col gap-1">
                <Link
                  href="/profile"
                  className={cn(
                    'w-full p-3 rounded-sm transition-colors duration-200',
                    'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20',
                    'flex items-center justify-center'
                  )}
                  title={t('navigation.profile')}
                >
                  <User className="w-5 h-5 text-slate-400" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className={cn(
                    'w-full p-3 rounded-sm transition-colors duration-200',
                    'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20',
                    'flex items-center justify-center'
                  )}
                  title={tAuth('logout')}
                >
                  <LogOut className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
