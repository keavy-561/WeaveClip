export type AssetType = 'video' | 'audio' | 'image';

export interface Asset {
  id: string;
  projectId: string;
  type: AssetType;
  storagePath: string;
  fileName: string;
  fileSize: number;
  duration: number | null;
  width: number | null;
  height: number | null;
  thumbnailUrl: string | null;
  fps: number | null;
  codec: string | null;
  transcript: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  analysis: AssetAnalysis | null;
  createdAt: string;
}

export interface AssetAnalysis {
  scenesIdentified: boolean;
  transcriptGenerated: boolean;
  bestMomentsFound: boolean;
  summary: {
    strongMoments: number;
    talkingHead: number;
    bRoll: number;
    duplicates: number;
  };
}
