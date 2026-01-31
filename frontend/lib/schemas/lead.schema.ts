import { z } from 'zod';

export const clienteStatuses = ['NOVO', 'CONTATADO', 'RESOLVIDO'] as const;

export const clienteFilterSchema = z.object({
  search: z.string().optional(),
  linkId: z.string().optional(),
  startDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Data inválida')
    .optional(),
  endDate: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), 'Data inválida')
    .optional(),
  optIn: z.boolean().optional(),
  status: z.enum([...clienteStatuses, '']).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

export const updateClienteStatusSchema = z.object({
  status: z.enum(clienteStatuses, {
    message: 'Status é obrigatório',
  }),
});

export type ClienteFilter = z.infer<typeof clienteFilterSchema>;
export type UpdateClienteStatusInput = z.infer<typeof updateClienteStatusSchema>;