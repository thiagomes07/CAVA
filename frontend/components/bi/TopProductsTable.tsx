'use client';

import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { ProductMetric } from '@/lib/types';

interface TopProductsTableProps {
  data: ProductMetric[];
  title?: string;
  className?: string;
}

const materialLabels: Record<string, string> = {
  GRANITO: 'Granito',
  MARMORE: 'Marmore',
  QUARTZITO: 'Quartzito',
  LIMESTONE: 'Limestone',
  TRAVERTINO: 'Travertino',
  OUTROS: 'Outros',
};

const materialColors: Record<string, string> = {
  GRANITO: 'bg-slate-100 text-slate-700',
  MARMORE: 'bg-blue-50 text-blue-700',
  QUARTZITO: 'bg-purple-50 text-purple-700',
  LIMESTONE: 'bg-amber-50 text-amber-700',
  TRAVERTINO: 'bg-emerald-50 text-emerald-700',
  OUTROS: 'bg-slate-50 text-slate-600',
};

export function TopProductsTable({ data, title = 'Produtos Mais Vendidos', className }: TopProductsTableProps) {
  const currency = data?.[0]?.currency || 'BRL';
  if (!data || data.length === 0) {
    return (
      <Card variant="elevated" className={className}>
        <h3 className="text-lg font-semibold text-obsidian mb-4">{title}</h3>
        <div className="text-center py-8 text-slate-400">
          Nenhum produto vendido no periodo
        </div>
      </Card>
    );
  }

  return (
    <Card variant="elevated" className={className}>
      <h3 className="text-lg font-semibold text-obsidian mb-4">{title}</h3>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Material</TableHead>
              <TableHead className="text-right">Vendas</TableHead>
              <TableHead className="text-right">Chapas</TableHead>
              <TableHead className="text-right">Area (m2)</TableHead>
              <TableHead className="text-right">Receita</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((product) => (
              <TableRow key={product.productId}>
                <TableCell>
                  <span className="font-medium text-slate-500">{product.rank}</span>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-obsidian">{product.productName}</span>
                </TableCell>
                <TableCell>
                  <Badge className={materialColors[product.material] || materialColors.OUTROS}>
                    {materialLabels[product.material] || product.material}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">{product.salesCount}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-slate-600">{product.totalSlabs}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-slate-600">{(product.totalArea ?? 0).toFixed(2)}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium text-emerald-600">
                    {formatCurrency(product.totalRevenue, 'pt', currency)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export function TopProductsTableSkeleton() {
  return (
    <Card variant="elevated">
      <div className="animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-6 h-4 bg-slate-200 rounded" />
              <div className="flex-1 h-4 bg-slate-200 rounded" />
              <div className="w-16 h-5 bg-slate-200 rounded-full" />
              <div className="w-12 h-4 bg-slate-200 rounded" />
              <div className="w-16 h-4 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
