import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from '@douyinfe/semi-ui';
import { I18nProvider } from '@/contexts/I18nContext';
import Generate from './index';

/** Generate 页守卫：无 projectId 时应重定向到上传页（工单 WO4-10） */
const renderAtGenerate = () =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <ConfigProvider>
        <I18nProvider>
          <MemoryRouter initialEntries={['/projects/new/generate']}>
            <Routes>
              <Route path="/projects/new/generate" element={<Generate />} />
              <Route path="/projects/new" element={<div>upload-page-marker</div>} />
            </Routes>
          </MemoryRouter>
        </I18nProvider>
      </ConfigProvider>
    </QueryClientProvider>
  );

describe('Generate Page', () => {
  it('redirects to upload page when projectId is missing', () => {
    renderAtGenerate();
    expect(screen.getByText('upload-page-marker')).toBeTruthy();
  });
});
