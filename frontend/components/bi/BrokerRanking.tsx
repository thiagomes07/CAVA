'use client';

import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { cn } from '@/lib/utils/cn';
import { Trophy, Medal, Award } from 'lucide-react';
import type { BrokerPerformance } from '@/lib/types';

interface BrokerRankingProps {
  data: BrokerPerformance[];
  title?: string;
  className?: string;
}

export function BrokerRanking({ data, title = 'Ranking de Vendedores', className }: BrokerRankingProps) {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-yellow-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-slate-400" />;
      case 3:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-medium text-slate-500">{rank}</span>;
    }
  };

  const getRankBgColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-50';
      case 2:
        return 'bg-slate-50';
      case 3:
        return 'bg-amber-50';
      default:
        return '';
    }
  };

  if (!data || data.length === 0) {
    return (
      <Card variant="elevated" className={className}>
        <h3 className="text-lg font-semibold text-obsidian mb-4">{title}</h3>
        <div className="text-center py-8 text-slate-400">
          Nenhum vendedor com vendas no periodo
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
              <TableHead>Vendedor</TableHead>
              <TableHead className="text-right">Vendas</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right">Ticket Medio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((broker) => (
              <TableRow key={broker.brokerId} className={getRankBgColor(broker.rank)}>
                <TableCell>
                  <div className="flex items-center justify-center">
                    {getRankIcon(broker.rank)}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-medium text-obsidian">{broker.brokerName}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium">{broker.salesCount}</span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-medium text-emerald-600">
                    {formatCurrency(broker.totalRevenue)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-slate-600">
                    {formatCurrency(broker.averageTicket)}
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

export function BrokerRankingSkeleton() {
  return (
    <Card variant="elevated">
      <div className="animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-8 h-8 bg-slate-200 rounded-full" />
              <div className="flex-1 h-4 bg-slate-200 rounded" />
              <div className="w-16 h-4 bg-slate-200 rounded" />
              <div className="w-20 h-4 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
