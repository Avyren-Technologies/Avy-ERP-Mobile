/* eslint-disable react-refresh/only-export-components */
import Svg from 'react-native-svg';
import { withUniwind } from 'uniwind';

export * from './button';
export * from './checkbox';
export { default as colors } from './colors';
export * from './confirm-modal';
export * from './empty-state';
export * from './focus-aware-status-bar';
export * from './image';
export * from './image-viewer';
export * from './info-tooltip';
export * from './input';
export * from './list';
export * from './modal';
export * from './no-permission-screen';
export * from './progress-bar';
export * from './r2-image';
export * from './select';
export * from './sidebar';
export * from './skeleton';
export * from './text';
export * from './utils';
export { AppUpdateGate } from './app-update-gate';
export { OtaUpdateScreen } from './ota-update-screen';

// export base components from react-native
export {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
export { SafeAreaView } from 'react-native-safe-area-context';

// Apply withUniwind to Svg to add className support
export const StyledSvg = withUniwind(Svg);
