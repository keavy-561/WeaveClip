import { PropsWithChildren } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from '@douyinfe/semi-ui';
import { I18nProvider } from '@/contexts/I18nContext';
import { create } from 'zustand';

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

export function Wrapper({ children }: PropsWithChildren) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ConfigProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </ConfigProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export function createMockStore<T extends object>(initializer: () => T): { useStore: () => T } {
  const useStore = create<T>(initializer);
  return { useStore };
}

export function mockApiResponse<T>(data: T, delay = 0) {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
}

export { render };
