import type { VideoDSL, EditingOperation } from './timeline';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  operations?: EditingOperation[];
  timestamp: string;
}

export type QuickAction =
  | 'make_shorter'
  | 'change_style'
  | 'add_captions'
  | 'improve_hook'
  | 'change_music';

export interface GenerateRequest {
  prompt: string;
}

export interface GenerateResponse {
  generationId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  timeline?: VideoDSL;
  error?: string;
}

export interface ChatRequest {
  message: string;
  selectedClipId?: string | null;
}

export interface ChatResponse {
  message: string;
  operations: EditingOperation[];
  timeline: VideoDSL;
}
