import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@/utils/test-utils';
import Editor from './index';

// Mock services
vi.mock('@/services/projectService', () => ({
  projectService: {
    get: vi.fn(),
  },
}));

vi.mock('@/services/assetService', () => ({
  assetService: {
    list: vi.fn(),
  },
}));

// Mock stores
vi.mock('@/stores/projectStore', () => ({
  useProjectStore: vi.fn(),
}));

vi.mock('@/stores/timelineStore', () => ({
  useTimelineStore: vi.fn(),
}));

vi.mock('@/stores/aiChatStore', () => ({
  useAIChatStore: vi.fn(),
}));

describe('Editor Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders editor header with back button', async () => {
    const mockSetCurrentProject = vi.fn();
    const mockSetDSL = vi.fn();
    const mockAddMessage = vi.fn();
    const mockClearMessages = vi.fn();

    vi.mocked(await import('@/stores/projectStore')).useProjectStore.mockReturnValue({
      setCurrentProject: mockSetCurrentProject,
      currentProject: null,
    });

    vi.mocked(await import('@/stores/timelineStore')).useTimelineStore.mockReturnValue({
      setDSL: mockSetDSL,
    });

    vi.mocked(await import('@/stores/aiChatStore')).useAIChatStore.mockReturnValue({
      addMessage: mockAddMessage,
      clearMessages: mockClearMessages,
    });

    vi.mocked(await import('@/services/projectService')).projectService.get = vi.fn(
      () => Promise.reject(new Error('Not found'))
    );

    render(<Editor />, {
      wrapper: ({ children }) => (
        require('@testing-library/react').BrowserRouter({
          initialEntries: ['/editor/test-project-id'],
        })(children)
      ),
    });

    // Should show back button
    expect(screen.getByRole('button', { name: /back|arrow/i })).toBeInTheDocument();
  });

  it('loads mock data in mock mode', async () => {
    const mockSetCurrentProject = vi.fn();
    const mockSetDSL = vi.fn();
    const mockAddMessage = vi.fn();
    const mockClearMessages = vi.fn();

    vi.mocked(await import('@/stores/projectStore')).useProjectStore.mockReturnValue({
      setCurrentProject: mockSetCurrentProject,
      currentProject: null,
    });

    vi.mocked(await import('@/stores/timelineStore')).useTimelineStore.mockReturnValue({
      setDSL: mockSetDSL,
    });

    vi.mocked(await import('@/stores/aiChatStore')).useAIChatStore.mockReturnValue({
      addMessage: mockAddMessage,
      clearMessages: mockClearMessages,
    });

    render(<Editor />, {
      wrapper: ({ children }) => (
        require('@testing-library/react').BrowserRouter({
          initialEntries: ['/editor/test-project-id'],
        })(children)
      ),
    });

    await waitFor(() => {
      expect(mockSetCurrentProject).toHaveBeenCalled();
    });
  });

  it('updates document title when project loads', async () => {
    const mockProject = {
      id: '1',
      name: 'Test Project',
      status: 'draft',
      duration: 45,
      aspectRatio: '9:16',
      style: 'cinematic',
    };

    vi.mocked(await import('@/stores/projectStore')).useProjectStore.mockReturnValue({
      setCurrentProject: vi.fn(),
      currentProject: mockProject,
    });

    render(<Editor />, {
      wrapper: ({ children }) => (
        require('@testing-library/react').BrowserRouter({
          initialEntries: ['/editor/1'],
        })(children)
      ),
    });

    await waitFor(() => {
      expect(document.title).toContain('Test Project');
    });
  });
});
