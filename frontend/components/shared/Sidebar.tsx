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
  ChevronLeft,
  ChevronRight,
  LogOut,
  ChevronUp,
  User,
  BookOpen
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
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

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
    
    // Select menu items based on user role
    if (user.role === 'ADMIN_INDUSTRIA') {
      return industryMenuItems.filter((item) => item.roles.includes(user.role));
    } else if (user.role === 'VENDEDOR_INTERNO') {
      // Vendedores use the admin routes but with limited options
      return industryMenuItems.filter((item) => item.roles.includes(user.role));
    } else if (user.role === 'BROKER') {
      return brokerMenuItems;
    }
    
    return [];
  }, [user]);

  const isActive = (href: string) => {
    // Check for exact match on dashboard routes
    if (href.endsWith('/dashboard')) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const closeOnMobile = () => {
    if (typeof window === 'undefined') return;
    const isMobile = window.innerWidth < 1024;
    if (isMobile && sidebarOpen) {
      toggleSidebar();
    }
  };

  if (!user) return null;

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-screen bg-obsidian text-porcelain transition-all duration-300',
          'flex flex-col',
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20',
          'lg:relative lg:z-auto'
        )}
      >
        {/* Logo & Toggle */}
        <div
          className={cn(
            'flex items-center border-b border-white/10 transition-all duration-200',
            sidebarOpen ? 'justify-between p-6' : 'justify-center p-4'
          )}
        >
          <div
            className={cn(
              'flex items-center gap-3 transition-all duration-200',
              sidebarOpen ? 'opacity-100' : 'lg:w-0 lg:opacity-0 lg:overflow-hidden'
            )}
          >
            <div className="w-8 h-8 bg-porcelain rounded-sm" />
            {sidebarOpen && (
              <span className="font-serif text-xl font-semibold">CAVA</span>
            )}
          </div>
          
          <button
            onClick={toggleSidebar}
            className={cn(
              'p-2 rounded-sm hover:bg-white/10 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-white/20',
              !sidebarOpen && 'lg:mx-auto'
            )}
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6">
          <ul className="space-y-1 px-3">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={closeOnMobile}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-sm transition-all duration-200',
                      'text-sm font-medium',
                      'focus:outline-none focus:ring-2 focus:ring-white/20',
                      active
                        ? 'bg-porcelain text-obsidian'
                        : 'text-porcelain/80 hover:bg-white/10 hover:text-porcelain',
                      !sidebarOpen && 'lg:justify-center'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {sidebarOpen && (
                      <span className="truncate">{t(item.label)}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Language Switcher */}
        <div className="px-3 py-2 border-t border-white/10">
          <LanguageSwitcher variant="sidebar" collapsed={!sidebarOpen} />
        </div>

        {/* User Info with Dropdown */}
        <div className="p-6 border-t border-white/10" ref={userMenuRef}>
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

            {/* User Info Area */}
            <div
              className={cn(
                'w-full flex items-center gap-3 rounded-sm',
                sidebarOpen ? 'p-2 -m-2' : 'justify-center'
              )}
            >
              {/* Avatar + Name - Clickable to go to Profile */}
              <Link
                href="/profile"
                onClick={closeOnMobile}
                className={cn(
                  'flex items-center gap-3 flex-1 min-w-0 rounded-sm transition-colors duration-200',
                  'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20',
                  'py-1 px-1 -ml-1',
                  !sidebarOpen && 'justify-center'
                )}
                title={t('navigation.profile')}
              >
                <div className="w-10 h-10 rounded-full bg-porcelain/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                {sidebarOpen && (
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium truncate" title={user.name}>
                      {truncateText(user.name, TRUNCATION_LIMITS.SIDEBAR_USER_NAME)}
                    </p>
                    <p className="text-xs text-porcelain/60 truncate">
                      {user.role === 'ADMIN_INDUSTRIA' && tRoles('admin')}
                      {user.role === 'VENDEDOR_INTERNO' && tRoles('seller')}
                      {user.role === 'BROKER' && tRoles('broker')}
                    </p>
                  </div>
                )}
              </Link>
              
              {/* Chevron Button - Opens Dropdown */}
              {sidebarOpen && (
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={cn(
                    'p-2 rounded-sm transition-colors duration-200',
                    'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20',
                    userMenuOpen && 'bg-white/10'
                  )}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  title={tAuth('logout')}
                >
                  <ChevronUp 
                    className={cn(
                      'w-4 h-4 text-porcelain/60 transition-transform duration-200',
                      userMenuOpen && 'rotate-180'
                    )} 
                  />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Collapsed Sidebar - Profile & Logout Buttons */}
        {!sidebarOpen && (
          <div className="hidden lg:flex lg:flex-col gap-1 p-3 border-t border-white/10">
            <Link
              href="/profile"
              className={cn(
                'w-full p-3 rounded-sm transition-colors duration-200',
                'hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20',
                'flex items-center justify-center'
              )}
              title={t('navigation.profile')}
            >
              <User className="w-5 h-5" />
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
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </aside>
    </>
  );
}