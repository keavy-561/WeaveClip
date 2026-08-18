import React, { PropsWithChildren } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from '@douyinfe/semi-ui';
import { I18nextProvider } from 'react-i18next';
import { create } from 'zustand';
import i18n from '@/locales';

// Create a new QueryClient for each test to avoid state leakage
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });
}

// Wrapper providers
export function Wrapper({ children }: PropsWithChildren) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ConfigProvider>
          <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        </ConfigProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

// Custom render function
export function customRender(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: Wrapper, ...options });
}

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// Mock store factory for testing
export function createMockStore<T extends object>(
  initializer: () => T
): { useStore: ReturnType<typeof create<T>> } {
  const useStore = create<T>(initializer);
  return { useStore };
}

// Mock API response helper
export function mockApiResponse<T>(data: T, delay = 0) {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}
