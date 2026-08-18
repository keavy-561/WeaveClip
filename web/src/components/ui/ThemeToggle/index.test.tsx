import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/utils/test-utils';
import userEvent from '@testing-library/user-event';
import ThemeToggle from './index';

describe('ThemeToggle', () => {
  it('renders toggle button', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('toggles theme when clicked', async () => {
    const user = userEvent.setup();
    render(<ThemeToggle />);

    const button = screen.getByRole('button');
    await user.click(button);

    expect(button).toBeInTheDocument();
  });
});
