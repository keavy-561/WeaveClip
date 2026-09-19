import { describe, it, expect } from 'vitest';
import { backendToFront, frontToBackend } from './dslAdapter';

const backendDSL = {
  version: '1.0',
  fps: 30,
  duration: 12,
  canvas: { width: 1080, height: 1920 },
  tracks: [
    {
      id: 'v1',
      type: 'video',
      clips: [
        { id: 'c1', assetId: '1', type: 'video', start: 0, end: 5, trimIn: 1, trimOut: 6 },
        { id: 'c2', assetId: '2', type: 'video', start: 5, end: 12, speed: 2 },
      ],
    },
    { id: 'txt1', type: 'text', clips: [{ id: 'cap1', type: 'text', start: 0, end: 3, text: '你好' }] },
  ],
};

describe('dslAdapter', () => {
  it('converts backend DSL to frontend shape', () => {
    const front = backendToFront(backendDSL);
    expect(front.duration).toBe(12);
    expect(front.width).toBe(1080);
    expect(front.tracks[0].clips[0].duration).toBe(5);
    expect(front.tracks[0].clips[0].sourceStart).toBe(1);
    expect(front.tracks[0].clips[0].sourceDuration).toBe(5);
    // 后端 text 轨 → 前端 caption 轨
    expect(front.tracks[1].type).toBe('caption');
    expect(front.tracks[1].clips[0].text).toBe('你好');
  });

  it('converts frontend DSL back to backend shape losslessly', () => {
    const front = backendToFront(backendDSL);
    const back = frontToBackend(front) as typeof backendDSL;
    expect(back.duration).toBe(12);
    expect(back.canvas).toEqual({ width: 1080, height: 1920 });
    // start/end 往返一致
    expect(back.tracks[0].clips[0].start).toBe(0);
    expect(back.tracks[0].clips[0].end).toBe(5);
    expect(back.tracks[0].clips[0].trimIn).toBe(1);
    expect(back.tracks[0].clips[0].trimOut).toBe(6);
    // caption 轨转回 text
    expect(back.tracks[1].type).toBe('text');
    expect(back.tracks[1].clips[0].text).toBe('你好');
  });

  it('maps clip speed both ways', () => {
    const front = backendToFront(backendDSL);
    expect(front.tracks[0].clips[1].speed).toBe(2);
    const back = frontToBackend(front) as typeof backendDSL;
    expect(back.tracks[0].clips[1].speed).toBe(2);
  });
});
