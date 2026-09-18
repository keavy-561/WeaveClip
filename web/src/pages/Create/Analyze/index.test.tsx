import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from '@douyinfe/semi-ui';
import { I18nProvider } from '@/contexts/I18nContext';
import { createTestQueryClient } from '@/utils/test-utils';
import Analyze from './index';

const UploadPlaceholder: React.FC = () => <div>上传页占位</div>;

function renderAt(route: string) {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <ConfigProvider>
          <I18nProvider>
            <Routes>
              <Route path="/projects/new/analyze" element={<Analyze />} />
              <Route path="/projects/new" element={<UploadPlaceholder />} />
            </Routes>
          </I18nProvider>
        </ConfigProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Analyze Page', () => {
  it('redirects to upload page when projectId is missing', async () => {
    renderAt('/projects/new/analyze');
    await waitFor(() => expect(screen.getByText('上传页占位')).toBeTruthy());
  });

  it('renders analysis checklist while running', () => {
    renderAt('/projects/new/analyze?projectId=proj_1');
    expect(screen.getByText('已分析片段')).toBeTruthy();
    expect(screen.getByText('检测到说话人')).toBeTruthy();
  });
});