import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/utils/test-utils';
import Home from './index';

// Mock project service
vi.mock('@/services/projectService', () => ({
  projectService: {
    list: vi.fn(),
  },
}));

describe('Home Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hero section and navigation', () => {
    render(<Home />);

    // Check for logo/brand
    expect(screen.getByText('WeaveClip')).toBeInTheDocument();

    // Check navigation
    expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument();
  });

  it('shows loading skeletons while fetching projects', () => {
    vi.mocked(await import('@/services/projectService')).projectService.list = vi.fn(
      () => new Promise(() => {})
    );

    render(<Home />);

    // Semi UI Skeleton should be present
    const skeletons = document.querySelectorAll('.semi-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('displays projects when loaded', async () => {
    const mockProjects = [
      { id: '1', name: 'Test Project', aspectRatio: '9:16', duration: 45, style: 'cinematic', status: 'draft' },
    ];

    vi.mocked(await import('@/services/projectService')).projectService.list = vi.fn(
      () => Promise.resolve(mockProjects)
    );

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  it('shows empty state when no projects', async () => {
    vi.mocked(await import('@/services/projectService')).projectService.list = vi.fn(
      () => Promise.resolve([])
    );

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/empty/i)).toBeInTheDocument();
    });
  });

  it('renders example prompts section', () => {
    render(<Home />);

    // ExamplePrompts component should render
    expect(screen.getByText(/examplePrompt1|example/i)).toBeInTheDocument();
  });
});
