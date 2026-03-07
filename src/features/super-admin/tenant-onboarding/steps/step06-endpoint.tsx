/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { client } from '@/lib/api';

import { FormInput, SectionCard } from '../atoms';
import { S } from '../shared-styles';
import type { Step6EndpointForm } from '../types';

const HEALTH_STATUS_SUCCESS = 'healthy';

function buildHealthUrl(baseUrl: string) {
    const normalized = baseUrl.trim().replace(/\/+$/, '');
    if (!normalized) return '';
    return normalized.endsWith('/health') ? normalized : `${normalized}/health`;
}

export function Step6Endpoint({
    form,
    setForm,
    errors,
}: {
    form: Step6EndpointForm;
    setForm: (f: Partial<Step6EndpointForm>) => void;
    errors?: Record<string, string>;
}) {
    const [verifyState, setVerifyState] = React.useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [verifyMessage, setVerifyMessage] = React.useState('');

    React.useEffect(() => {
        setVerifyState('idle');
        setVerifyMessage('');
    }, [form.endpointType, form.customBaseUrl]);

    const verifyEndpoint = async () => {
        const healthUrl = buildHealthUrl(form.customBaseUrl);
        if (!healthUrl) {
            setVerifyState('error');
            setVerifyMessage('Please enter a valid base URL before verification.');
            return;
        }

        setVerifyState('loading');
        setVerifyMessage('Running health check...');

        try {
            const response = await client.get(healthUrl, {
                timeout: 10000,
                headers: { Accept: 'application/json' },
            });

            const status = String(response.data?.status ?? '').toLowerCase();
            if (response.status === 200 && status === HEALTH_STATUS_SUCCESS) {
                setVerifyState('success');
                setVerifyMessage('Endpoint verified successfully.');
                return;
            }

            setVerifyState('error');
            setVerifyMessage('Health check response did not match required JSON: { status: "healthy" }.');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Endpoint verification failed.';
            setVerifyState('error');
            setVerifyMessage(message);
        }
    };

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <View style={S.infoCard}>
                <Text className="font-inter text-sm text-neutral-600">
                    Configure where this tenant connects for backend APIs. Most tenants should use
                    the default Avyren cloud endpoint.
                </Text>
            </View>

            <SectionCard title="Connection Type">
                <View style={S.twoColumn}>
                    <Pressable
                        onPress={() => setForm({ endpointType: 'default' })}
                        style={[
                            {
                                flex: 1,
                                borderRadius: 14,
                                padding: 14,
                                borderWidth: 1.5,
                                borderColor: colors.neutral[200],
                                backgroundColor: colors.white,
                            },
                            form.endpointType === 'default' && {
                                borderColor: colors.primary[500],
                                backgroundColor: colors.primary[50],
                            },
                        ]}
                    >
                        <Text className="font-inter text-sm font-bold text-primary-950">
                            Default Cloud
                        </Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">
                            Managed by Avyren with auto scaling, backups, and monitoring.
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={() => setForm({ endpointType: 'custom' })}
                        style={[
                            {
                                flex: 1,
                                borderRadius: 14,
                                padding: 14,
                                borderWidth: 1.5,
                                borderColor: colors.neutral[200],
                                backgroundColor: colors.white,
                            },
                            form.endpointType === 'custom' && {
                                borderColor: colors.accent[500],
                                backgroundColor: colors.accent[50],
                            },
                        ]}
                    >
                        <Text className="font-inter text-sm font-bold text-primary-950">
                            Custom Endpoint
                        </Text>
                        <Text className="mt-1 font-inter text-xs text-neutral-500">
                            Dedicated private cloud or on-premise deployment.
                        </Text>
                    </Pressable>
                </View>
            </SectionCard>

            <SectionCard title="Endpoint Summary">
                <View
                    style={{
                        marginTop: 2,
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: colors.success[200],
                        backgroundColor: colors.success[50],
                    }}
                >
                    <Text className="font-inter text-xs font-bold text-success-700">
                        {form.endpointType === 'default'
                            ? 'Default endpoint active'
                            : 'Custom endpoint active'}
                    </Text>
                    <Text className="mt-1 font-inter text-xs text-success-700">
                        {form.endpointType === 'default'
                            ? 'Tenant will be provisioned on the platform default backend endpoint.'
                            : 'Tenant will use your custom backend base URL.'}
                    </Text>
                </View>
            </SectionCard>

            {form.endpointType === 'custom' && (
                <>
                    <SectionCard title="Custom Server Configuration">
                        <FormInput
                            label="Backend Base URL"
                            placeholder="https://erp.yourcompany.com/api/v1"
                            value={form.customBaseUrl}
                            onChangeText={(v) => setForm({ customBaseUrl: v })}
                            required
                            keyboardType="url"
                            autoCapitalize="none"
                            hint="HTTPS endpoint used for tenant API requests"
                            error={errors?.customBaseUrl}
                        />

                        <View style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Pressable
                                onPress={verifyEndpoint}
                                disabled={verifyState === 'loading'}
                                style={{
                                    borderRadius: 10,
                                    paddingHorizontal: 14,
                                    paddingVertical: 9,
                                    backgroundColor: verifyState === 'loading'
                                        ? colors.neutral[300]
                                        : colors.primary[600],
                                }}
                            >
                                <Text className="font-inter text-xs font-bold text-white">
                                    {verifyState === 'loading' ? 'Verifying...' : 'Verify'}
                                </Text>
                            </Pressable>
                            {verifyState !== 'idle' && (
                                <Text
                                    className={`font-inter text-xs ${verifyState === 'success' ? 'text-success-700' : verifyState === 'error' ? 'text-danger-600' : 'text-neutral-500'}`}
                                    style={{ flex: 1 }}
                                >
                                    {verifyMessage}
                                </Text>
                            )}
                        </View>
                    </SectionCard>

                    <SectionCard title="Endpoint Health">
                        <View
                            style={{
                                borderRadius: 12,
                                padding: 12,
                                borderWidth: 1,
                                borderColor: colors.warning[200],
                                backgroundColor: colors.warning[50],
                            }}
                        >
                            <Text className="font-inter text-xs font-bold text-warning-700">
                                Endpoint not validated yet
                            </Text>
                            <Text className="mt-1 font-inter text-xs text-warning-700">
                                Connectivity health check will run after company provisioning.
                            </Text>
                        </View>
                        {form.customBaseUrl ? (
                            <View
                                style={{
                                    marginTop: 10,
                                    borderRadius: 10,
                                    padding: 12,
                                    backgroundColor: colors.neutral[900],
                                }}
                            >
                                <Text className="font-inter text-[11px] text-success-300">
                                    GET {form.customBaseUrl}/health
                                </Text>
                            </View>
                        ) : null}
                    </SectionCard>
                </>
            )}
        </Animated.View>
    );
}
