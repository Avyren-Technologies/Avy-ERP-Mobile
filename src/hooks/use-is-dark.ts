import { useTheme } from '@react-navigation/native';

/**
 * Returns `true` when the app is in dark mode.
 * Uses React Navigation's ThemeProvider so it works in every screen without extra imports.
 */
export function useIsDark() {
  const { dark } = useTheme();
  return dark === true;
}
