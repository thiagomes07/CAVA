import { z } from 'zod';

export const batchStatuses = [
  'DISPONIVEL',
  'RESERVADO',
  'VENDIDO',
  'INATIVO',
] as const;

export const batchSchema = z.object({
  productId: z.string().min(1, 'Produto é obrigatório'),
  batchCode: z
    .string()
    .min(1, 'Código do lote é obrigatório')
    .max(50, 'Código deve ter no máximo 50 caracteres')
    .regex(/^[A-Z]{3}-\d{6}$/i, 'Formato inválido. Use AAA-999999')
    .transform((val) => val.toUpperCase()),
  height: z
    .number({ message: 'Altura deve ser um número' })
    .positive('Altura deve ser maior que zero')
    .max(1000, 'Altura deve ser menor que 1000 cm'),
  width: z
    .number({ message: 'Largura deve ser um número' })
    .positive('Largura deve ser maior que zero')
    .max(1000, 'Largura deve ser menor que 1000 cm'),
  thickness: z
    .number({ message: 'Espessura deve ser um número' })
    .positive('Espessura deve ser maior que zero')
    .max(100, 'Espessura deve ser menor que 100 cm'),
  quantitySlabs: z
    .number({ message: 'Quantidade deve ser um número' })
    .int('Quantidade deve ser um número inteiro')
    .positive('Quantidade deve ser maior que zero'),
  industryPrice: z
    .number({ message: 'Preço deve ser um número' })
    .positive('Preço deve ser maior que zero'),
  originQuarry: z
    .string()
    .max(100, 'Nome da pedreira deve ter no máximo 100 caracteres')
    .optional(),
  entryDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Data inválida')
    .refine((val) => {
      const parsed = new Date(val);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return parsed <= today;
    }, 'Data de entrada não pode ser futura'),
});

export const batchFilterSchema = z.object({
  productId: z.string().optional(),
  status: z.enum([...batchStatuses, '']).optional(),
  code: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(50),
});

export const reservationSchema = z.object({
  batchId: z.string().min(1, 'Lote é obrigatório'),
  leadId: z.string().optional(),
  customerName: z
    .string()
    .min(1, 'Nome do cliente é obrigatório')
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .optional(),
  customerContact: z
    .string()
    .min(1, 'Contato do cliente é obrigatório')
    .optional(),
  expiresAt: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), 'Data inválida')
    .refine(
      (val) => new Date(val) > new Date(),
      'Data de expiração deve ser futura'
    )
    .default(() => {
      const date = new Date();
      date.setDate(date.getDate() + 7);
      return date.toISOString().split('T')[0];
    }),
  notes: z
    .string()
    .max(500, 'Observações devem ter no máximo 500 caracteres')
    .optional(),
});

export const updateBatchPriceSchema = z.object({
  negotiatedPrice: z
    .number({ message: 'Preço deve ser um número' })
    .positive('Preço deve ser maior que zero')
    .optional(),
});

export type BatchInput = z.infer<typeof batchSchema>;
export type BatchFilter = z.infer<typeof batchFilterSchema>;
export type ReservationInput = z.infer<typeof reservationSchema>;
export type UpdateBatchPriceInput = z.infer<typeof updateBatchPriceSchema>;