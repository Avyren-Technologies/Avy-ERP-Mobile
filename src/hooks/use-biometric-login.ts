import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useState } from 'react';

import { authApi, decodeJwtPayload } from '@/lib/api/auth';
import { signIn } from '@/features/auth/use-auth-store';
import { getItem, removeItem } from '@/lib/storage';
import { createLogger } from '@/lib/logger';

const logger = createLogger('BiometricLogin');

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_TOKEN_KEY = 'biometric_token';

/**
 * Hook that checks for biometric login on app start.
 *
 * - Checks if biometric login is enabled in MMKV storage
 * - Checks if a stored refresh token exists
 * - If both: prompts biometric authentication
 * - On success: uses the stored refresh token to get new tokens and signs in
 * - On failure: returns isChecking=false so the login screen can show normally
 */
export function useBiometricLogin() {
  const [isChecking, setIsChecking] = useState(true);
  const [biometricSuccess, setBiometricSuccess] = useState(false);

  useEffect(() => {
    checkBiometric();
  }, []);

  async function checkBiometric() {
    try {
      const enabled = getItem<boolean>(BIOMETRIC_ENABLED_KEY);
      const storedToken = getItem<string>(BIOMETRIC_TOKEN_KEY);

      if (!enabled || !storedToken) {
        logger.debug('Biometric login not configured — skipping');
        setIsChecking(false);
        return;
      }

      // Check hardware availability
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        logger.warn('Biometric hardware not available or not enrolled');
        setIsChecking(false);
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to Avy ERP',
        cancelLabel: 'Use Password',
        disableDeviceFallback: true,
      });

      if (result.success) {
        logger.info('Biometric authentication succeeded — refreshing token');

        // Use the stored refresh token to get new access tokens
        const response = await authApi.refreshToken(storedToken);
        const tokens = response.data?.data?.tokens;

        if (tokens) {
          const payload = decodeJwtPayload(tokens.accessToken);
          const permissions: string[] = Array.isArray(payload?.permissions)
            ? (payload.permissions as string[])
            : [];

          // Build a minimal user from the JWT payload
          const user = {
            id: (payload?.userId as string) ?? '',
            email: (payload?.email as string) ?? '',
            firstName: (payload?.firstName as string) ?? '',
            lastName: (payload?.lastName as string) ?? '',
            role: (payload?.role as string) ?? 'USER',
            companyId: (payload?.companyId as string) ?? undefined,
            tenantId: (payload?.tenantId as string) ?? undefined,
            permissions,
          };

          signIn(
            { access: tokens.accessToken, refresh: tokens.refreshToken },
            user,
          );

          // Update the stored biometric token with the new refresh token
          const { setItem } = require('@/lib/storage') as typeof import('@/lib/storage');
          await setItem(BIOMETRIC_TOKEN_KEY, tokens.refreshToken);

          setBiometricSuccess(true);
          logger.info('Biometric login completed successfully');
        } else {
          logger.warn('Biometric token refresh returned no tokens');
          // Clear biometric data since the stored token is invalid
          await removeItem(BIOMETRIC_TOKEN_KEY);
          await removeItem(BIOMETRIC_ENABLED_KEY);
        }
      } else {
        logger.info('Biometric authentication cancelled or failed', {
          error: result.error,
        });
      }
    } catch (err: any) {
      logger.error('Biometric login error', { message: err?.message });
      // If the refresh token is expired or invalid, clear biometric data
      if (err?.response?.status === 401) {
        await removeItem(BIOMETRIC_TOKEN_KEY);
        await removeItem(BIOMETRIC_ENABLED_KEY);
      }
    } finally {
      setIsChecking(false);
    }
  }

  return { isChecking, biometricSuccess };
}
