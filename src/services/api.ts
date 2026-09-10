import { Citation, ChatMessage, ConversationItem, UserProfile, LegalDocItem, IngestionJobItem, AdminMetrics, AttachmentItem } from '../types.js';

const API_BASE = '/api/v1';

export class ApiService {
  private static getHeaders(isFormData: boolean = false): Record<string, string> {
    const headers: Record<string, string> = {};
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem('legal_rag_access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // Auth
  public static async login(email: string, password: string): Promise<{ user: UserProfile; access_token: string; refresh_token: string }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Login failed');
    }
    localStorage.setItem('legal_rag_access_token', data.access_token);
    localStorage.setItem('legal_rag_refresh_token', data.refresh_token);
    return data;
  }

  public static async register(email: string, password: string, full_name: string): Promise<{ user: UserProfile; access_token: string; refresh_token: string }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Registration failed');
    }
    localStorage.setItem('legal_rag_access_token', data.access_token);
    localStorage.setItem('legal_rag_refresh_token', data.refresh_token);
    return data;
  }

  public static async getMe(): Promise<UserProfile | null> {
    const token = localStorage.getItem('legal_rag_access_token');
    if (!token) return null;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: this.getHeaders(),
      });
      if (!res.ok) {
        if (res.status === 401) {
          this.logout();
        }
        return null;
      }
      return await res.json();
    } catch {
      return null;
    }
  }

  public static logout(): void {
    const refreshToken = localStorage.getItem('legal_rag_refresh_token');
    if (refreshToken) {
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {});
    }
    localStorage.removeItem('legal_rag_access_token');
    localStorage.removeItem('legal_rag_refresh_token');
  }

  // Ask RAG
  public static async ask(params: {
    question: string;
    conversation_id?: string;
    top_k?: number;
    jurisdiction_filter?: string;
    document_type_filter?: string;
    attachments?: AttachmentItem[];
  }): Promise<{
    answer: string;
    citations: Citation[];
    conversation_id?: string;
    message_id: string;
    safety_classification: string;
    disclaimer: string;
    latency_ms: number;
  }> {
    const res = await fetch(`${API_BASE}/ask`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to process legal inquiry');
    }
    return data;
  }

  // Conversations
  public static async getConversations(): Promise<ConversationItem[]> {
    const res = await fetch(`${API_BASE}/conversations`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.conversations || [];
  }

  public static async getConversationMessages(id: string): Promise<ChatMessage[]> {
    const res = await fetch(`${API_BASE}/conversations/${id}/messages`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  }

  public static async deleteConversation(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/conversations/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return res.ok;
  }

  // Feedback
  public static async submitFeedback(message_id: string, rating: 1 | -1, comment?: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/feedback`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ message_id, rating, comment }),
    });
    return res.ok;
  }

  // Documents
  public static async getDocuments(): Promise<LegalDocItem[]> {
    const res = await fetch(`${API_BASE}/documents`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.documents || [];
  }

  public static async getDocumentDetail(id: string): Promise<any> {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) throw new Error('Document not found');
    return await res.json();
  }

  // Admin
  public static async uploadDocument(formData: FormData): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/documents/upload`, {
      method: 'POST',
      headers: this.getHeaders(true),
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to upload and ingest document');
    }
    return data;
  }

  public static async reindexDocuments(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/documents/reindex`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Failed to trigger re-index');
    }
    return data;
  }

  public static async deleteDocument(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/admin/documents/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return res.ok;
  }

  public static async getIngestionJobs(): Promise<IngestionJobItem[]> {
    const res = await fetch(`${API_BASE}/admin/ingestion-jobs`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.jobs || [];
  }

  public static async getMetrics(): Promise<AdminMetrics | null> {
    const res = await fetch(`${API_BASE}/admin/metrics`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) return null;
    return await res.json();
  }

  public static async getReadyStatus(): Promise<any> {
    try {
      const res = await fetch('/ready');
      return await res.json();
    } catch {
      return null;
    }
  }
}
