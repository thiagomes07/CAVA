import { z } from "zod";

// Type for translation function
type TranslationFunction = (
  key: string,
  values?: Record<string, string | number>,
) => string;

// Factory function to create login schema with translations
export function createLoginSchema(t: TranslationFunction) {
  return z.object({
    email: z
      .string()
      .min(1, t("required", { field: t("email") }))
      .email(t("email")),
    password: z
      .string()
      .min(1, t("required", { field: t("password") }))
      .min(8, t("minLength", { field: t("password"), min: 8 })),
  });
}

// Factory function to create register schema with translations
export function createRegisterSchema(t: TranslationFunction) {
  return z
    .object({
      name: z
        .string()
        .min(1, t("required", { field: t("name") }))
        .min(2, t("minLength", { field: t("name"), min: 2 })),
      email: z
        .string()
        .min(1, t("required", { field: t("email") }))
        .email(t("email")),
      password: z
        .string()
        .min(1, t("required", { field: t("password") }))
        .min(8, t("minLength", { field: t("password"), min: 8 }))
        .regex(/[A-Z]/, t("passwordUppercase"))
        .regex(/[0-9]/, t("passwordNumber")),
      confirmPassword: z
        .string()
        .min(1, t("required", { field: t("confirmPassword") })),
      phone: z
        .string()
        .optional()
        .refine(
          (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, "")),
          t("phone"),
        ),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("passwordMismatch"),
      path: ["confirmPassword"],
    });
}

// Factory function to create invite broker schema with translations
export function createInviteBrokerSchema(t: TranslationFunction) {
  return z.object({
    name: z
      .string()
      .min(1, t("required", { field: t("name") }))
      .refine(
        (v) => v.trim().length >= 2,
        t("minLength", { field: t("name"), min: 2 }),
      )
      .transform((v) => v.trim()),
    email: z
      .string()
      .min(1, t("required", { field: t("email") }))
      .email(t("email"))
      .transform((v) => v.trim()),
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, "")),
        t("phone"),
      ),
    whatsapp: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, "")),
        t("whatsapp"),
      ),
    preferredCurrency: z.enum(["BRL", "USD"]).default("BRL"),
  });
}

// Factory function to create change password schema with translations
export function createChangePasswordSchema(t: TranslationFunction) {
  return z
    .object({
      currentPassword: z
        .string()
        .min(1, t("required", { field: t("currentPassword") })),
      newPassword: z
        .string()
        .min(1, t("required", { field: t("newPassword") }))
        .min(8, t("minLength", { field: t("newPassword"), min: 8 }))
        .regex(/[A-Z]/, t("passwordUppercase"))
        .regex(/[0-9]/, t("passwordNumber")),
      confirmNewPassword: z
        .string()
        .min(1, t("required", { field: t("confirmPassword") })),
    })
    .refine((data) => data.newPassword === data.confirmNewPassword, {
      message: t("passwordMismatch"),
      path: ["confirmNewPassword"],
    });
}

// Static schemas for backward compatibility (Portuguese)
export const loginSchema = z.object({
  email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
  password: z
    .string()
    .min(1, "Senha é obrigatória")
    .min(8, "Senha deve ter no mínimo 8 caracteres"),
});

export const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "Nome é obrigatório")
      .min(2, "Nome deve ter no mínimo 2 caracteres"),
    email: z.string().min(1, "Email é obrigatório").email("Email inválido"),
    password: z
      .string()
      .min(1, "Senha é obrigatória")
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
      .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
    confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
    phone: z
      .string()
      .optional()
      .refine(
        (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, "")),
        "Telefone inválido",
      ),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

export const inviteBrokerSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .refine((v) => v.trim().length >= 2, "Nome deve ter no mínimo 2 caracteres")
    .transform((v) => v.trim()),
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .transform((v) => v.trim()),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, "")),
      "Telefone inválido",
    ),
  whatsapp: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, "")),
      "WhatsApp inválido",
    ),
  preferredCurrency: z.enum(['BRL', 'USD']).default('BRL'),
});

export const updateBrokerSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .refine((v) => v.trim().length >= 2, "Nome deve ter no mínimo 2 caracteres")
    .transform((v) => v.trim()),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, "")),
      "Telefone inválido",
    ),
  whatsapp: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, "")),
      "WhatsApp inválido",
    ),
});

export const updateSellerSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .refine((v) => v.trim().length >= 2, "Nome deve ter no mínimo 2 caracteres")
    .transform((v) => v.trim()),
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .transform((v) => v.trim()),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, "")),
      "Telefone inválido",
    ),
  whatsapp: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, "")),
      "WhatsApp inválido",
    ),
});

export const inviteSellerSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .refine((v) => v.trim().length >= 2, "Nome deve ter no mínimo 2 caracteres")
    .transform((v) => v.trim()),
  email: z
    .string()
    .min(1, "Email é obrigatório")
    .email("Email inválido")
    .transform((v) => v.trim()),
  phone: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, "")),
      "Telefone inválido",
    ),
  whatsapp: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^\d{10,11}$/.test(val.replace(/\D/g, "")),
      "WhatsApp inválido",
    ),
  preferredCurrency: z.enum(['BRL', 'USD']).default('BRL'),
  isAdmin: z.boolean().default(false),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Senha atual é obrigatória"),
    newPassword: z
      .string()
      .min(1, "Nova senha é obrigatória")
      .min(8, "Senha deve ter no mínimo 8 caracteres")
      .regex(/[A-Z]/, "Senha deve conter pelo menos uma letra maiúscula")
      .regex(/[0-9]/, "Senha deve conter pelo menos um número"),
    confirmNewPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "As senhas não coincidem",
    path: ["confirmNewPassword"],
  });

// Types
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type InviteBrokerInput = z.infer<typeof inviteBrokerSchema>;
export type UpdateBrokerInput = z.infer<typeof updateBrokerSchema>;
export type UpdateSellerInput = z.infer<typeof updateSellerSchema>;
export type InviteSellerInput = z.infer<typeof inviteSellerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
