import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

// Input types
interface ForgotPasswordInput {
    email: string;
}

interface ResetPasswordInput {
    email: string;
    code: string;
    newPassword: string;
}

// Response types
interface SuccessResponse {
    success: boolean;
}

/**
 * Hook para solicitar recuperação de senha
 * Envia código de verificação para o email
 */
export function useForgotPassword() {
    return useMutation<SuccessResponse, Error, ForgotPasswordInput>({
        mutationFn: async (input) => {
            const response = await apiClient.post('/auth/forgot-password', input);
            return response.data;
        },
    });
}

/**
 * Hook para redefinir senha com código de verificação
 */
export function useResetPassword() {
    return useMutation<SuccessResponse, Error, ResetPasswordInput>({
        mutationFn: async (input) => {
            const response = await apiClient.post('/auth/reset-password', input);
            return response.data;
        },
    });
}
