/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ShieldCheck } from 'lucide-react-native';
import * as React from 'react';
import {
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
import { showErrorMessage } from '@/components/ui/utils';
import { useMfaVerifyMutation } from '@/features/auth/use-auth-mutations';
import { createLogger } from '@/lib/logger';

const logger = createLogger('MfaVerifyScreen');
const CODE_LENGTH = 6;

export function MfaVerifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mfaToken } = useLocalSearchParams<{ mfaToken: string }>();
  const mfaVerifyMutation = useMfaVerifyMutation();

  const [digits, setDigits] = React.useState<string[]>(Array(CODE_LENGTH).fill(''));
  const inputRefs = React.useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    // Only allow numeric input
    const digit = text.replace(/[^0-9]/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-advance to next input
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits are entered
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
    if (!mfaToken) {
      showErrorMessage('MFA session expired. Please log in again.');
      router.replace('/login');
      return;
    }

    logger.info('Submitting MFA code');
    try {
      await mfaVerifyMutation.mutateAsync({ mfaToken, code });
      logger.info('MFA verification successful — navigating to app');
      router.replace('/(app)');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Invalid verification code. Please try again.';
      logger.error('MFA verification failed', { message });
      showErrorMessage(message);
      // Clear digits and refocus first input
      setDigits(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handleBackToLogin = () => {
    router.replace('/login');
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={[colors.gradient.start, colors.gradient.mid, colors.gradient.end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 16 }]}
      >
        <Pressable onPress={handleBackToLogin} style={styles.backButton}>
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
            Two-Factor Authentication
          </Text>
          <Text className="font-inter mt-1 text-center text-sm text-white/80">
            Enter the 6-digit code from your authenticator app
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
              { paddingBottom: Math.max(32, insets.bottom + 12) }
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <Animated.View entering={FadeInDown.duration(450).delay(100)} style={styles.formSection}>
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
                autoFocus={index === 0}
              />
            ))}
          </View>

          {mfaVerifyMutation.isPending && (
            <Animated.View entering={FadeInDown.duration(300)} style={styles.loadingContainer}>
              <View style={styles.loadingDots}>
                <View style={[styles.loadingDot, { opacity: 0.3 }]} />
                <View style={[styles.loadingDot, { opacity: 0.6 }]} />
                <View style={[styles.loadingDot, { opacity: 1 }]} />
              </View>
              <Text className="font-inter mt-3 text-sm" style={styles.loadingText}>
                Verifying...
              </Text>
            </Animated.View>
          )}

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
                Open your authenticator app (Google Authenticator, Authy, etc.) and enter the
                current 6-digit code.
              </Text>
            </View>
          </View>

          <Pressable onPress={handleBackToLogin} style={styles.backToLoginButton}>
            <Text className="font-inter text-sm font-semibold" style={styles.backToLoginText}>
              Back to Login
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
  },
  formSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    alignItems: 'center',
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
  loadingContainer: {
    alignItems: 'center',
    marginTop: 24,
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
  loadingText: {
    color: colors.primary[600],
  },
  infoSection: {
    marginTop: 32,
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
  backToLoginButton: {
    marginTop: 28,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backToLoginText: {
    color: colors.primary[600],
  },
});
