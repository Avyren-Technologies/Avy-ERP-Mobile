/* eslint-disable better-tailwindcss/no-unknown-classes */
import { Redirect, SplashScreen, Tabs } from 'expo-router';
import * as React from 'react';
import { useCallback, useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { useAuthStore as useAuth } from '@/features/auth/use-auth-store';
import { useIsFirstTime } from '@/lib/hooks/use-is-first-time';

// ============ TAB ICON COMPONENTS ============

function DashboardIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.tabIconContainer}>
      {focused && <View style={styles.tabActiveIndicator} />}
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Rect x="3" y="3" width="7" height="7" rx="2" fill={focused ? colors.primary[500] : 'none'} stroke={color} strokeWidth="1.8" />
        <Rect x="14" y="3" width="7" height="7" rx="2" fill={focused ? colors.primary[500] : 'none'} stroke={color} strokeWidth="1.8" opacity={focused ? 0.7 : 1} />
        <Rect x="3" y="14" width="7" height="7" rx="2" fill={focused ? colors.primary[500] : 'none'} stroke={color} strokeWidth="1.8" opacity={focused ? 0.7 : 1} />
        <Rect x="14" y="14" width="7" height="7" rx="2" fill={focused ? colors.primary[500] : 'none'} stroke={color} strokeWidth="1.8" opacity={focused ? 0.5 : 1} />
      </Svg>
    </View>
  );
}

function CompaniesIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.tabIconContainer}>
      {focused && <View style={styles.tabActiveIndicator} />}
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Path
          d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M8 11h2M14 11h2M8 15h2M14 15h2"
          stroke={color}
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

function BillingIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.tabIconContainer}>
      {focused && <View style={styles.tabActiveIndicator} />}
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Rect x="1" y="4" width="22" height="16" rx="2" stroke={color} strokeWidth="1.8" fill={focused ? colors.primary[500] : 'none'} />
        <Path d="M1 10h22" stroke={focused ? 'rgba(255,255,255,0.5)' : color} strokeWidth="1.8" />
      </Svg>
    </View>
  );
}

function MoreIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.tabIconContainer}>
      {focused && <View style={styles.tabActiveIndicator} />}
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <Circle cx="12" cy="5" r="2" fill={color} />
        <Circle cx="12" cy="12" r="2" fill={color} />
        <Circle cx="12" cy="19" r="2" fill={color} />
      </Svg>
    </View>
  );
}

// ============ TAB LAYOUT ============

export default function TabLayout() {
  const status = useAuth.use.status();
  const [isFirstTime] = useIsFirstTime();

  const hideSplash = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    if (status !== 'idle') {
      const timer = setTimeout(() => {
        hideSplash();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hideSplash, status]);

  if (isFirstTime) {
    return <Redirect href="/onboarding" />;
  }
  if (status === 'signOut') {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: colors.primary[900],
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          height: Platform.OS === 'ios' ? 88 : 68,
          paddingTop: 8,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
        },
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.neutral[400],
        tabBarLabelStyle: {
          fontFamily: 'Inter',
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <DashboardIcon color={color} focused={focused} />
          ),
          tabBarButtonTestID: 'dashboard-tab',
        }}
      />
      <Tabs.Screen
        name="companies"
        options={{
          title: 'Companies',
          tabBarIcon: ({ color, focused }) => (
            <CompaniesIcon color={color} focused={focused} />
          ),
          tabBarButtonTestID: 'companies-tab',
        }}
      />
      <Tabs.Screen
        name="billing"
        options={{
          title: 'Billing',
          tabBarIcon: ({ color, focused }) => (
            <BillingIcon color={color} focused={focused} />
          ),
          tabBarButtonTestID: 'billing-tab',
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ color, focused }) => (
            <MoreIcon color={color} focused={focused} />
          ),
          tabBarButtonTestID: 'more-tab',
        }}
      />

      {/* Hidden screens (accessible via navigation but not shown in tab bar) */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="tenant/[id]"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="tenant/add-company"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="tenant/module-assignment"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabActiveIndicator: {
    position: 'absolute',
    top: -12,
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.primary[500],
  },
});
