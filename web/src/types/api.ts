export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AnalyzeStatus {
  status: 'pending' | 'analyzing' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: {
    clipsAnalyzed: number;
    speakersDetected: number;
    transcriptGenerated: boolean;
    scenesIdentified: boolean;
    bestMomentsFound: boolean;
    summary: {
      strongMoments: number;
      talkingHead: number;
      bRoll: number;
      duplicates: number;
    };
  };
}

export interface RenderStatus {
  id: string;
  status: 'pending' | 'rendering' | 'completed' | 'failed';
  progress: number;
  downloadUrl?: string;
  fileSize?: number;
  error?: string;
}
