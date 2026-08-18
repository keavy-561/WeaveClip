import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@/utils/test-utils';
import userEvent from '@testing-library/user-event';
import LanguageSwitcher from './index';

describe('LanguageSwitcher', () => {
  it('renders language trigger button', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByText(/中|EN/)).toBeInTheDocument();
  });

  it('opens dropdown on click', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    const trigger = screen.getByText(/中|EN/);
    await user.click(trigger);

    expect(screen.getByText('中文')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
  });
});
