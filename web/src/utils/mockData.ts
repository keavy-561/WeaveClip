import type { Project } from '@/types/project';
import type { Asset } from '@/types/asset';
import type { VideoDSL } from '@/types/timeline';
import type { ChatMessage } from '@/types/ai';

// ============ Mock Projects ============

export const mockProjects: Project[] = [
  {
    id: 'proj_1',
    name: '纽约旅行Vlog',
    status: 'ready',
    duration: 45,
    aspectRatio: '9:16',
    style: 'energetic',
    createdAt: '2026-08-10T08:00:00Z',
    updatedAt: '2026-08-10T12:00:00Z',
  },
  {
    id: 'proj_2',
    name: '产品预告',
    status: 'draft',
    duration: 30,
    aspectRatio: '16:9',
    style: 'cinematic',
    createdAt: '2026-08-08T14:00:00Z',
    updatedAt: '2026-08-08T14:00:00Z',
  },
  {
    id: 'proj_3',
    name: '海滩日记录像',
    status: 'ready',
    duration: 60,
    aspectRatio: '9:16',
    style: 'minimal',
    createdAt: '2026-08-05T10:00:00Z',
    updatedAt: '2026-08-05T16:00:00Z',
  },
];

// ============ Mock Assets ============

export const mockAssets: Asset[] = [
  {
    id: 'asset_01',
    projectId: 'proj_1',
    type: 'video',
    storagePath: '/mock/nyc_bridge.mp4',
    fileName: 'nyc_bridge.mp4',
    fileSize: 52_428_800,
    duration: 15.2,
    width: 1920,
    height: 1080,
    thumbnailUrl: null,
    fps: 30,
    codec: 'h264',
    transcript: null,
    metadata: null,
    analysis: null,
    createdAt: '2026-08-10T08:10:00Z',
  },
  {
    id: 'asset_02',
    projectId: 'proj_1',
    type: 'video',
    storagePath: '/mock/times_square.mp4',
    fileName: 'times_square.mp4',
    fileSize: 73_400_000,
    duration: 22.5,
    width: 1920,
    height: 1080,
    thumbnailUrl: null,
    fps: 30,
    codec: 'h264',
    transcript: null,
    metadata: null,
    analysis: null,
    createdAt: '2026-08-10T08:11:00Z',
  },
  {
    id: 'asset_03',
    projectId: 'proj_1',
    type: 'video',
    storagePath: '/mock/central_park.mp4',
    fileName: 'central_park.mp4',
    fileSize: 41_943_000,
    duration: 12.8,
    width: 1920,
    height: 1080,
    thumbnailUrl: null,
    fps: 30,
    codec: 'h264',
    transcript: null,
    metadata: null,
    analysis: null,
    createdAt: '2026-08-10T08:12:00Z',
  },
  {
    id: 'asset_04',
    projectId: 'proj_1',
    type: 'image',
    storagePath: '/mock/skyline.jpg',
    fileName: 'skyline.jpg',
    fileSize: 3_145_728,
    duration: null,
    width: 4032,
    height: 3024,
    thumbnailUrl: null,
    fps: null,
    codec: null,
    transcript: null,
    metadata: null,
    analysis: null,
    createdAt: '2026-08-10T08:13:00Z',
  },
  {
    id: 'asset_05',
    projectId: 'proj_1',
    type: 'audio',
    storagePath: '/mock/bgm_energetic.mp3',
    fileName: 'bgm_energetic.mp3',
    fileSize: 5_242_880,
    duration: 60.0,
    width: null,
    height: null,
    thumbnailUrl: null,
    fps: null,
    codec: 'mp3',
    transcript: null,
    metadata: null,
    analysis: null,
    createdAt: '2026-08-10T08:14:00Z',
  },
];

// ============ Mock Timeline DSL ============

export const mockTimelineDSL: VideoDSL = {
  version: '1.0',
  duration: 45,
  fps: 30,
  width: 1080,
  height: 1920,
  tracks: [
    {
      id: 'track_video_1',
      type: 'video',
      clips: [
        { id: 'clip_01', assetId: 'asset_02', start: 0, duration: 4.5, sourceStart: 2, sourceDuration: 4.5 },
        { id: 'clip_02', assetId: 'asset_01', start: 4.5, duration: 5.0, sourceStart: 0, sourceDuration: 5.0 },
        { id: 'clip_03', assetId: 'asset_04', start: 9.5, duration: 3.0 },
        { id: 'clip_04', assetId: 'asset_03', start: 12.5, duration: 6.0, sourceStart: 5, sourceDuration: 6.0 },
        { id: 'clip_05', assetId: 'asset_02', start: 18.5, duration: 4.0, sourceStart: 10, sourceDuration: 4.0 },
        { id: 'clip_06', assetId: 'asset_01', start: 22.5, duration: 5.5, sourceStart: 8, sourceDuration: 5.5 },
        { id: 'clip_07', assetId: 'asset_03', start: 28.0, duration: 4.0, sourceStart: 0, sourceDuration: 4.0 },
        { id: 'clip_08', assetId: 'asset_02', start: 32.0, duration: 6.0, sourceStart: 16, sourceDuration: 6.0 },
        { id: 'clip_09', assetId: 'asset_01', start: 38.0, duration: 7.0, sourceStart: 5, sourceDuration: 7.0 },
      ],
    },
    {
      id: 'track_caption_1',
      type: 'caption',
      clips: [
        { id: 'cap_01', text: 'New York City', start: 0, duration: 3.0, style: { font: 'Inter', size: 24, color: '#FFFFFF', position: 'bottom', animation: 'fadeIn' } },
        { id: 'cap_02', text: 'Times Square', start: 4.5, duration: 3.0, style: { font: 'Inter', size: 20, color: '#FFFFFF', position: 'center', animation: 'typewriter' } },
        { id: 'cap_03', text: 'Central Park', start: 12.5, duration: 3.0, style: { font: 'Inter', size: 20, color: '#FFFFFF', position: 'bottom', animation: 'fadeIn' } },
      ],
    },
    {
      id: 'track_audio_1',
      type: 'audio',
      clips: [
        { id: 'audio_01', assetId: 'asset_05', start: 0, duration: 45, volume: 0.6 },
      ],
    },
  ],
};

// ============ Mock Chat Messages ============

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg_1',
    role: 'assistant',
    content: 'I\'ve analyzed your footage and generated a first cut. It includes 9 clips from Times Square, Brooklyn Bridge, and Central Park, with energetic pacing and auto-generated captions.',
    timestamp: '2026-08-10T12:00:00Z',
  },
];

// ============ Mock Analyze Result ============

export const mockAnalyzeResult = {
  clipsAnalyzed: 24,
  speakersDetected: 3,
  transcriptGenerated: true,
  scenesIdentified: true,
  bestMomentsFound: true,
  summary: {
    strongMoments: 8,
    talkingHead: 5,
    bRoll: 12,
    duplicates: 3,
  },
};
