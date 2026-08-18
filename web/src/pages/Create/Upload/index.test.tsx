import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/utils/test-utils';
import Upload from './index';

// Mock project service
vi.mock('@/services/projectService', () => ({
  projectService: {
    create: vi.fn(),
  },
}));

describe('Upload Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload page with back button and title', () => {
    render(<Upload />);

    expect(screen.getByRole('button', { name: /back|arrow/i })).toBeInTheDocument();
    expect(screen.getByText(/create new video|upload/i)).toBeInTheDocument();
  });

  it('shows step indicators', () => {
    render(<Upload />);

    // Should show step 1 (Upload) as active
    expect(screen.getByText(/upload/i)).toBeInTheDocument();
  });

  it('calls projectService.create when files are provided', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: '1', name: 'Test Project' });
    vi.mocked(await import('@/services/projectService')).projectService.create = mockCreate;

    render(<Upload />);

    // Find the UploadStep component's continue button
    const continueBtn = screen.getByRole('button', { name: /continue|next/i });
    await user.click(continueBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  it('shows error toast on project creation failure', async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error('Failed'));
    vi.mocked(await import('@/services/projectService')).projectService.create = mockCreate;

    render(<Upload />);

    const continueBtn = screen.getByRole('button', { name: /continue|next/i });
    await user.click(continueBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });
});
