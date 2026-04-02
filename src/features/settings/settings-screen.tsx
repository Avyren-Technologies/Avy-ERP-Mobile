/* eslint-disable better-tailwindcss/no-unknown-classes */
import Env from 'env';
import { LinearGradient } from 'expo-linear-gradient';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import {
  ChevronRight,
  Fingerprint,
  Globe,
  KeyRound,
  LogOut,
  Moon,
  Shield,
  User,
} from 'lucide-react-native';
import * as React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import {
  getDisplayName,
  getRoleLabel,
  getUserInitials,
  useAuthStore,
} from '@/features/auth/use-auth-store';
import { authApi } from '@/lib/api/auth';
import { getToken } from '@/lib/auth/utils';
import { getItem, removeItem, setItem } from '@/lib/storage';

import { LanguageItem } from './components/language-item';
import { ThemeItem } from './components/theme-item';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_TOKEN_KEY = 'biometric_token';

export function SettingsScreen() {
  const signOut = useAuthStore.use.signOut();
  const user = useAuthStore.use.user();
  const userRole = useAuthStore.use.userRole();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const displayName = getDisplayName(user);
  const initials = getUserInitials(user);
  const roleLabel = getRoleLabel(userRole);

  const [biometricAvailable, setBiometricAvailable] = React.useState(false);
  const [biometricEnabled, setBiometricEnabled] = React.useState(false);
  const [biometricToggling, setBiometricToggling] = React.useState(false);
  const [mfaSetupLoading, setMfaSetupLoading] = React.useState(false);

  // Check biometric hardware availability and current toggle state
  React.useEffect(() => {
    async function checkBiometric() {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(hasHardware && isEnrolled);
      } catch {
        setBiometricAvailable(false);
      }
      const enabled = getItem<boolean>(BIOMETRIC_ENABLED_KEY);
      setBiometricEnabled(enabled === true);
    }
    checkBiometric();
  }, []);

  const handleToggleBiometric = async (value: boolean) => {
    if (biometricToggling) return;
    setBiometricToggling(true);

    try {
      if (value) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Enable biometric login for Avy ERP',
          cancelLabel: 'Cancel',
          disableDeviceFallback: true,
        });

        if (result.success) {
          const tokenData = getToken();
          if (tokenData?.refresh) {
            await setItem(BIOMETRIC_TOKEN_KEY, tokenData.refresh);
            await setItem(BIOMETRIC_ENABLED_KEY, true);
            setBiometricEnabled(true);
            showSuccess('Biometric Login Enabled', 'You can now sign in with biometrics.');
          } else {
            showErrorMessage('Unable to enable biometric login. Please sign in again.');
          }
        }
      } else {
        await removeItem(BIOMETRIC_TOKEN_KEY);
        await removeItem(BIOMETRIC_ENABLED_KEY);
        setBiometricEnabled(false);
        showSuccess('Biometric Login Disabled');
      }
    } catch {
      showErrorMessage('Failed to update biometric setting.');
    } finally {
      setBiometricToggling(false);
    }
  };

  const handleMfaSetup = async () => {
    if (mfaSetupLoading) return;
    setMfaSetupLoading(true);

    try {
      const response = await authApi.setupMfa();
      if (response.success && response.data) {
        router.push({
          pathname: '/mfa-setup-voluntary',
          params: {
            qrCodeDataUrl: response.data.qrCodeDataUrl,
            secret: response.data.secret,
          },
        });
      } else {
        showErrorMessage('Failed to initiate MFA setup. Please try again.');
      }
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to initiate MFA setup.';
      showErrorMessage(message);
    } finally {
      setMfaSetupLoading(false);
    }
  };

  const handleChangePassword = () => {
    router.push('/change-password');
  };

  const handleProfilePress = () => {
    router.navigate('/company/hr/my-profile' as any);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[colors.gradient.surface, colors.white]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        bounces={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <Text className="font-inter text-2xl font-bold text-primary-950">Settings</Text>
          <Text className="mt-1 font-inter text-sm text-neutral-500">Preferences & Security</Text>
        </Animated.View>

        {/* Profile Card */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <Pressable
            onPress={handleProfilePress}
            style={({ pressed }) => [styles.profileCard, pressed && styles.profileCardPressed]}
          >
            <LinearGradient
              colors={[colors.gradient.start, colors.gradient.end]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.profileGradient}
            >
              <View style={styles.profileDecor1} />
              <View style={styles.profileDecor2} />
              <View style={styles.profileContent}>
                <LinearGradient
                  colors={[colors.accent[300], colors.primary[400]]}
                  style={styles.profileAvatar}
                >
                  <Text className="font-inter text-xl font-bold text-white">{initials}</Text>
                </LinearGradient>
                <View style={styles.profileInfo}>
                  <Text className="font-inter text-base font-bold text-white">{displayName}</Text>
                  <Text className="font-inter text-xs text-primary-200">{user?.email ?? ''}</Text>
                  <View style={styles.roleBadge}>
                    <Text className="font-inter text-[10px] font-semibold text-white">{roleLabel}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="rgba(255,255,255,0.6)" />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Security Section */}
        <Animated.View entering={FadeInUp.duration(300).delay(200)} style={styles.section}>
          <Text className="font-inter text-xs font-bold uppercase tracking-widest text-neutral-400" style={styles.sectionTitle}>
            Security
          </Text>

          {/* Two-Factor Authentication */}
          <Pressable
            onPress={handleMfaSetup}
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          >
            <LinearGradient
              colors={[colors.primary[500], colors.primary[700]]}
              style={styles.menuIcon}
            >
              <Shield size={20} color={colors.white} />
            </LinearGradient>
            <View style={styles.menuContent}>
              <Text className="font-inter text-sm font-bold text-primary-950">
                Two-Factor Authentication
              </Text>
              <Text className="font-inter text-xs text-neutral-500">
                {mfaSetupLoading ? 'Loading...' : 'Set up or reset authenticator app'}
              </Text>
            </View>
            <ChevronRight size={16} color={colors.neutral[400]} />
          </Pressable>

          {/* Biometric Login */}
          {biometricAvailable && (
            <Pressable
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              onPress={() => handleToggleBiometric(!biometricEnabled)}
            >
              <LinearGradient
                colors={[colors.accent[500], colors.accent[700]]}
                style={styles.menuIcon}
              >
                <Fingerprint size={20} color={colors.white} />
              </LinearGradient>
              <View style={styles.menuContent}>
                <Text className="font-inter text-sm font-bold text-primary-950">
                  Biometric Login
                </Text>
                <Text className="font-inter text-xs text-neutral-500">
                  Sign in with Face ID or fingerprint
                </Text>
              </View>
              <Switch
                value={biometricEnabled}
                onValueChange={handleToggleBiometric}
                disabled={biometricToggling}
                trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
                thumbColor={colors.white}
              />
            </Pressable>
          )}

          {/* Change Password */}
          <Pressable
            onPress={handleChangePassword}
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
          >
            <LinearGradient
              colors={[colors.info[500], colors.info[700]]}
              style={styles.menuIcon}
            >
              <KeyRound size={20} color={colors.white} />
            </LinearGradient>
            <View style={styles.menuContent}>
              <Text className="font-inter text-sm font-bold text-primary-950">
                Change Password
              </Text>
              <Text className="font-inter text-xs text-neutral-500">
                Update your account password
              </Text>
            </View>
            <ChevronRight size={16} color={colors.neutral[400]} />
          </Pressable>
        </Animated.View>

        {/* Preferences Section */}
        <Animated.View entering={FadeInUp.duration(300).delay(300)} style={styles.section}>
          <Text className="font-inter text-xs font-bold uppercase tracking-widest text-neutral-400" style={styles.sectionTitle}>
            Preferences
          </Text>

          {/* Language — wrapped in card style */}
          <View style={styles.menuItem}>
            <LinearGradient
              colors={[colors.primary[500], colors.accent[500]]}
              style={styles.menuIcon}
            >
              <Globe size={20} color={colors.white} />
            </LinearGradient>
            <View style={styles.menuContent}>
              <LanguageItem />
            </View>
          </View>

          {/* Theme — wrapped in card style */}
          <View style={styles.menuItem}>
            <LinearGradient
              colors={[colors.accent[600], colors.primary[700]]}
              style={styles.menuIcon}
            >
              <Moon size={20} color={colors.white} />
            </LinearGradient>
            <View style={styles.menuContent}>
              <ThemeItem />
            </View>
          </View>
        </Animated.View>

        {/* App Info Section */}
        <Animated.View entering={FadeInUp.duration(300).delay(400)} style={styles.section}>
          <Text className="font-inter text-xs font-bold uppercase tracking-widest text-neutral-400" style={styles.sectionTitle}>
            App Info
          </Text>

          <View style={styles.menuItem}>
            <LinearGradient
              colors={[colors.neutral[500], colors.neutral[600]]}
              style={styles.menuIcon}
            >
              <User size={20} color={colors.white} />
            </LinearGradient>
            <View style={styles.menuContent}>
              <Text className="font-inter text-sm font-bold text-primary-950">App Name</Text>
              <Text className="font-inter text-xs text-neutral-500">{Env.EXPO_PUBLIC_NAME}</Text>
            </View>
          </View>

          <View style={styles.menuItem}>
            <LinearGradient
              colors={[colors.neutral[400], colors.neutral[600]]}
              style={styles.menuIcon}
            >
              <Text className="font-inter text-xs font-bold text-white">v</Text>
            </LinearGradient>
            <View style={styles.menuContent}>
              <Text className="font-inter text-sm font-bold text-primary-950">Version</Text>
              <Text className="font-inter text-xs text-neutral-500">{Env.EXPO_PUBLIC_VERSION}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Sign Out Button */}
        <Animated.View entering={FadeInUp.duration(300).delay(500)} style={styles.signOutSection}>
          <Pressable onPress={signOut} style={styles.signOutButton}>
            <LinearGradient
              colors={[colors.danger[500], colors.danger[600]]}
              style={styles.signOutGradient}
            >
              <LogOut size={18} color={colors.white} />
              <Text className="ml-2 font-inter text-sm font-bold text-white">Sign Out</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ============ STYLES ============

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gradient.surface,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 4,
  },
  // Profile Card
  profileCard: {
    marginHorizontal: 24,
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  profileCardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  profileGradient: {
    padding: 20,
    overflow: 'hidden',
  },
  profileDecor1: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  profileDecor2: {
    position: 'absolute',
    bottom: -10,
    left: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  profileContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    marginRight: 14,
  },
  profileInfo: {
    flex: 1,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  // Sections
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 10,
  },
  sectionTitle: {
    marginBottom: 2,
    marginLeft: 4,
  },
  // Menu items (card style)
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: 14,
    shadowColor: colors.primary[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    borderWidth: 1,
    borderColor: colors.primary[50],
  },
  menuItemPressed: {
    backgroundColor: colors.primary[50],
    transform: [{ scale: 0.98 }],
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
    gap: 2,
  },
  // Sign Out
  signOutSection: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  signOutButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.danger[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
  },
});
