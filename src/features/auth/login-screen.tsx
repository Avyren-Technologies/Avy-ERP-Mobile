/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as React from 'react';
import {
    Dimensions,
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
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { signIn } from '@/features/auth/use-auth-store';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Logo Component
function AvyLogo() {
    return (
        <View style={styles.logoContainer}>
            <LinearGradient
                colors={[colors.gradient.start, colors.gradient.end]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logoGradient}
            >
                <Svg width={32} height={32} viewBox="0 0 32 32">
                    <Defs>
                        <SvgLinearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                            <Stop offset="100%" stopColor="#E0E7FF" stopOpacity="0.9" />
                        </SvgLinearGradient>
                    </Defs>
                    {/* A letter stylized */}
                    <Path
                        d="M16 4 L26 28 L22 28 L20 22 L12 22 L10 28 L6 28 L16 4Z M16 10 L13 19 L19 19 L16 10Z"
                        fill="url(#logoGrad)"
                    />
                </Svg>
            </LinearGradient>
        </View>
    );
}

export function LoginScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [isPasswordVisible, setPasswordVisible] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [emailFocused, setEmailFocused] = React.useState(false);
    const [passwordFocused, setPasswordFocused] = React.useState(false);

    const passwordRef = React.useRef<TextInput>(null);

    const handleSignIn = async () => {
        if (!email || !password) return;
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            signIn({ access: 'mock-access-token', refresh: 'mock-refresh-token' }, 'super-admin');
            setIsLoading(false);
            // Navigate to main app after successful sign in
            router.replace('/(app)');
        }, 1200);
    };

    const handleRegisterCompany = () => {
        // TODO: Navigate to company registration flow
    };

    return (
        <View style={[styles.container]}>
            {/* Background gradient */}
            <LinearGradient
                colors={[colors.gradient.surface, colors.white, colors.accent[50]]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            />

            {/* Decorative background elements */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />
            <View style={styles.bgGlowTop} />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'position' : 'height'}
                style={styles.keyboardView}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        contentContainerStyle={[
                            styles.scrollContent,
                            {
                                paddingTop: insets.top + 40,
                                paddingBottom: insets.bottom + 24,
                            },
                        ]}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        bounces={false}
                    >
                    {/* Header Section */}
                    <Animated.View
                        entering={FadeInDown.duration(600)}
                        style={styles.headerSection}
                    >
                        <AvyLogo />
                        <Text className="mt-4 font-inter text-base font-semibold tracking-wider text-primary-400">
                            AVY ERP
                        </Text>
                    </Animated.View>

                    {/* Welcome Text */}
                    <Animated.View
                        entering={FadeInUp.duration(500).delay(200)}
                        style={styles.welcomeSection}
                    >
                        <Text className="mb-2 font-inter text-3xl font-bold text-primary-950 dark:text-white">
                            Welcome Back
                        </Text>
                        <Text className="font-inter text-base text-neutral-500 dark:text-neutral-400">
                            Sign in to manage your enterprise
                        </Text>
                    </Animated.View>

                    {/* Form Card */}
                    <Animated.View
                        entering={FadeInUp.duration(500).delay(350)}
                        style={styles.formCard}
                    >
                        {/* Email Input */}
                        <View style={styles.inputGroup}>
                            <Text className="mb-2 font-inter text-sm font-semibold text-primary-900 dark:text-primary-200">
                                Email or Phone
                            </Text>
                            <View
                                style={[
                                    styles.inputWrapper,
                                    emailFocused && styles.inputWrapperFocused,
                                ]}
                            >
                                {/* Email Icon */}
                                <Svg width={20} height={20} viewBox="0 0 24 24" style={styles.inputIcon}>
                                    <Path
                                        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
                                        stroke={emailFocused ? colors.primary[500] : colors.neutral[400]}
                                        strokeWidth="1.5"
                                        fill="none"
                                    />
                                    <Path
                                        d="M22 6l-10 7L2 6"
                                        stroke={emailFocused ? colors.primary[500] : colors.neutral[400]}
                                        strokeWidth="1.5"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email or phone"
                                    placeholderTextColor={colors.neutral[400]}
                                    value={email}
                                    onChangeText={setEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                    autoComplete="email"
                                    returnKeyType="next"
                                    onSubmitEditing={() => passwordRef.current?.focus()}
                                    onFocus={() => setEmailFocused(true)}
                                    onBlur={() => setEmailFocused(false)}
                                    importantForAutofill="no"
                                />
                            </View>
                        </View>

                        {/* Password Input */}
                        <View style={styles.inputGroup}>
                            <Text className="mb-2 font-inter text-sm font-semibold text-primary-900 dark:text-primary-200">
                                Password
                            </Text>
                            <View
                                style={[
                                    styles.inputWrapper,
                                    passwordFocused && styles.inputWrapperFocused,
                                ]}
                            >
                                {/* Lock Icon */}
                                <Svg width={20} height={20} viewBox="0 0 24 24" style={styles.inputIcon}>
                                    <Path
                                        d="M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4"
                                        stroke={passwordFocused ? colors.primary[500] : colors.neutral[400]}
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
                                    placeholderTextColor={colors.neutral[400]}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!isPasswordVisible}
                                    autoComplete="password"
                                    returnKeyType="done"
                                    onSubmitEditing={handleSignIn}
                                    onFocus={() => setPasswordFocused(true)}
                                    onBlur={() => setPasswordFocused(false)}
                                    importantForAutofill="no"
                                />
                                {/* Eye Toggle */}
                                <Pressable
                                    onPress={() => setPasswordVisible(!isPasswordVisible)}
                                    style={styles.eyeButton}
                                    hitSlop={10}
                                >
                                    <Svg width={20} height={20} viewBox="0 0 24 24">
                                        {isPasswordVisible ? (
                                            <>
                                                <Path
                                                    d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
                                                    stroke={colors.neutral[400]}
                                                    strokeWidth="1.5"
                                                    fill="none"
                                                />
                                                <Circle cx="12" cy="12" r="3" stroke={colors.neutral[400]} strokeWidth="1.5" fill="none" />
                                            </>
                                        ) : (
                                            <>
                                                <Path
                                                    d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"
                                                    stroke={colors.neutral[400]}
                                                    strokeWidth="1.5"
                                                    fill="none"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                />
                                                <Path d="M1 1l22 22" stroke={colors.neutral[400]} strokeWidth="1.5" strokeLinecap="round" />
                                            </>
                                        )}
                                    </Svg>
                                </Pressable>
                            </View>
                        </View>

                        {/* Forgot Password */}
                        <Pressable style={styles.forgotPassword}>
                            <Text className="font-inter text-sm font-semibold text-primary-500">
                                Forgot Password?
                            </Text>
                        </Pressable>

                        {/* Sign In Button */}
                        <Pressable
                            onPress={handleSignIn}
                            disabled={isLoading || !email || !password}
                            style={[
                                styles.signInButtonWrapper,
                                (!email || !password) && styles.signInButtonDisabled,
                            ]}
                        >
                            <LinearGradient
                                colors={
                                    !email || !password
                                        ? [colors.neutral[300], colors.neutral[300]]
                                        : [colors.gradient.start, colors.gradient.end]
                                }
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
                                    <Text className="font-inter text-base font-bold text-white">
                                        Sign In
                                    </Text>
                                )}
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>

                    {/* Register Company Section */}
                    <Animated.View
                        entering={FadeIn.duration(500).delay(600)}
                        style={styles.registerSection}
                    >
                        <View style={styles.divider}>
                            <View style={styles.dividerLine} />
                            <Text className="mx-4 font-inter text-xs font-medium text-neutral-400">
                                NEW TO AVY ERP?
                            </Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <Pressable
                            onPress={handleRegisterCompany}
                            style={styles.registerButtonWrapper}
                        >
                            <View style={styles.registerButton}>
                                {/* Building Icon */}
                                <Svg width={20} height={20} viewBox="0 0 24 24">
                                    <Path
                                        d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-4h4v4"
                                        stroke={colors.primary[500]}
                                        strokeWidth="1.5"
                                        fill="none"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                                <Text className="ml-2 font-inter text-sm font-bold text-primary-600">
                                    Register Your Company
                                </Text>
                            </View>
                        </Pressable>
                    </Animated.View>

                    {/* Footer */}
                    <Animated.View
                        entering={FadeIn.duration(400).delay(700)}
                        style={styles.footer}
                    >
                        <Text className="text-center font-inter text-xs text-neutral-400">
                            By signing in, you agree to our{' '}
                            <Text className="text-xs font-semibold text-primary-500">Terms of Service</Text>
                            {' '}and{' '}
                            <Text className="text-xs font-semibold text-primary-500">Privacy Policy</Text>
                        </Text>
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
        backgroundColor: colors.gradient.surface,
    },
    bgCircle1: {
        position: 'absolute',
        top: -100,
        right: -80,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: colors.primary[100],
        opacity: 0.3,
    },
    bgCircle2: {
        position: 'absolute',
        bottom: 50,
        left: -100,
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: colors.accent[100],
        opacity: 0.2,
    },
    bgGlowTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: SCREEN_HEIGHT * 0.35,
        backgroundColor: colors.primary[50],
        opacity: 0.3,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    logoGradient: {
        width: 64,
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
    },
    welcomeSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    formCard: {
        width: '100%',
        backgroundColor: colors.white,
        borderRadius: 24,
        padding: 24,
        shadowColor: colors.primary[900],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 20,
        elevation: 3,
        borderWidth: 1,
        borderColor: colors.primary[50],
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.neutral[50],
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: colors.neutral[200],
        paddingHorizontal: 14,
        height: 52,
    },
    inputWrapperFocused: {
        borderColor: colors.primary[400],
        backgroundColor: colors.primary[50],
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: colors.primary[950],
        height: '100%',
    },
    eyeButton: {
        padding: 4,
        marginLeft: 8,
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 24,
        marginTop: -8,
    },
    signInButtonWrapper: {
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
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
        marginTop: 32,
        alignItems: 'center',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 20,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.neutral[200],
    },
    registerButtonWrapper: {
        width: '100%',
    },
    registerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 52,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.primary[200],
        borderStyle: 'dashed',
        backgroundColor: colors.primary[50],
    },
    footer: {
        marginTop: 32,
        paddingHorizontal: 16,
    },
});
