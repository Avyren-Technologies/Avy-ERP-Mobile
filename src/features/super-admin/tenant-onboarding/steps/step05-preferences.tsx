/* eslint-disable better-tailwindcss/no-unknown-classes */
import type { Step5Form } from '../types';
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';

import {
    FormInput,
    SecretInput,
    SectionCard,
    ToggleRow,
} from '../atoms';
import { S } from '../shared-styles';

// ============ RAZORPAYX SECTION ============

function RazorpayXSection({
    form,
    setForm,
    errors,
}: {
    form: Step5Form;
    setForm: (f: Partial<Step5Form>) => void;
    errors?: Record<string, string>;
}) {
    return (
        <Animated.View entering={FadeIn.duration(200)}>
            <View style={S.razorpayCard}>
                {/* RazorpayX header */}
                <View style={S.razorpayLogo}>
                    <Svg width={28} height={28} viewBox="0 0 100 100">
                        <Rect width="100" height="100" rx="16" fill="#072654" />
                        <Path d="M30 70L45 30h15L45 55h20L35 80z" fill="#3395FF" />
                    </Svg>
                    <View>
                        <Text className="font-inter text-sm font-bold text-primary-950">
                            RazorpayX Payout API
                        </Text>
                        <Text className="font-inter text-xs text-neutral-500">
                            One-click salary disbursement
                        </Text>
                    </View>
                </View>

                {/* Info banner */}
                <View
                    style={{
                        backgroundColor: 'rgba(51, 149, 255, 0.08)',
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 12,
                        borderWidth: 1,
                        borderColor: 'rgba(51, 149, 255, 0.2)',
                    }}
                >
                    <Text className="font-inter text-xs leading-5 text-primary-800">
                        Avy ERP integrates with{' '}
                        <Text className="font-bold">RazorpayX Payout API</Text> for direct salary
                        disbursement. Each tenant configures their own Razorpay API keys for
                        multi-tenant isolation. When payroll is approved, the ERP creates a payment
                        batch and transfers salary to each employee's bank account via RazorpayX.
                        Webhook events (
                        <Text className="font-mono text-[11px]">payout.processed</Text>,{' '}
                        <Text className="font-mono text-[11px]">payout.failed</Text>) update payroll
                        status in real-time — ensuring your dashboard always reflects true payment
                        state.
                    </Text>
                </View>

                {/* Flow steps */}
                <View style={{ marginBottom: 12 }}>
                    {[
                        { step: '1', text: 'Create Razorpay business account & complete KYC' },
                        { step: '2', text: 'Enable RazorpayX payouts from your Razorpay dashboard' },
                        { step: '3', text: 'Enter your API keys below — stored per-tenant (multi-tenant safe)' },
                        { step: '4', text: 'Employee bank details → Razorpay Contact + Fund Account auto-created' },
                        { step: '5', text: 'One-click salary disbursement after payroll approval' },
                    ].map((item) => (
                        <View
                            key={item.step}
                            style={{
                                flexDirection: 'row',
                                gap: 10,
                                marginBottom: 6,
                                alignItems: 'flex-start',
                            }}
                        >
                            <View
                                style={{
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: '#3395FF',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    flexShrink: 0,
                                    marginTop: 1,
                                }}
                            >
                                <Text className="font-inter text-[10px] font-bold text-white">
                                    {item.step}
                                </Text>
                            </View>
                            <Text className="flex-1 font-inter text-xs leading-4 text-neutral-700">
                                {item.text}
                            </Text>
                        </View>
                    ))}
                </View>

                {/* API Credentials */}
                <Text style={S.razorpaySectionTitle}>API CREDENTIALS</Text>
                <FormInput
                    label="RazorpayX Key ID"
                    placeholder="rzp_live_xxxxxxxxxxxx"
                    value={form.razorpayKeyId}
                    onChangeText={(v) => setForm({ razorpayKeyId: v })}
                    autoCapitalize="none"
                    hint="From Razorpay Dashboard → Settings → API Keys"
                    error={errors?.razorpayKeyId}
                />
                <SecretInput
                    label="RazorpayX Key Secret"
                    placeholder="Your secret key"
                    value={form.razorpayKeySecret}
                    onChangeText={(v) => setForm({ razorpayKeySecret: v })}
                    hint="Never share this. Stored encrypted in Avy ERP."
                    error={errors?.razorpayKeySecret}
                />
                <SecretInput
                    label="Webhook Secret"
                    placeholder="Webhook signing secret"
                    value={form.razorpayWebhookSecret}
                    onChangeText={(v) => setForm({ razorpayWebhookSecret: v })}
                    hint="Used to verify payout.processed / payout.failed webhook events"
                />
                <FormInput
                    label="RazorpayX Account Number"
                    placeholder="Bank account number linked to RazorpayX"
                    value={form.razorpayAccountNumber}
                    onChangeText={(v) => setForm({ razorpayAccountNumber: v })}
                    keyboardType="number-pad"
                    hint="The source account from which salary payouts are debited"
                    error={errors?.razorpayAccountNumber}
                />

                {/* Settings */}
                <Text style={S.razorpaySectionTitle}>DISBURSEMENT SETTINGS</Text>
                <ToggleRow
                    label="Auto-Disbursement"
                    subtitle="Automatically trigger salary transfers after payroll approval — no manual step required"
                    value={form.razorpayAutoDisbursement}
                    onToggle={(v) => setForm({ razorpayAutoDisbursement: v })}
                />
                <ToggleRow
                    label="Test Mode"
                    subtitle="Use Razorpay test keys for UAT — no real money is transferred"
                    value={form.razorpayTestMode}
                    onToggle={(v) => setForm({ razorpayTestMode: v })}
                />
            </View>
        </Animated.View>
    );
}

// ============ MAIN STEP ============

export function Step5Preferences({
    form,
    setForm,
    errors,
}: {
    form: Step5Form;
    setForm: (f: Partial<Step5Form>) => void;
    errors?: Record<string, string>;
}) {
    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <SectionCard title="Compliance Toggles">
                <ToggleRow
                    label="India Statutory Compliance"
                    subtitle="PF, ESI, PT, TDS, Form 16, Gratuity, Bonus Act"
                    value={form.indiaCompliance}
                    onToggle={(v) => setForm({ indiaCompliance: v })}
                />
            </SectionCard>

            <SectionCard title="Employee Portal & App">
                <ToggleRow
                    label="Mobile App (iOS & Android)"
                    subtitle="Avy ERP mobile app access for all employees"
                    value={form.mobileApp}
                    onToggle={(v) => setForm({ mobileApp: v })}
                />
                <ToggleRow
                    label="Web / System Application"
                    subtitle="Browser-based ERP access for managers, HR, and admin users — full feature access"
                    value={form.webApp ?? true}
                    onToggle={(v) => setForm({ webApp: v })}
                />
            </SectionCard>

            <SectionCard title="Integrations & Devices">
                {/* Biometric — Coming Soon */}
                <View style={{ opacity: 0.55 }} pointerEvents="none">
                    <ToggleRow
                        label="Biometric / Device Sync"
                        subtitle="Auto-sync attendance from ZKTeco, ESSL devices"
                        value={false}
                        onToggle={() => {}}
                    />
                </View>
                <View style={{ marginTop: -8, marginBottom: 4, alignSelf: 'flex-end' }}>
                    <View style={{ backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text className="font-inter text-[9px] font-bold text-warning-700">COMING SOON</Text>
                    </View>
                </View>

                {/* Payroll Bank Integration + RazorpayX */}
                <ToggleRow
                    label="Payroll Bank Integration"
                    subtitle="NEFT/RTGS bank file generation for salary disbursement"
                    value={form.bankIntegration}
                    onToggle={(v) => setForm({ bankIntegration: v })}
                />

                {form.bankIntegration && (
                    <View style={{ marginTop: 4, marginBottom: 4 }}>
                        <ToggleRow
                            label="RazorpayX Payout API"
                            subtitle="Enable direct salary disbursement via RazorpayX — one-click payroll"
                            value={form.razorpayEnabled}
                            onToggle={(v) => setForm({ razorpayEnabled: v })}
                        />
                        {form.razorpayEnabled && (
                            <RazorpayXSection form={form} setForm={setForm} errors={errors} />
                        )}
                    </View>
                )}

                <ToggleRow
                    label="Email Notifications"
                    subtitle="Automated emails for payslips, leave approvals, alerts"
                    value={form.emailNotif}
                    onToggle={(v) => setForm({ emailNotif: v })}
                />

                {/* WhatsApp — Coming Soon */}
                <View style={{ opacity: 0.55 }} pointerEvents="none">
                    <ToggleRow
                        label="WhatsApp Notifications"
                        subtitle="Salary alerts, leave status via WhatsApp Business API"
                        value={false}
                        onToggle={() => {}}
                    />
                </View>
                <View style={{ marginTop: -8, marginBottom: 4, alignSelf: 'flex-end' }}>
                    <View style={{ backgroundColor: '#FEF3C7', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text className="font-inter text-[9px] font-bold text-warning-700">COMING SOON</Text>
                    </View>
                </View>
            </SectionCard>
        </Animated.View>
    );
}
