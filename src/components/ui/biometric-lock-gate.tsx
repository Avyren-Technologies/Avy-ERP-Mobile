import * as LocalAuthentication from 'expo-local-authentication';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Image, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require('../../../assets/logo.png') as number;
import { getItem } from '@/lib/storage';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

/**
 * Full-screen biometric lock gate — industry-standard app lock.
 *
 * Strict enforcement: ANY time the app goes to `background` and returns
 * to `active`, the user must authenticate via biometrics to proceed.
 * Only triggers when the user has opted in (`biometric_enabled` = true).
 *
 * - Tracks `background` state specifically (not `inactive`) to avoid
 *   false triggers from system dialogs, notification center, or the
 *   biometric prompt itself (which puts iOS into `inactive`).
 * - Auto-prompts biometric on lock.
 * - Retry button if auth fails or is dismissed.
 * - Android back button cannot dismiss the lock.
 */
export function BiometricLockGate({ children }: { children: React.ReactNode }) {
    const [locked, setLocked] = useState(false);
    const [authFailed, setAuthFailed] = useState(false);
    const wentToBackground = useRef(false);
    const isAuthenticating = useRef(false);

    const authenticate = useCallback(async () => {
        if (isAuthenticating.current) return;
        isAuthenticating.current = true;
        setAuthFailed(false);

        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock Avy ERP',
                cancelLabel: 'Cancel',
                disableDeviceFallback: false,
            });

            if (result.success) {
                setLocked(false);
                setAuthFailed(false);
            } else {
                setAuthFailed(true);
            }
        } catch {
            setAuthFailed(true);
        } finally {
            isAuthenticating.current = false;
        }
    }, []);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
            // Only track actual background (home button, app switch).
            // `inactive` is ignored — it fires for system dialogs, notification
            // center, and the biometric prompt itself on iOS.
            if (nextState === 'background') {
                wentToBackground.current = true;
                return;
            }

            // Lock when returning from background to active
            if (nextState === 'active' && wentToBackground.current) {
                wentToBackground.current = false;

                const biometricEnabled = getItem<boolean>(BIOMETRIC_ENABLED_KEY);
                if (!biometricEnabled) return;

                setLocked(true);
                setAuthFailed(false);
            }
        });

        return () => subscription.remove();
    }, []);

    // Auto-prompt biometric when lock activates
    useEffect(() => {
        if (locked && !isAuthenticating.current) {
            const timer = setTimeout(() => authenticate(), 300);
            return () => clearTimeout(timer);
        }
    }, [locked, authenticate]);

    return (
        <>
            {children}
            {locked && (
                <Modal
                    visible
                    transparent={false}
                    animationType="fade"
                    statusBarTranslucent
                    onRequestClose={() => {
                        // Prevent Android back button from dismissing the lock
                    }}
                >
                    <View style={lockStyles.container}>
                        <Image source={logo} style={lockStyles.logo} resizeMode="contain" />
                        <Text style={lockStyles.title}>App Locked</Text>
                        <Text style={lockStyles.subtitle}>
                            Authenticate to unlock Avy ERP
                        </Text>

                        {authFailed && (
                            <Text style={lockStyles.errorText}>
                                Authentication failed. Tap below to try again.
                            </Text>
                        )}

                        <Pressable
                            style={({ pressed }) => [
                                lockStyles.unlockButton,
                                pressed && lockStyles.unlockButtonPressed,
                            ]}
                            onPress={authenticate}
                        >
                            <Text style={lockStyles.unlockButtonText}>
                                {authFailed ? 'Retry' : 'Unlock'}
                            </Text>
                        </Pressable>
                    </View>
                </Modal>
            )}
        </>
    );
}

const lockStyles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    logo: {
        width: 96,
        height: 96,
        marginBottom: 24,
    },
    title: {
        fontFamily: 'Inter',
        fontSize: 24,
        fontWeight: '700',
        color: colors.neutral[900],
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontFamily: 'Inter',
        fontSize: 15,
        fontWeight: '400',
        color: colors.neutral[500],
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    errorText: {
        fontFamily: 'Inter',
        fontSize: 13,
        fontWeight: '500',
        color: colors.danger[600],
        textAlign: 'center',
        marginBottom: 16,
    },
    unlockButton: {
        backgroundColor: colors.primary[600],
        borderRadius: 14,
        paddingVertical: 16,
        paddingHorizontal: 48,
        minWidth: 200,
        alignItems: 'center',
    },
    unlockButtonPressed: {
        backgroundColor: colors.primary[700],
    },
    unlockButtonText: {
        fontFamily: 'Inter',
        fontSize: 16,
        fontWeight: '700',
        color: colors.white,
    },
});
