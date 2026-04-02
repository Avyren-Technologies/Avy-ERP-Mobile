import Env from 'env';
import * as LocalAuthentication from 'expo-local-authentication';
import { useRouter } from 'expo-router';
import { Fingerprint, KeyRound, Shield } from 'lucide-react-native';
import * as React from 'react';
import { Switch } from 'react-native';
import { useUniwind } from 'uniwind';

import {
  colors,
  FocusAwareStatusBar,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { Github, Rate, Share, Support, Website } from '@/components/ui/icons';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useAuthStore as useAuth } from '@/features/auth/use-auth-store';
import { authApi } from '@/lib/api/auth';
import { getToken } from '@/lib/auth/utils';
import { translate } from '@/lib/i18n';
import { getItem, removeItem, setItem } from '@/lib/storage';
import { LanguageItem } from './components/language-item';
import { SettingsContainer } from './components/settings-container';
import { SettingsItem } from './components/settings-item';
import { ThemeItem } from './components/theme-item';

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_TOKEN_KEY = 'biometric_token';

export function SettingsScreen() {
  const signOut = useAuth.use.signOut();
  const router = useRouter();
  const { theme } = useUniwind();
  const iconColor
    = theme === 'dark' ? colors.neutral[400] : colors.neutral[500];

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
        // Prompt biometric to confirm
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
      // Call setupMfa without mfaToken (uses Bearer token from authenticated session)
      const response = await authApi.setupMfa();
      if (response.success && response.data) {
        // Navigate to MFA setup screen with the setup data as params
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

  return (
    <>
      <FocusAwareStatusBar />

      <ScrollView>
        <View className="flex-1 px-4 pt-16">
          <Text className="text-xl font-bold">
            {translate('settings.title')}
          </Text>
          <SettingsContainer title="settings.generale">
            <LanguageItem />
            <ThemeItem />
          </SettingsContainer>

          <SettingsContainer title="settings.security">
            <SettingsItem
              text="settings.two_factor_auth"
              icon={<Shield size={20} color={iconColor} />}
              onPress={handleMfaSetup}
              value={mfaSetupLoading ? 'Loading...' : 'Set Up'}
            />
            {biometricAvailable && (
              <View className="flex-1 flex-row items-center justify-between px-4 py-2">
                <View className="flex-row items-center">
                  <View className="pr-2">
                    <Fingerprint size={20} color={iconColor} />
                  </View>
                  <Text className="font-inter">
                    {translate('settings.biometric_login')}
                  </Text>
                </View>
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleToggleBiometric}
                  disabled={biometricToggling}
                  trackColor={{ false: colors.neutral[300], true: colors.primary[500] }}
                  thumbColor={colors.white}
                />
              </View>
            )}
            <SettingsItem
              text="settings.change_password"
              icon={<KeyRound size={20} color={iconColor} />}
              onPress={handleChangePassword}
            />
          </SettingsContainer>

          <SettingsContainer title="settings.about">
            <SettingsItem
              text="settings.app_name"
              value={Env.EXPO_PUBLIC_NAME}
            />
            <SettingsItem
              text="settings.version"
              value={Env.EXPO_PUBLIC_VERSION}
            />
          </SettingsContainer>

          <SettingsContainer title="settings.support_us">
            <SettingsItem
              text="settings.share"
              icon={<Share color={iconColor} />}
              onPress={() => {}}
            />
            <SettingsItem
              text="settings.rate"
              icon={<Rate color={iconColor} />}
              onPress={() => {}}
            />
            <SettingsItem
              text="settings.support"
              icon={<Support color={iconColor} />}
              onPress={() => {}}
            />
          </SettingsContainer>

          <SettingsContainer title="settings.links">
            <SettingsItem text="settings.privacy" onPress={() => {}} />
            <SettingsItem text="settings.terms" onPress={() => {}} />
            <SettingsItem
              text="settings.github"
              icon={<Github color={iconColor} />}
              onPress={() => {}}
            />
            <SettingsItem
              text="settings.website"
              icon={<Website color={iconColor} />}
              onPress={() => {}}
            />
          </SettingsContainer>

          <View className="my-8">
            <SettingsContainer>
              <SettingsItem text="settings.logout" onPress={signOut} />
            </SettingsContainer>
          </View>
        </View>
      </ScrollView>
    </>
  );
}
