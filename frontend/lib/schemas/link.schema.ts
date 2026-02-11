import { z } from 'zod';

export const linkTypes = ['LOTE_UNICO', 'PRODUTO_GERAL', 'CATALOGO_COMPLETO', 'MULTIPLOS_LOTES'] as const;

export const salesLinkSchema = z
  .object({
    linkType: z.enum(linkTypes),
    batchId: z.string().optional(),
    productId: z.string().optional(),
    title: z
      .string()
      .max(100, 'Título deve ter no máximo 100 caracteres')
      .optional(),
    customMessage: z
      .string()
      .max(500, 'Mensagem deve ter no máximo 500 caracteres')
      .optional(),
    slugToken: z
      .string()
      .max(50, 'Slug deve ter no máximo 50 caracteres')
      .optional(),
    displayPriceAmount: z
      .number({ message: 'Preço deve ser um número' })
      .int('Preço deve estar em centavos')
      .positive('Preço deve ser maior que zero')
      .optional(),
    displayCurrency: z.enum(['BRL', 'USD']),
    showPrice: z.boolean(),
    expiresAt: z
      .string()
      .optional()
      .nullable()
      .transform((val) => val || undefined),
    isActive: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.linkType === 'LOTE_UNICO') {
        return !!data.batchId;
      }
      return true;
    },
    {
      message: 'Lote é obrigatório para links de lote único',
      path: ['batchId'],
    }
  )
  .refine(
    (data) => {
      if (data.linkType === 'PRODUTO_GERAL') {
        return !!data.productId;
      }
      return true;
    },
    {
      message: 'Produto é obrigatório para links de produto',
      path: ['productId'],
    }
  );

export const clienteCaptureSchema = z.object({
  name: z
    .string()
    .min(1, 'Nome é obrigatório')
    .min(2, 'Nome deve ter no mínimo 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  contact: z
    .string()
    .min(1, 'Contato é obrigatório')
    .refine(
      (val) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\d{10,11}$/;
        const cleaned = val.replace(/\D/g, '');
        return emailRegex.test(val) || phoneRegex.test(cleaned);
      },
      'Informe um email ou telefone válido'
    ),
  message: z
    .string()
    .max(500, 'Mensagem deve ter no máximo 500 caracteres')
    .optional(),
  marketingOptIn: z.boolean(),
});

export const linkFilterSchema = z.object({
  type: z.enum([...linkTypes, '']).optional(),
  status: z.enum(['ATIVO', 'EXPIRADO', '']).optional(),
  search: z.string().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(25),
});

export const validateSlugSchema = z.object({
  slug: z
    .string()
    .min(3, 'Slug deve ter no mínimo 3 caracteres')
    .max(50, 'Slug deve ter no máximo 50 caracteres')
    .regex(
      /^[a-z0-9-]+$/,
      'Slug deve conter apenas letras minúsculas, números e hífens'
    ),
});

export type SalesLinkInput = z.infer<typeof salesLinkSchema>;
export type ClienteCaptureInput = z.infer<typeof clienteCaptureSchema>;
export type LinkFilter = z.infer<typeof linkFilterSchema>;
export type ValidateSlugInput = z.infer<typeof validateSlugSchema>;
