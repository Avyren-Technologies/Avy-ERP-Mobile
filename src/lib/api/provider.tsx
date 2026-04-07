/* eslint-disable react-refresh/only-export-components */
import { useReactQueryDevTools } from '@dev-plugins/react-query';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

// Disable refetchOnWindowFocus on mobile — use AppState listener instead
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    handleFocus(state === 'active');
  });
  return () => subscription.remove();
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // 5 minutes — data is fresh, no refetch on mount
      gcTime: 30 * 60 * 1000,          // 30 minutes — keep unused data in cache
      refetchOnWindowFocus: false,      // Don't refetch when app comes to foreground
      refetchOnReconnect: true,         // Do refetch when network reconnects
      retry: 2,                         // Retry failed requests twice
    },
  },
});

export function APIProvider({ children }: { children: React.ReactNode }) {
  useReactQueryDevTools(queryClient);
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
