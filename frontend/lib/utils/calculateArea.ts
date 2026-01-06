'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import type { UserRole } from '@/lib/types';

interface MenuItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'],
  },
  {
    label: 'Catálogo',
    href: '/catalog',
    icon: Package,
    roles: ['ADMIN_INDUSTRIA'],
  },
  {
    label: 'Estoque',
    href: '/inventory',
    icon: Layers,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  },
  {
    label: 'Estoque Compartilhado',
    href: '/shared-inventory',
    icon: PackageOpen,
    roles: ['BROKER'],
  },
  {
    label: 'Vendas',
    href: '/sales',
    icon: Receipt,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO'],
  },
  {
    label: 'Links',
    href: '/links',
    icon: Link2,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'],
  },
  {
    label: 'Leads',
    href: '/leads',
    icon: Inbox,
    roles: ['ADMIN_INDUSTRIA', 'VENDEDOR_INTERNO', 'BROKER'],
  },
  {
    label: 'Parceiros',
    href: '/brokers',
    icon: Users,
    roles: ['ADMIN_INDUSTRIA'],
  },
  {
    label: 'Equipe',
    href: '/team',
    icon: UserPlus,
    roles: ['ADMIN_INDUSTRIA'],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const { sidebarOpen, toggleSidebar } = useUIStore();

  const filteredMenuItems = useMemo(() => {
    if (!user) return [];
    return menuItems.filter((item) => item.roles.includes(user.role));
  }, [user]);

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
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
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div
            className={cn(
              'flex items-center gap-3 transition-opacity duration-200',
              !sidebarOpen && 'lg:opacity-0'
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
                      <span className="truncate">{item.label}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Info */}
        {sidebarOpen && (
          <div className="p-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-porcelain/20 flex items-center justify-center">
                <span className="text-sm font-semibold">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-porcelain/60 truncate">
                  {user.role === 'ADMIN_INDUSTRIA' && 'Administrador'}
                  {user.role === 'VENDEDOR_INTERNO' && 'Vendedor'}
                  {user.role === 'BROKER' && 'Broker'}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}