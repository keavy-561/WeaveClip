import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Wrapper } from '@/utils/test-utils';
import Projects from './index';

describe('Projects Page', () => {
  it('renders without crashing', () => {
    render(<Projects />, { wrapper: Wrapper });
    expect(document.body).toBeTruthy();
  });
});
