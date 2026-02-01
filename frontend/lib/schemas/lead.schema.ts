import { z } from 'zod';

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
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

export type ClienteFilter = z.infer<typeof clienteFilterSchema>;