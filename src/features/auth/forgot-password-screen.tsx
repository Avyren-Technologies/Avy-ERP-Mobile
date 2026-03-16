/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Polyline } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import {
  useForgotPasswordMutation,
  useVerifyResetCodeMutation,
  useResetPasswordMutation,
} from '@/features/auth/use-auth-mutations';

type ForgotStep = 'identify' | 'verify' | 'reset' | 'success';

function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.primaryWrapper, disabled && styles.primaryDisabled]}
    >
      <LinearGradient
        colors={
          disabled
            ? [colors.neutral[300], colors.neutral[300]]
            : [colors.gradient.start, colors.gradient.end]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.primaryButton}
      >
        <Text className="font-inter text-base font-bold text-white">
          {loading ? 'Please wait...' : label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export function ForgotPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = React.useState<ForgotStep>('identify');
  const [email, setEmail] = React.useState('');
  const [code, setCode] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [error, setError] = React.useState('');

  const forgotPasswordMutation = useForgotPasswordMutation();
  const verifyResetCodeMutation = useVerifyResetCodeMutation();
  const resetPasswordMutation = useResetPasswordMutation();

  const loading = forgotPasswordMutation.isPending || verifyResetCodeMutation.isPending || resetPasswordMutation.isPending;

  const handleBack = React.useCallback(() => {
    if (step === 'identify') {
      router.back();
      return;
    }

    if (step === 'verify') {
      setStep('identify');
      setError('');
      return;
    }

    if (step === 'reset') {
      setStep('verify');
      setError('');
      return;
    }

    router.replace('/login');
  }, [router, step]);

  const handleSendCode = React.useCallback(async () => {
    const emailValue = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValue) {
      setError('Enter your email to continue.');
      return;
    }

    if (!emailRegex.test(emailValue)) {
      setError('Enter a valid email address.');
      return;
    }

    setError('');
    try {
      await forgotPasswordMutation.mutateAsync({ email: emailValue });
      setStep('verify');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to send code. Please try again.');
    }
  }, [email, forgotPasswordMutation]);

  const handleVerifyCode = React.useCallback(async () => {
    if (code.trim().length < 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }

    setError('');
    try {
      await verifyResetCodeMutation.mutateAsync({ email: email.trim(), code: code.trim() });
      setStep('reset');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Invalid code. Please try again.');
    }
  }, [code, email, verifyResetCodeMutation]);

  const handleResetPassword = React.useCallback(async () => {
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    try {
      await resetPasswordMutation.mutateAsync({ email: email.trim(), code: code.trim(), newPassword });
      setStep('success');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reset password. Please try again.');
    }
  }, [confirmPassword, newPassword, email, code, resetPasswordMutation]);

  const handleResend = React.useCallback(async () => {
    setError('');
    try {
      await forgotPasswordMutation.mutateAsync({ email: email.trim() });
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to resend code.');
    }
  }, [email, forgotPasswordMutation]);

  const ctaDisabled =
    (step === 'identify' && !email.trim()) ||
    (step === 'verify' && code.trim().length < 6) ||
    (step === 'reset' &&
      (!newPassword.trim() || !confirmPassword.trim() || newPassword !== confirmPassword));

  return (
    <View style={styles.container}>
      <View style={styles.backgroundFill} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'position' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 4, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(320)} style={styles.backContainer}>
            <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Polyline
                  points="15 18 9 12 15 6"
                  stroke={colors.primary[500]}
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
              <Text className="font-inter ml-1 text-sm font-semibold text-primary-600">
                {step === 'success' ? 'Back to Sign In' : 'Back'}
              </Text>
            </Pressable>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(520)} style={styles.header}>
            <View style={styles.badge}>
              <Svg width={22} height={22} viewBox="0 0 24 24">
                <Path
                  d="M12 17a3 3 0 100-6 3 3 0 000 6zM6 10V8a6 6 0 1112 0v2m-9 0h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6a2 2 0 012-2z"
                  stroke={colors.primary[600]}
                  strokeWidth="1.7"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
            <Text className="font-inter text-3xl font-bold text-primary-950">
              {step === 'identify' && 'Forgot Password'}
              {step === 'verify' && 'Verify Code'}
              {step === 'reset' && 'Set New Password'}
              {step === 'success' && 'Password Updated'}
            </Text>
            <Text className="font-inter text-sm text-neutral-500" style={styles.subtitle}>
              {step === 'identify' &&
                'Enter your email and we will send a verification code.'}
              {step === 'verify' &&
                'Use the 6-digit code sent to your email address.'}
              {step === 'reset' &&
                'Create a secure password and sign back in to continue.'}
              {step === 'success' &&
                'Your password has been reset successfully. Please sign in again.'}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(520).delay(120)} style={styles.card}>
            {step === 'identify' && (
              <View style={styles.section}>
                <Text
                  className="font-inter text-sm font-semibold text-primary-900"
                  style={styles.fieldLabel}
                >
                  Email
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor={colors.neutral[400]}
                    value={email}
                    onChangeText={(value) => {
                      setEmail(value);
                      if (error) setError('');
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    autoComplete="email"
                    returnKeyType="done"
                    onSubmitEditing={handleSendCode}
                  />
                </View>
                <PrimaryButton
                  label="Send Verification Code"
                  onPress={handleSendCode}
                  disabled={ctaDisabled}
                  loading={loading}
                />
              </View>
            )}

            {step === 'verify' && (
              <View style={styles.section}>
                <Text
                  className="font-inter text-sm font-semibold text-primary-900"
                  style={styles.fieldLabel}
                >
                  Verification Code
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter 6-digit code"
                    placeholderTextColor={colors.neutral[400]}
                    value={code}
                    onChangeText={(value) => {
                      setCode(value.replace(/[^0-9]/g, '').slice(0, 6));
                      if (error) setError('');
                    }}
                    keyboardType="number-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleVerifyCode}
                  />
                </View>
                <PrimaryButton
                  label="Verify Code"
                  onPress={handleVerifyCode}
                  disabled={ctaDisabled}
                  loading={loading}
                />
                <Pressable onPress={handleResend} style={styles.resendButton}>
                  <Text className="font-inter text-sm font-semibold text-primary-500">
                    Resend code
                  </Text>
                </Pressable>
              </View>
            )}

            {step === 'reset' && (
              <View style={styles.section}>
                <Text
                  className="font-inter text-sm font-semibold text-primary-900"
                  style={styles.fieldLabel}
                >
                  New Password
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter new password"
                    placeholderTextColor={colors.neutral[400]}
                    value={newPassword}
                    onChangeText={(value) => {
                      setNewPassword(value);
                      if (error) setError('');
                    }}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowNewPassword((prev) => !prev)}>
                    <Text className="font-inter text-xs font-semibold text-primary-500">
                      {showNewPassword ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                </View>

                <Text
                  className="font-inter text-sm font-semibold text-primary-900"
                  style={styles.confirmFieldLabel}
                >
                  Confirm Password
                </Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Re-enter password"
                    placeholderTextColor={colors.neutral[400]}
                    value={confirmPassword}
                    onChangeText={(value) => {
                      setConfirmPassword(value);
                      if (error) setError('');
                    }}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowConfirmPassword((prev) => !prev)}>
                    <Text className="font-inter text-xs font-semibold text-primary-500">
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </Text>
                  </Pressable>
                </View>
                <PrimaryButton
                  label="Reset Password"
                  onPress={handleResetPassword}
                  disabled={ctaDisabled}
                  loading={loading}
                />
              </View>
            )}

            {step === 'success' && (
              <View style={[styles.section, styles.successSection]}>
                <View style={styles.successIcon}>
                  <Svg width={26} height={26} viewBox="0 0 24 24">
                    <Path
                      d="M20 6L9 17l-5-5"
                      stroke={colors.success[600]}
                      strokeWidth="2.2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </View>
                <PrimaryButton
                  label="Go to Sign In"
                  onPress={() => router.replace('/login')}
                />
              </View>
            )}

            {!!error && (
              <View style={styles.errorWrap}>
                <Text className="font-inter text-sm" style={styles.errorText}>
                  {error}
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#CFDCFF',
  },
  backgroundFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#CFDCFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  backContainer: {
    width: '100%',
    marginBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  header: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 320,
  },
  card: {
    width: '100%',
    borderRadius: 28,
    backgroundColor: 'rgba(245,248,255,0.92)',
    borderWidth: 1,
    borderColor: colors.primary[100],
    overflow: 'hidden',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: colors.primary[700],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 24,
    elevation: 6,
  },
  section: {
    width: '100%',
  },
  fieldLabel: {
    marginBottom: 8,
  },
  confirmFieldLabel: {
    marginTop: 10,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.neutral[200],
    paddingHorizontal: 14,
    height: 54,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: colors.primary[950],
  },
  primaryWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: colors.primary[600],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 14,
    elevation: 8,
  },
  primaryDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButton: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resendButton: {
    alignSelf: 'center',
    marginTop: 14,
    paddingVertical: 6,
  },
  successSection: {
    alignItems: 'center',
  },
  successIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success[50],
    borderWidth: 1,
    borderColor: colors.success[200],
    marginBottom: 16,
  },
  errorWrap: {
    marginTop: 14,
    paddingHorizontal: 12,
  },
  errorText: {
    color: colors.danger[600],
    textAlign: 'center',
    lineHeight: 18,
  },
});
