export interface Project {
  id: string;
  name: string;
  status: 'draft' | 'analyzing' | 'generating' | 'ready' | 'rendering';
  duration: number | null;
  aspectRatio: string;
  style: string;
  /** 分辨率标签（如 1080p / 4K） */
  resolution?: string;
  /** 帧率标签（如 60fps） */
  frameRate?: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
}
