import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Wrapper } from '@/utils/test-utils';
import { useAssetsStore } from '@/stores/assetsStore';
import { useTimelineStore } from '@/stores/timelineStore';
import TranscriptPanel from './index';

const assetWithTranscript = {
  id: 'asset_1',
  projectId: 'proj_1',
  type: 'video',
  status: 'ready',
  storagePath: '/mock/a.mp4',
  fileName: 'a.mp4',
  fileSize: 1,
  duration: 10,
  width: 1920,
  height: 1080,
  thumbnailUrl: null,
  fps: 30,
  codec: 'h264',
  transcript: { text: 'hello', segments: [{ start: 0, end: 2, text: '第一句' }, { start: 2, end: 4, text: '第二句' }] },
  metadata: null,
  analysis: null,
  createdAt: new Date().toISOString(),
};

describe('TranscriptPanel', () => {
  beforeEach(() => {
    useAssetsStore.getState().setAssets([assetWithTranscript as never]);
    useTimelineStore.setState({ currentTime: 0 });
  });

  it('renders transcript segments', () => {
    render(<TranscriptPanel />, { wrapper: Wrapper });
    expect(screen.getByText('第一句')).toBeTruthy();
    expect(screen.getByText('第二句')).toBeTruthy();
    expect(screen.getByText('a.mp4')).toBeTruthy();
  });

  it('seeks timeline on timestamp click', () => {
    render(<TranscriptPanel />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText('00:02'));
    expect(useTimelineStore.getState().currentTime).toBe(2);
  });

  it('shows empty state without transcripts', () => {
    useAssetsStore.getState().setAssets([]);
    render(<TranscriptPanel />, { wrapper: Wrapper });
    expect(screen.getAllByText(/暂无转录|No transcript/i).length).toBeGreaterThan(0);
  });
});
