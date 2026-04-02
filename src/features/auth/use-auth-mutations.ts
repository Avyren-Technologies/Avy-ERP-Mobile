import { useMutation } from '@tanstack/react-query';

import { authApi, decodeJwtPayload } from '@/lib/api/auth';
import { signIn, signOut } from '@/features/auth/use-auth-store';
import { createLogger } from '@/lib/logger';

const logger = createLogger('AuthMutations');

export function useLoginMutation() {
    return useMutation({
        mutationFn: async ({ email, password }: { email: string; password: string }) => {
            const response = await authApi.login(email, password);
            return response;
        },
        onSuccess: (response) => {
            if (response.success && response.data) {
                // MFA challenge — don't sign in, let the caller handle navigation
                if ('mfaRequired' in response.data && (response.data as any).mfaRequired) {
                    return; // Caller checks response.data.mfaRequired
                }

                // Normal login
                if (response.data.user && response.data.tokens) {
                    const { user, tokens } = response.data;
                    const payload = decodeJwtPayload(tokens.accessToken);
                    const permissions: string[] = Array.isArray(payload?.permissions)
                        ? (payload.permissions as string[])
                        : [];
                    const userWithPermissions = { ...user, permissions };
                    logger.info('Login API success', { email: user.email, role: user.role, permissionCount: permissions.length });
                    signIn(
                        { access: tokens.accessToken, refresh: tokens.refreshToken },
                        userWithPermissions,
                    );
                }
            }
        },
    });
}

export function useMfaVerifyMutation() {
    return useMutation({
        mutationFn: async ({ mfaToken, code }: { mfaToken: string; code: string }) => {
            const response = await authApi.verifyMfa(mfaToken, code);
            return response;
        },
        onSuccess: (response) => {
            if (response.success && response.data?.user && response.data?.tokens) {
                const { user, tokens } = response.data;
                const payload = decodeJwtPayload(tokens.accessToken);
                const permissions: string[] = Array.isArray(payload?.permissions)
                    ? (payload.permissions as string[])
                    : [];
                signIn(
                    { access: tokens.accessToken, refresh: tokens.refreshToken },
                    { ...user, permissions },
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
            logger.info('Logout successful');
            signOut();
        },
        onError: () => {
            logger.warn('Logout API failed — signing out locally');
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
