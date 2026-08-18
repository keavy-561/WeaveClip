import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Wrapper } from '@/utils/test-utils';
import Upload from './index';

describe('Upload Page', () => {
  it('renders without crashing', () => {
    render(<Upload />, { wrapper: Wrapper });
    expect(document.body).toBeTruthy();
  });
});
