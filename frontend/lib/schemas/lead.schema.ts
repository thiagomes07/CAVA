import { z } from 'zod';

export const leadStatuses = ['NOVO', 'CONTATADO', 'RESOLVIDO'] as const;

export const leadFilterSchema = z.object({
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
  status: z.enum([...leadStatuses, '']).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

export const updateLeadStatusSchema = z.object({
  status: z.enum(leadStatuses, {
    required_error: 'Status é obrigatório',
  }),
});

export type LeadFilter = z.infer<typeof leadFilterSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;