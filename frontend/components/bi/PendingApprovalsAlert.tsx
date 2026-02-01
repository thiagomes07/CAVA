'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

interface PendingApprovalsAlertProps {
  count: number;
  className?: string;
}

export function PendingApprovalsAlert({ count, className }: PendingApprovalsAlertProps) {
  const router = useRouter();

  if (count === 0) return null;

  return (
    <div
      className={cn(
        'flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-sm',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-100 rounded-full">
          <AlertTriangle className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <p className="font-medium text-amber-800">
            {count} reserva{count > 1 ? 's' : ''} pendente{count > 1 ? 's' : ''} de aprovacao
          </p>
          <p className="text-sm text-amber-600">
            Aguardando analise e decisao do administrador
          </p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-amber-700 hover:text-amber-800 hover:bg-amber-100"
        onClick={() => router.push('/reservations/pending')}
      >
        Ver reservas
        <ArrowRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}
