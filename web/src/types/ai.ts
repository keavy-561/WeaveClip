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

export interface GenerateAnswer {
  question: string;
  answer: string;
}

export interface GenerateRequest {
  prompt: string;
  answers?: GenerateAnswer[];
}

/** 对齐后端 GET /api/generations/:id 响应（工单 B12 契约） */
export interface GenerateResponse {
  generationId: string;
  projectId: number;
  status: 'pending' | 'processing' | 'need_input' | 'completed' | 'failed';
  prompt?: string;
  timeline?: VideoDSL;
  timelineVersion?: number;
  questions?: string[];
  error?: string;
}

export interface ChatRequest {
  message: string;
  selectedClipId?: string | null;
}

/** 对齐后端 POST /api/projects/:id/chat 响应（工单 B13 契约） */
export interface ChatResponse {
  message: string;
  operations: EditingOperation[];
  timeline?: {
    version: number;
    timelineJson: VideoDSL;
  };
}
