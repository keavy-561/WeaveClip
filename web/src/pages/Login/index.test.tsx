import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Wrapper } from '@/utils/test-utils';
import Login from './index';

describe('Login Page', () => {
  it('renders without crashing', () => {
    render(<Login />, { wrapper: Wrapper });
    expect(document.body).toBeTruthy();
  });
});
