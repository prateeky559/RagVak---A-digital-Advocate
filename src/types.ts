export interface Citation {
  document_id: string;
  document_title: string;
  page?: number;
  section?: string;
  snippet: string;
  score: number;
  jurisdiction?: string;
  act_name?: string;
}

export interface AttachmentItem {
  id: string;
  name: string;
  size: number;
  type: 'image' | 'document';
  mimeType: string;
  previewUrl?: string;
  extractedText?: string;
}

export interface ChatMessage {
  id: string;
  conversation_id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  citations?: Citation[];
  safety_classification?: string;
  latency_ms?: number;
  disclaimer?: string;
  attachments?: AttachmentItem[];
}

export interface ConversationItem {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'USER' | 'ADMIN';
}

export interface LegalDocItem {
  id: string;
  title: string;
  source: string;
  jurisdiction: string;
  document_type: string;
  version: string;
  effective_date: string;
  status: string;
  checksum: string;
  chunk_count?: number;
  created_at: string;
  updated_at: string;
}

export interface IngestionJobItem {
  id: string;
  document_id: string;
  document_title?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  chunk_count: number;
}

export interface AdminMetrics {
  users: {
    total: number;
    active: number;
  };
  documents: {
    total_documents: number;
    total_chunks: number;
  };
  performance: {
    total_questions: number;
    average_latency_ms: number;
    prompt_injections_blocked: number;
  };
  feedback: {
    total_feedback: number;
    positive: number;
    negative: number;
    satisfaction_rate_percent: number;
  };
  recent_jobs: IngestionJobItem[];
}
