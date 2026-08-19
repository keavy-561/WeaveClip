import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Wrapper } from '@/utils/test-utils';
import Editor from './index';

describe('Editor Page', () => {
  it('renders without crashing', () => {
    render(<Editor />, { wrapper: Wrapper });
    expect(document.body).toBeTruthy();
  });
});
