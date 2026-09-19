import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { I18nProvider } from '@/contexts/I18nContext';
import '@/styles/themes/tokens.scss';
import '@/styles/themes/light.scss';
import '@/styles/global.scss';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 说明：Semi Design 内部使用 findDOMNode，React.StrictMode 会触发弃用警告（走查 P2），
// 在 Semi 适配 Concurrent 渲染前暂不启用 StrictMode。
// BrowserRouter 预启 React Router v7 future flags，消除控制台升级提示。
ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </BrowserRouter>
  </QueryClientProvider>
);
