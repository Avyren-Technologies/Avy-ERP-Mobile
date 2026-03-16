import { useMutation } from '@tanstack/react-query';

import { authApi } from '@/lib/api/auth';
import { signIn, signOut } from '@/features/auth/use-auth-store';

export function useLoginMutation() {
    return useMutation({
        mutationFn: async ({ email, password }: { email: string; password: string }) => {
            const response = await authApi.login(email, password);
            return response;
        },
        onSuccess: (response) => {
            if (response.success && response.data?.user && response.data?.tokens) {
                const { user, tokens } = response.data;
                signIn(
                    {
                        access: tokens.accessToken,
                        refresh: tokens.refreshToken,
                    },
                    user,
                );
            }
        },
    });
}

export function useLogoutMutation() {
    return useMutation({
        mutationFn: async () => {
            await authApi.logout();
        },
        onSuccess: () => {
            signOut();
        },
        onError: () => {
            // Even if logout API fails, sign out locally
            signOut();
        },
    });
}

export function useForgotPasswordMutation() {
    return useMutation({
        mutationFn: async ({ email }: { email: string }) => {
            const response = await authApi.forgotPassword(email);
            return response;
        },
    });
}

export function useVerifyResetCodeMutation() {
    return useMutation({
        mutationFn: async ({ email, code }: { email: string; code: string }) => {
            const response = await authApi.verifyResetCode(email, code);
            return response;
        },
    });
}

export function useResetPasswordMutation() {
    return useMutation({
        mutationFn: async ({
            email,
            code,
            newPassword,
        }: {
            email: string;
            code: string;
            newPassword: string;
        }) => {
            const response = await authApi.resetPassword(email, code, newPassword);
            return response;
        },
    });
}

export function useChangePasswordMutation() {
    return useMutation({
        mutationFn: async ({
            currentPassword,
            newPassword,
        }: {
            currentPassword: string;
            newPassword: string;
        }) => {
            const response = await authApi.changePassword(currentPassword, newPassword);
            return response;
        },
    });
}
