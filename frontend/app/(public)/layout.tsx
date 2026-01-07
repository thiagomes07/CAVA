import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'CAVA Stone Platform',
  description: 'Produtos luxuosos de pedras ornamentais',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-porcelain">
      {children}
      
      {/* Footer minimalista */}
      <footer className="border-t border-slate-100 py-8">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-6 h-6 bg-obsidian rounded-sm" />
            <span className="font-serif text-sm text-slate-400">CAVA Stone Platform</span>
          </div>
          
          <p className="text-xs text-slate-400">
            Powered by CAVA Stone Platform
          </p>
          
          <div className="mt-4">
            <Link
              href="/privacy"
              className="text-xs text-slate-500 hover:text-obsidian transition-colors"
            >
              Política de Privacidade
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}