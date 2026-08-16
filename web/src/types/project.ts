export interface Project {
  id: string;
  name: string;
  status: 'draft' | 'analyzing' | 'generating' | 'ready' | 'rendering';
  duration: number | null;
  aspectRatio: string;
  style: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
}
