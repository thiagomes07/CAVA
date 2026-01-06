'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange?: (page: number) => void;
  variant?: 'full' | 'simple';
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  variant = 'full',
}: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;

    if (onPageChange) {
      onPageChange(page);
    } else {
      const params = new URLSearchParams(searchParams);
      params.set('page', page.toString());
      router.push(`${pathname}?${params.toString()}`);
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }

      pages.push(totalPages);
    }

    return pages;
  };

  if (totalPages <= 1 && variant === 'full') return null;

  if (variant === 'simple') {
    return (
      <div className="flex items-center justify-center gap-2 py-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'p-2 rounded-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
            currentPage === 1
              ? 'opacity-50 cursor-not-allowed text-slate-300'
              : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <span className="text-sm text-slate-600 px-4">
          Página {currentPage} de {totalPages}
        </span>

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'p-2 rounded-sm transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
            currentPage === totalPages
              ? 'opacity-50 cursor-not-allowed text-slate-300'
              : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between py-4 border-t border-slate-100">
      {/* Items Info */}
      <div className="text-sm text-slate-500">
        Mostrando {startItem}-{endItem} de {totalItems} itens
      </div>

      {/* Page Numbers */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            'w-10 h-10 rounded-sm flex items-center justify-center transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
            currentPage === 1
              ? 'opacity-50 cursor-not-allowed text-slate-300'
              : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="w-10 h-10 flex items-center justify-center text-slate-400"
              >
                ...
              </span>
            );
          }

          const pageNumber = page as number;
          const isActive = pageNumber === currentPage;

          return (
            <button
              key={pageNumber}
              onClick={() => handlePageChange(pageNumber)}
              className={cn(
                'w-10 h-10 rounded-sm flex items-center justify-center transition-colors text-sm font-medium',
                'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
                isActive
                  ? 'bg-obsidian text-porcelain'
                  : 'text-slate-600 hover:bg-slate-50'
              )}
            >
              {pageNumber}
            </button>
          );
        })}

        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            'w-10 h-10 rounded-sm flex items-center justify-center transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-obsidian/20',
            currentPage === totalPages
              ? 'opacity-50 cursor-not-allowed text-slate-300'
              : 'text-slate-600 hover:bg-slate-50'
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}