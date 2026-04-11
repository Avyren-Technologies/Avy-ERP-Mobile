import * as LocalAuthentication from 'expo-local-authentication';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { getItem } from '@/lib/storage';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';

export function BiometricLockGate({ children }: { children: React.ReactNode }) {
    const [locked, setLocked] = useState(false);
    const [authFailed, setAuthFailed] = useState(false);
    const backgroundTimestamp = useRef<number | null>(null);
    const appState = useRef<AppStateStatus>(AppState.currentState);
    const isAuthenticating = useRef(false);

    const GRACE_PERIOD_MS = 2000;

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
            const prevState = appState.current;
            appState.current = nextState;

            if (nextState === 'background' || nextState === 'inactive') {
                if (prevState === 'active') {
                    backgroundTimestamp.current = Date.now();
                }
                return;
            }

            if (nextState === 'active' && (prevState === 'background' || prevState === 'inactive')) {
                const biometricEnabled = getItem<boolean>(BIOMETRIC_ENABLED_KEY);
                if (!biometricEnabled) return;

                const elapsed = backgroundTimestamp.current
                    ? Date.now() - backgroundTimestamp.current
                    : Infinity;
                backgroundTimestamp.current = null;

                if (elapsed < GRACE_PERIOD_MS) return;

                setLocked(true);
                setAuthFailed(false);
            }
        });

        return () => subscription.remove();
    }, []);

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
                    onRequestClose={() => {}}
                >
                    <View style={lockStyles.container}>
                        <View style={lockStyles.iconCircle}>
                            <Text style={lockStyles.lockIcon}>🔒</Text>
                        </View>
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
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: colors.primary[50],
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    lockIcon: {
        fontSize: 44,
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
