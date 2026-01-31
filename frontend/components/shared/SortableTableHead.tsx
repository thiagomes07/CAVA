'use client';

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils/cn';

interface SortableTableHeadProps {
  field: string;
  label: string;
  sortBy: string;
  sortOrder: string;
  onSort: (field: string) => void;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export function SortableTableHead({
  field,
  label,
  sortBy,
  sortOrder,
  onSort,
  className,
  align = 'left',
}: SortableTableHeadProps) {
  const isActive = sortBy === field;
  const isAsc = isActive && sortOrder === 'asc';
  const isDesc = isActive && sortOrder === 'desc';

  const handleClick = () => {
    onSort(field);
  };

  const getIcon = () => {
    if (!isActive) {
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    }
    if (isAsc) {
      return <ArrowUp className="w-4 h-4 text-obsidian" />;
    }
    return <ArrowDown className="w-4 h-4 text-obsidian" />;
  };

  const alignmentClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }[align];

  return (
    <TableHead className={cn('p-0', className)}>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex items-center gap-2 w-full h-12 px-6',
          'hover:bg-slate-50 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-obsidian/20',
          alignmentClass,
          isActive && 'bg-slate-50'
        )}
        aria-label={`Ordenar por ${label}`}
        aria-sort={isActive ? (isAsc ? 'ascending' : 'descending') : 'none'}
      >
        <span
          className={cn(
            'text-xs font-semibold uppercase tracking-widest select-none',
            isActive ? 'text-obsidian' : 'text-slate-500'
          )}
        >
          {label}
        </span>
        {getIcon()}
      </button>
    </TableHead>
  );
}
