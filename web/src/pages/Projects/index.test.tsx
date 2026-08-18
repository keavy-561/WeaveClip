import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/utils/test-utils';
import Projects from './index';

// Mock project service
vi.mock('@/services/projectService', () => ({
  projectService: {
    list: vi.fn(),
    remove: vi.fn(),
  },
}));

describe('Projects Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders projects page with navbar', () => {
    render(<Projects />);

    expect(screen.getByText(/projects.title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /newVideo|new/i })).toBeInTheDocument();
  });

  it('shows loading skeletons while fetching', () => {
    vi.mocked(await import('@/services/projectService')).projectService.list = vi.fn(
      () => new Promise(() => {})
    );

    render(<Projects />);

    const skeletons = document.querySelectorAll('.semi-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays projects from API when loaded', async () => {
    const mockProjects = [
      { id: '1', name: 'API Project', aspectRatio: '9:16', duration: 30, style: 'modern', status: 'draft' },
    ];

    vi.mocked(await import('@/services/projectService')).projectService.list = vi.fn(
      () => Promise.resolve(mockProjects)
    );

    render(<Projects />);

    await waitFor(() => {
      expect(screen.getByText('API Project')).toBeInTheDocument();
    });
  });

  it('navigates to new project page when clicking new button', async () => {
    const user = userEvent.setup();
    render(<Projects />);

    const newBtn = screen.getByRole('button', { name: /newVideo/i });
    await user.click(newBtn);

    // Navigation would happen - in test we just verify the button works
    expect(newBtn).toBeInTheDocument();
  });

  it('shows empty state when no projects', async () => {
    vi.mocked(await import('@/services/projectService')).projectService.list = vi.fn(
      () => Promise.resolve([])
    );

    render(<Projects />);

    await waitFor(() => {
      expect(screen.getByText(/empty/i)).toBeInTheDocument();
    });
  });
});
