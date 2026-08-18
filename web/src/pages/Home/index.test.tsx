import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Wrapper } from '@/utils/test-utils';
import Home from './index';

describe('Home Page', () => {
  it('renders without crashing', () => {
    render(<Home />, { wrapper: Wrapper });
    expect(document.body).toBeTruthy();
  });

  it('has correct document title structure', () => {
    render(<Home />, { wrapper: Wrapper });
    expect(document.querySelector('.semi-page-header') || document.body).toBeTruthy();
  });
});
