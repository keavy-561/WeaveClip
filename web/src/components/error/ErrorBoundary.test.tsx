import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function Bomb() {
  throw new Error('Boom');
}

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Safe content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Safe content')).toBeInTheDocument();
  });

  it('renders fallback UI when a child throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );

    await waitFor(() => {
      // 锚定正则：testing-library 的正则是包含式匹配，未锚定会连祖先容器一起命中
      expect(screen.getByText(/^(Something went wrong|页面出错了)$/)).toBeInTheDocument();
    });

    expect(screen.getByText(/^(Try Again|重试)$/)).toBeInTheDocument();
  });

  it('calls onReset when Try Again is clicked', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const onReset = vi.fn();

    render(
      <ErrorBoundary onReset={onReset}>
        <Bomb />
      </ErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText(/^(Something went wrong|页面出错了)$/)).toBeInTheDocument();
    });

    const button = screen.getByText(/^(Try Again|重试)$/);
    button.click();

    expect(onReset).toHaveBeenCalled();
  });
});
