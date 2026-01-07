import { z } from 'zod';

export const materialTypes = [
  'GRANITO',
  'MARMORE',
  'QUARTZITO',
  'LIMESTONE',
  'TRAVERTINO',
  'OUTROS',
] as const;

export const finishTypes = [
  'POLIDO',
  'LEVIGADO',
  'BRUTO',
  'APICOADO',
  'FLAMEADO',
] as const;

export const productSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome do produto é obrigatório')
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  sku: z
    .string()
    .max(50, 'SKU deve ter no máximo 50 caracteres')
    .optional(),
  material: z.enum(materialTypes, {
    message: 'Tipo de material é obrigatório',
  }),
  finish: z.enum(finishTypes, {
    message: 'Acabamento é obrigatório',
  }),
  description: z
    .string()
    .max(1000, 'Descrição deve ter no máximo 1000 caracteres')
    .optional(),
  isPublic: z.boolean(),
});

export const productFilterSchema = z.object({
  search: z.string().optional(),
  material: z.enum([...materialTypes, '']).optional(),
  includeInactive: z.boolean().default(false),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(24),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductFilter = z.infer<typeof productFilterSchema>;