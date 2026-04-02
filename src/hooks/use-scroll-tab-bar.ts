import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useCallback, useRef } from 'react';

import { useTabBarVisibility } from '@/app/(app)/_layout';

/**
 * Hook for screens to auto-hide/show the tab bar based on scroll direction.
 * Usage: <ScrollView onScroll={onScroll} scrollEventThrottle={16}>
 */
export function useScrollTabBar() {
    const { hide, show } = useTabBarVisibility();
    const lastOffsetYRef = useRef(0);
    const lastDirectionRef = useRef<'up' | 'down'>('up');

    const onScroll = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            const currentY = event.nativeEvent.contentOffset.y;
            const direction = currentY > lastOffsetYRef.current ? 'down' : 'up';

            // Only trigger on direction change and with minimum delta
            if (direction !== lastDirectionRef.current && Math.abs(currentY - lastOffsetYRef.current) > 5) {
                lastDirectionRef.current = direction;
                if (direction === 'down' && currentY > 50) {
                    hide();
                } else {
                    show();
                }
            }

            lastOffsetYRef.current = currentY;
        },
        [hide, show],
    );

    return { onScroll, scrollEventThrottle: 16 } as const;
}
