/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import * as React from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Polyline } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { authApi } from '@/lib/api/auth';
import { createLogger } from '@/lib/logger';

const logger = createLogger('MfaSetupVoluntaryScreen');
const CODE_LENGTH = 6;

/**
 * Voluntary MFA setup screen for authenticated users.
 * Unlike the forced MFA setup (which uses mfaToken), this screen receives
 * the QR code data and secret as route params from the settings screen,
 * and uses the authenticated session Bearer token for the confirm call.
 */
export function MfaSetupVoluntaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { qrCodeDataUrl, secret } = useLocalSearchParams<{
    qrCodeDataUrl: string;
    secret: string;
  }>();

  const [submitting, setSubmitting] = React.useState(false);
  const [digits, setDigits] = React.useState<string[]>(Array(CODE_LENGTH).fill(''));
  const inputRefs = React.useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (digit && index === CODE_LENGTH - 1) {
      const code = newDigits.join('');
      if (code.length === CODE_LENGTH) {
        handleSubmit(code);
      }
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (code: string) => {
    setSubmitting(true);
    try {
      // Confirm MFA without mfaToken — uses Bearer token from authenticated session
      const response = await authApi.confirmMfa(code);

      if (response.success) {
        showSuccess('MFA Enabled', 'Two-factor authentication has been set up successfully.');
        logger.info('Voluntary MFA setup confirmed');
        router.back();
        return;
      }

      showErrorMessage('MFA confirmation failed. Please try again.');
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Invalid verification code. Please try again.';
      logger.error('Voluntary MFA confirm failed', { message });
      showErrorMessage(message);
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopySecret = async () => {
    if (secret) {
      await Clipboard.setStringAsync(secret);
      showSuccess('Copied', 'Secret key copied to clipboard.');
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (!qrCodeDataUrl || !secret) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text className="font-inter mt-4 text-sm" style={{ color: colors.primary[600] }}>
            Loading MFA setup...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Pressable onPress={handleGoBack} style={styles.backButton}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Polyline
              points="15 18 9 12 15 6"
              stroke="#FFFFFF"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text className="font-inter ml-1 text-sm font-semibold text-white">Back</Text>
        </Pressable>
        <View style={styles.headerContent}>
          <ShieldCheck size={32} color="#FFFFFF" strokeWidth={1.5} />
          <Text className="font-inter mt-2 text-xl font-bold text-white">
            Set Up Two-Factor Auth
          </Text>
          <Text className="font-inter mt-1 text-center text-sm text-white/80">
            Add an extra layer of security to your account
          </Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        style={styles.content}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(32, insets.bottom + 12) },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Animated.View entering={FadeInDown.duration(450).delay(100)} style={styles.formSection}>
              {/* QR Code Section */}
              <View style={styles.qrSection}>
                <Text className="font-inter mb-2 text-center text-sm font-semibold" style={styles.sectionTitle}>
                  Scan QR Code
                </Text>
                <Text className="font-inter mb-4 text-center text-xs" style={styles.sectionSubtitle}>
                  Open your authenticator app and scan this QR code
                </Text>
                <View style={styles.qrContainer}>
                  <Image
                    source={{ uri: qrCodeDataUrl }}
                    style={styles.qrImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              {/* Secret Key Section */}
              <View style={styles.secretSection}>
                <Text className="font-inter mb-2 text-center text-xs" style={styles.sectionSubtitle}>
                  Or manually enter this secret key:
                </Text>
                <Pressable onPress={handleCopySecret} style={styles.secretContainer}>
                  <Text className="font-inter text-center text-sm font-bold" style={styles.secretText}>
                    {secret}
                  </Text>
                  <Svg width={16} height={16} viewBox="0 0 24 24" style={styles.copyIcon}>
                    <Path
                      d="M20 9h-9a2 2 0 00-2 2v9a2 2 0 002 2h9a2 2 0 002-2v-9a2 2 0 00-2-2z"
                      stroke={colors.primary[500]}
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <Path
                      d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"
                      stroke={colors.primary[500]}
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                </Pressable>
                <Text className="font-inter mt-1 text-center text-xs" style={styles.tapToCopy}>
                  Tap to copy
                </Text>
              </View>

              {/* Code Input Section */}
              <View style={styles.codeSection}>
                <Text className="font-inter mb-3 text-center text-sm font-semibold" style={styles.sectionTitle}>
                  Enter Verification Code
                </Text>
                <View style={styles.codeContainer}>
                  {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                    <TextInput
                      key={index}
                      ref={(ref) => {
                        inputRefs.current[index] = ref;
                      }}
                      style={[
                        styles.codeInput,
                        digits[index] ? styles.codeInputFilled : null,
                      ]}
                      value={digits[index]}
                      onChangeText={(text) => handleChange(text, index)}
                      onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                    />
                  ))}
                </View>
              </View>

              {submitting && (
                <Animated.View entering={FadeInDown.duration(300)} style={styles.submittingContainer}>
                  <View style={styles.loadingDots}>
                    <View style={[styles.loadingDot, { opacity: 0.3 }]} />
                    <View style={[styles.loadingDot, { opacity: 0.6 }]} />
                    <View style={[styles.loadingDot, { opacity: 1 }]} />
                  </View>
                  <Text className="font-inter mt-3 text-sm" style={{ color: colors.primary[600] }}>
                    Verifying...
                  </Text>
                </Animated.View>
              )}

              {/* Info Card */}
              <View style={styles.infoSection}>
                <View style={styles.infoCard}>
                  <Svg width={16} height={16} viewBox="0 0 24 24" style={styles.infoIcon}>
                    <Path
                      d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"
                      stroke={colors.primary[400]}
                      strokeWidth="1.5"
                      fill="none"
                    />
                    <Path
                      d="M12 16v-4M12 8h.01"
                      stroke={colors.primary[400]}
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  </Svg>
                  <Text className="font-inter ml-2 flex-1 text-xs" style={styles.infoText}>
                    Use an authenticator app like Google Authenticator or Authy. Scan the QR code
                    above, then enter the 6-digit code to complete setup.
                  </Text>
                </View>
              </View>

              <Pressable onPress={handleGoBack} style={styles.cancelButton}>
                <Text className="font-inter text-sm font-semibold" style={styles.cancelText}>
                  Cancel
                </Text>
              </Pressable>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F7FF',
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 12,
  },
  headerContent: {
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  qrSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.primary[800],
  },
  sectionSubtitle: {
    color: colors.primary[500],
  },
  qrContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  qrImage: {
    width: 200,
    height: 200,
  },
  secretSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  secretContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.primary[100],
    gap: 8,
  },
  secretText: {
    color: colors.primary[700],
    letterSpacing: 1.5,
  },
  copyIcon: {
    marginLeft: 4,
  },
  tapToCopy: {
    color: colors.primary[400],
  },
  codeSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  codeInput: {
    width: 48,
    height: 56,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.primary[200],
    backgroundColor: colors.white,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary[700],
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  codeInputFilled: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  submittingContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary[500],
  },
  infoSection: {
    marginTop: 24,
    width: '100%',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[100],
  },
  infoIcon: {
    marginTop: 1,
  },
  infoText: {
    color: colors.primary[700],
    lineHeight: 18,
  },
  cancelButton: {
    marginTop: 28,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelText: {
    color: colors.primary[600],
  },
});
