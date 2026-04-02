/* eslint-disable better-tailwindcss/no-unknown-classes */
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Stack } from 'expo-router';
import { KeyRound } from 'lucide-react-native';
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
import Svg, { Polyline } from 'react-native-svg';

import { Text } from '@/components/ui';
import colors from '@/components/ui/colors';
import { showErrorMessage, showSuccess } from '@/components/ui/utils';
import { useChangePasswordMutation } from '@/features/auth/use-auth-mutations';
import { createLogger } from '@/lib/logger';

const logger = createLogger('ChangePasswordScreen');

export function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const changePasswordMutation = useChangePasswordMutation();

  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const newPasswordRef = React.useRef<TextInput>(null);
  const confirmPasswordRef = React.useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (!currentPassword) {
      showErrorMessage('Please enter your current password.');
      return;
    }
    if (!newPassword) {
      showErrorMessage('Please enter a new password.');
      return;
    }
    if (newPassword.length < 8) {
      showErrorMessage('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showErrorMessage('New passwords do not match.');
      return;
    }

    try {
      await changePasswordMutation.mutateAsync({ currentPassword, newPassword });
      showSuccess('Password Changed', 'Your password has been updated successfully.');
      logger.info('Password changed successfully');
      router.back();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to change password. Please try again.';
      showErrorMessage(message);
    }
  };

  const handleGoBack = () => {
    router.back();
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
          <KeyRound size={32} color="#FFFFFF" strokeWidth={1.5} />
          <Text className="font-inter mt-2 text-xl font-bold text-white">
            Change Password
          </Text>
          <Text className="font-inter mt-1 text-center text-sm text-white/80">
            Update your account password
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
              <View style={styles.inputGroup}>
                <Text className="font-inter mb-2 text-sm font-semibold" style={styles.labelText}>
                  Current Password
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.neutral[400]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                  autoComplete="password"
                  returnKeyType="next"
                  onSubmitEditing={() => newPasswordRef.current?.focus()}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text className="font-inter mb-2 text-sm font-semibold" style={styles.labelText}>
                  New Password
                </Text>
                <TextInput
                  ref={newPasswordRef}
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor={colors.neutral[400]}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text className="font-inter mb-2 text-sm font-semibold" style={styles.labelText}>
                  Confirm New Password
                </Text>
                <TextInput
                  ref={confirmPasswordRef}
                  style={styles.input}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.neutral[400]}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoComplete="new-password"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              <Pressable
                onPress={handleSubmit}
                disabled={changePasswordMutation.isPending}
                style={[
                  styles.submitButton,
                  changePasswordMutation.isPending && styles.submitButtonDisabled,
                ]}
              >
                <LinearGradient
                  colors={
                    changePasswordMutation.isPending
                      ? [colors.neutral[400], colors.neutral[400]]
                      : [colors.primary[500], colors.primary[700]]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitButtonGradient}
                >
                  <Text className="font-inter text-base font-bold text-white">
                    {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                  </Text>
                </LinearGradient>
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
  formSection: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  labelText: {
    color: colors.primary[800],
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary[200],
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.primary[800],
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  submitButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonGradient: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
