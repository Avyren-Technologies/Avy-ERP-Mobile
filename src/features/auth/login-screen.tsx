/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
  Dimensions,
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

const SCREEN_HEIGHT = Dimensions.get('window').height;
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polyline } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useLoginMutation } from '@/features/auth/use-auth-mutations';


type EmailInputProps = {
  email: string;
  emailFocused: boolean;
  setEmail: (v: string) => void;
  setEmailFocused: (v: boolean) => void;
  onSubmit: () => void;
};

function EmailInput({
  email,
  emailFocused,
  setEmail,
  setEmailFocused,
  onSubmit,
}: EmailInputProps) {
  const iconColor = emailFocused ? '#63B3FF' : 'rgba(226,233,255,0.7)';
  return (
    <View style={styles.inputGroup}>
      <Text className="font-inter mb-2 text-sm font-semibold" style={styles.labelText}>
        Email
      </Text>
      <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" style={styles.inputIcon}>
          <Path
            d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
            stroke={iconColor}
            strokeWidth="1.5"
            fill="none"
          />
          <Path
            d="M22 6l-10 7L2 6"
            stroke={iconColor}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <TextInput
          style={styles.input}
          placeholder="Enter your work email"
          placeholderTextColor="rgba(226,233,255,0.54)"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={onSubmit}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
          importantForAutofill="no"
        />
      </View>
    </View>
  );
}

type PasswordInputProps = {
  password: string;
  passwordFocused: boolean;
  isPasswordVisible: boolean;
  passwordRef: React.RefObject<TextInput | null>;
  setPassword: (v: string) => void;
  setPasswordFocused: (v: boolean) => void;
  setIsPasswordVisible: (v: boolean) => void;
  onSubmit: () => void;
};

function PasswordInput({
  password,
  passwordFocused,
  isPasswordVisible,
  passwordRef,
  setPassword,
  setPasswordFocused,
  setIsPasswordVisible,
  onSubmit,
}: PasswordInputProps) {
  const iconColor = passwordFocused ? '#63B3FF' : 'rgba(226,233,255,0.7)';
  return (
    <View style={styles.inputGroup}>
      <Text className="font-inter mb-2 text-sm font-semibold" style={styles.labelText}>
        Password
      </Text>
      <View style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" style={styles.inputIcon}>
          <Path
            d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"
            stroke={iconColor}
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <TextInput
          ref={passwordRef}
          style={styles.input}
          placeholder="Enter your password"
          placeholderTextColor="rgba(226,233,255,0.54)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!isPasswordVisible}
          autoComplete="password"
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
          importantForAutofill="no"
        />
        <Pressable
          onPress={() => setIsPasswordVisible(!isPasswordVisible)}
          style={styles.eyeButton}
          hitSlop={10}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24">
            {isPasswordVisible ? (
              <>
                <Path
                  d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                  stroke="rgba(226,233,255,0.75)"
                  strokeWidth="1.5"
                  fill="none"
                />
                <Circle
                  cx="12"
                  cy="12"
                  r="3"
                  stroke="rgba(226,233,255,0.75)"
                  strokeWidth="1.5"
                  fill="none"
                />
              </>
            ) : (
              <>
                <Path
                  d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                  stroke="rgba(226,233,255,0.75)"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Path
                  d="M1 1l22 22"
                  stroke="rgba(226,233,255,0.75)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </>
            )}
          </Svg>
        </Pressable>
      </View>
    </View>
  );
}

type SignInButtonProps = {
  email: string;
  password: string;
  isLoading: boolean;
  onPress: () => void;
};

function SignInButton({ email, password, isLoading, onPress }: SignInButtonProps) {
  const disabled = !email || !password;
  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading || disabled}
      style={[styles.signInButtonWrapper, disabled && styles.signInButtonDisabled]}
    >
      <LinearGradient
        colors={disabled ? ['#5F6A84', '#5F6A84'] : ['#2D8CFF', '#3768FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.signInButton}
      >
        {isLoading ? (
          <View style={styles.loadingDots}>
            <View style={[styles.loadingDot, { opacity: 0.3 }]} />
            <View style={[styles.loadingDot, { opacity: 0.6 }]} />
            <View style={[styles.loadingDot, { opacity: 1 }]} />
          </View>
        ) : (
          <Text className="font-inter text-base font-bold text-white">Sign In</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

function RegisterSection({ onPress }: { onPress: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(500).delay(500)} style={styles.registerSection}>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text className="font-inter mx-4 text-xs font-semibold" style={styles.dividerText}>
          NEW TO AVY ERP?
        </Text>
        <View style={styles.dividerLine} />
      </View>
      <Pressable onPress={onPress} style={styles.registerButtonWrapper}>
        <View style={styles.registerButton}>
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path
              d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-4h4v4"
              stroke="#DCE8FF"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
          <Text className="font-inter ml-2 text-sm font-bold" style={styles.registerText}>
            Register Your Company
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.backContainer}>
      <Pressable onPress={onPress} style={styles.backButton}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Polyline
            points="15 18 9 12 15 6"
            stroke="#DCE8FF"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
        <Text className="font-inter ml-1 text-sm font-semibold" style={styles.backText}>
          Back
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function FooterSection() {
  return (
    <Animated.View entering={FadeIn.duration(350).delay(650)} style={styles.footer}>
      <Text className="font-inter text-center text-xs" style={styles.footerText}>
        By signing in, you agree to our{' '}
        <Text className="font-inter text-xs font-semibold" style={styles.footerLink}>
          Terms of Service
        </Text>{' '}
        and{' '}
        <Text className="font-inter text-xs font-semibold" style={styles.footerLink}>
          Privacy Policy
        </Text>
      </Text>
    </Animated.View>
  );
}

export function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
  const [error, setError] = React.useState('');
  const [emailFocused, setEmailFocused] = React.useState(false);
  const [passwordFocused, setPasswordFocused] = React.useState(false);
  const passwordRef = React.useRef<TextInput>(null);
  const loginMutation = useLoginMutation();

  const handleSignIn = async () => {
    if (!email || !password) {
      return;
    }
    setError('');
    try {
      await loginMutation.mutateAsync({ email: email.trim(), password });
      router.replace('/(app)');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Sign in failed. Please try again.';
      setError(message);
    }
  };

  const handleRegisterCompany = () => {
    // TODO: Navigate to company registration flow
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  const handleBackToOnboarding = () => {
    router.replace('/onboarding');
  };

  return (
    <View style={styles.container}>
      <Image
        source={require('../../../assets/illustrations/Login-Screen.png')}
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[
          'rgba(7,20,43,0.05)',
          'rgba(7,20,43,0.15)',
          'rgba(7,20,43,0.6)',
          'rgba(7,20,43,0.92)',
          'rgba(7,20,43,0.98)',
        ]}
        locations={[0, 0.25, 0.45, 0.6, 1]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        style={styles.keyboardView}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + 8,
                paddingBottom: Math.max(20, insets.bottom + 12),
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces={false}
          >
            <BackButton onPress={handleBackToOnboarding} />

            <View style={styles.bottomBlock}>
              <Animated.View entering={FadeInDown.duration(450)} style={styles.welcomeSection}>
                <Text className="font-inter text-3xl font-bold" style={styles.welcomeTitle}>
                  Welcome Back
                </Text>
                <Text className="font-inter text-sm" style={styles.welcomeSubtitle}>
                  Sign in to access your ERP workspace
                </Text>
              </Animated.View>

              <Animated.View entering={FadeInUp.duration(520).delay(120)} style={styles.formCard}>
                <EmailInput
                  email={email}
                  emailFocused={emailFocused}
                  setEmail={setEmail}
                  setEmailFocused={setEmailFocused}
                  onSubmit={() => passwordRef.current?.focus()}
                />
                <PasswordInput
                  password={password}
                  passwordFocused={passwordFocused}
                  isPasswordVisible={isPasswordVisible}
                  passwordRef={passwordRef}
                  setPassword={setPassword}
                  setPasswordFocused={setPasswordFocused}
                  setIsPasswordVisible={setIsPasswordVisible}
                  onSubmit={handleSignIn}
                />
                <Pressable onPress={handleForgotPassword} style={styles.forgotPassword}>
                  <Text className="font-inter text-sm font-semibold" style={styles.forgotText}>
                    Forgot Password?
                  </Text>
                </Pressable>
                <SignInButton
                  email={email}
                  password={password}
                  isLoading={loginMutation.isPending}
                  onPress={handleSignIn}
                />
              </Animated.View>

              <RegisterSection onPress={handleRegisterCompany} />
              <FooterSection />
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#07142B',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: SCREEN_HEIGHT,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  backContainer: {
    width: '100%',
    marginBottom: 14,
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(8,20,44,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(167,196,255,0.26)',
  },
  backText: {
    color: '#DCE8FF',
  },
  bottomBlock: {
    width: '100%',
    marginTop: 22,
  },
  welcomeSection: {
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  welcomeTitle: {
    color: '#F6F8FF',
    marginBottom: 4,
  },
  welcomeSubtitle: {
    color: 'rgba(220,232,255,0.74)',
    lineHeight: 20,
  },
  formCard: {
    width: '100%',
    backgroundColor: 'rgba(10,27,59,0.72)',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,196,255,0.22)',
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelText: {
    color: '#EAF1FF',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(167,196,255,0.20)',
    paddingHorizontal: 14,
    height: 52,
  },
  inputWrapperFocused: {
    borderColor: '#4EA2FF',
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#F5F8FF',
    height: '100%',
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 18,
  },
  forgotText: {
    color: '#77B7FF',
  },
  signInButtonWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#2D8CFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 8,
  },
  signInButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  signInButton: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  registerSection: {
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(182,205,255,0.26)',
  },
  dividerText: {
    color: 'rgba(220,232,255,0.65)',
  },
  registerButtonWrapper: {
    width: '100%',
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(182,205,255,0.38)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  registerText: {
    color: '#E5EEFF',
  },
  footer: {
    marginTop: 14,
    paddingHorizontal: 8,
  },
  footerText: {
    color: 'rgba(220,232,255,0.62)',
    lineHeight: 18,
  },
  footerLink: {
    color: '#7FBFFF',
  },
});
