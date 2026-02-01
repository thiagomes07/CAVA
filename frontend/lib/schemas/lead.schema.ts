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

export const createClienteSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().refine(
    (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, '')),
    'Telefone inválido'
  ),
  whatsapp: z.string().optional().refine(
    (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, '')),
    'WhatsApp inválido'
  ),
  message: z.string().max(500).optional(),
  marketingOptIn: z.boolean(),
}).refine((data) => {
  // Pelo menos email ou telefone deve ser preenchido
  const hasEmail = data.email && data.email.trim() !== '';
  const hasPhone = data.phone && data.phone.replace(/\D/g, '').length >= 10;
  return hasEmail || hasPhone;
}, {
  message: 'Informe pelo menos o email ou telefone',
  path: ['email'],
});

export type CreateClienteForm = z.infer<typeof createClienteSchema>;