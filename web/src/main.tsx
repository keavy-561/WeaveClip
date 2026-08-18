import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import App from './App';
import '@/styles/themes/dark.scss';
import '@/styles/themes/light.scss';
import '@/styles/global.scss';
import i18n from '@/locales/i18n';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <I18nextProvider i18n={i18n}>
          <App />
        </I18nextProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
