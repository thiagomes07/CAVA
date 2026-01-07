'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Menu, LogOut, ChevronRight } from 'lucide-react';
import { Dropdown, DropdownItem, DropdownSeparator } from '@/components/ui/dropdown';
import { useAuthStore } from '@/store/auth.store';
import { useUIStore } from '@/store/ui.store';
import { useToast } from '@/lib/hooks/useToast';
import { cn } from '@/lib/utils/cn';

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/catalog': 'Catálogo',
  '/inventory': 'Estoque',
  '/shared-inventory': 'Estoque Compartilhado',
  '/brokers': 'Parceiros',
  '/sales': 'Vendas',
  '/links': 'Links',
  '/leads': 'Leads',
  '/team': 'Equipe',
};

function getBreadcrumbs(pathname: string): Array<{ label: string; href: string }> {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: Array<{ label: string; href: string }> = [];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    
    const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
    
    if (segment !== 'new' && !segment.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      breadcrumbs.push({ label, href: currentPath });
    }
  }

  return breadcrumbs;
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { toggleSidebar } = useUIStore();
  const { success, error } = useToast();

  const breadcrumbs = getBreadcrumbs(pathname);
  const currentPage = breadcrumbs[breadcrumbs.length - 1]?.label || 'Dashboard';

  const handleLogout = async () => {
    try {
      await logout();
      success('Logout realizado com sucesso');
      router.push('/login');
    } catch {
      error('Erro ao fazer logout');
    }
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 bg-porcelain border-b border-slate-100">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Mobile Menu + Breadcrumbs */}
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className={cn(
              'p-2 rounded-sm hover:bg-slate-100 transition-colors lg:hidden',
              'focus:outline-none focus:ring-2 focus:ring-obsidian/20'
            )}
          >
            <Menu className="w-5 h-5 text-slate-600" />
          </button>

          {/* Breadcrumbs */}
          <div className="hidden md:flex items-center gap-2 text-sm">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.href} className="flex items-center gap-2">
                {index > 0 && (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
                {index === breadcrumbs.length - 1 ? (
                  <span className="font-medium text-obsidian">{crumb.label}</span>
                ) : (
                  <button
                    onClick={() => router.push(crumb.href)}
                    className="text-slate-500 hover:text-obsidian transition-colors"
                  >
                    {crumb.label}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Mobile: Current Page */}
          <h1 className="md:hidden font-serif text-xl font-semibold text-obsidian">
            {currentPage}
          </h1>
        </div>

        {/* Right: User Menu */}
        <div className="flex items-center gap-3">
          <Dropdown
            trigger={
              <div className="flex items-center gap-3 px-3 py-2 rounded-sm hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-obsidian text-porcelain flex items-center justify-center">
                  <span className="text-xs font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium text-obsidian">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </div>
              </div>
            }
          >
            <div className="py-2 px-4 border-b border-slate-100">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold">
                {user.role === 'ADMIN_INDUSTRIA' && 'Administrador'}
                {user.role === 'VENDEDOR_INTERNO' && 'Vendedor Interno'}
                {user.role === 'BROKER' && 'Broker'}
              </p>
            </div>

            <DropdownSeparator />
            
            <DropdownItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </DropdownItem>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}