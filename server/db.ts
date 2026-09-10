import fs from 'fs';
import path from 'path';
import { config } from './config.js';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'USER' | 'ADMIN';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expiration: string;
  revoked_at?: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageCitation {
  document_id: string;
  document_title: string;
  page?: number;
  section?: string;
  snippet: string;
  score: number;
  jurisdiction?: string;
  act_name?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  request_id?: string;
  citations?: MessageCitation[];
  safety_classification?: string;
  attachments?: any[];
}

export interface LegalDocument {
  id: string;
  title: string;
  source: string;
  jurisdiction: string;
  document_type: 'STATUTE' | 'REGULATION' | 'CASE_LAW' | 'CONTRACT' | 'GUIDANCE' | 'DEMO';
  version: string;
  effective_date: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'PENDING' | 'ERROR';
  checksum: string;
  file_path?: string;
  created_at: string;
  updated_at: string;
  chunk_count?: number;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number?: number;
  section?: string;
  act_name?: string;
  citation_label: string;
  metadata: Record<string, any>;
  embedding: number[];
  created_at: string;
}

export interface Feedback {
  id: string;
  user_id: string;
  message_id: string;
  rating: number; // 1 for positive, -1 for negative
  comment?: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  request_id?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface IngestionJob {
  id: string;
  document_id: string;
  document_title?: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  started_at: string;
  completed_at?: string;
  error_message?: string;
  chunk_count: number;
}

interface DatabaseSchema {
  users: User[];
  refresh_tokens: RefreshToken[];
  conversations: Conversation[];
  messages: Message[];
  documents: LegalDocument[];
  document_chunks: DocumentChunk[];
  feedback: Feedback[];
  audit_logs: AuditLog[];
  ingestion_jobs: IngestionJob[];
}

class PersistentDatabase {
  private dbPath: string;
  private data: DatabaseSchema;
  private isLoaded: boolean = false;

  constructor() {
    this.dbPath = path.join(config.dataDir, 'legal_rag_db.json');
    this.data = {
      users: [],
      refresh_tokens: [],
      conversations: [],
      messages: [],
      documents: [],
      document_chunks: [],
      feedback: [],
      audit_logs: [],
      ingestion_jobs: [],
    };
    this.init();
  }

  private init() {
    if (!fs.existsSync(config.dataDir)) {
      fs.mkdirSync(config.dataDir, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      try {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(raw);
        this.isLoaded = true;
      } catch (err) {
        console.error('Failed to parse database file, reinitializing', err);
        this.save();
      }
    } else {
      this.save();
    }
  }

  public save() {
    try {
      const tempPath = `${this.dbPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempPath, this.dbPath);
    } catch (err) {
      console.error('Failed to persist database file', err);
    }
  }

  // Users
  public getUsers(): User[] {
    return this.data.users;
  }
  public getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }
  public getUserByEmail(email: string): User | undefined {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }
  public addUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }
  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const user = this.getUserById(id);
    if (!user) return undefined;
    Object.assign(user, updates, { updated_at: new Date().toISOString() });
    this.save();
    return user;
  }

  // Refresh Tokens
  public addRefreshToken(token: RefreshToken): RefreshToken {
    this.data.refresh_tokens.push(token);
    this.save();
    return token;
  }
  public getRefreshToken(tokenString: string): RefreshToken | undefined {
    return this.data.refresh_tokens.find(t => t.token === tokenString && !t.revoked_at);
  }
  public revokeRefreshToken(tokenString: string): void {
    const token = this.data.refresh_tokens.find(t => t.token === tokenString);
    if (token) {
      token.revoked_at = new Date().toISOString();
      this.save();
    }
  }

  // Conversations
  public getConversations(userId: string): Conversation[] {
    return this.data.conversations
      .filter(c => c.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }
  public getConversationById(id: string, userId: string): Conversation | undefined {
    return this.data.conversations.find(c => c.id === id && c.user_id === userId);
  }
  public addConversation(conv: Conversation): Conversation {
    this.data.conversations.push(conv);
    this.save();
    return conv;
  }
  public updateConversation(id: string, updates: Partial<Conversation>): void {
    const c = this.data.conversations.find(item => item.id === id);
    if (c) {
      Object.assign(c, updates, { updated_at: new Date().toISOString() });
      this.save();
    }
  }
  public deleteConversation(id: string, userId: string): boolean {
    const initialLen = this.data.conversations.length;
    this.data.conversations = this.data.conversations.filter(c => !(c.id === id && c.user_id === userId));
    this.data.messages = this.data.messages.filter(m => m.conversation_id !== id);
    const removed = this.data.conversations.length < initialLen;
    if (removed) this.save();
    return removed;
  }

  // Messages
  public getMessages(conversationId: string): Message[] {
    return this.data.messages
      .filter(m => m.conversation_id === conversationId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }
  public addMessage(message: Message): Message {
    this.data.messages.push(message);
    const conv = this.data.conversations.find(c => c.id === message.conversation_id);
    if (conv) {
      conv.updated_at = new Date().toISOString();
    }
    this.save();
    return message;
  }

  // Documents
  public getDocuments(): LegalDocument[] {
    return this.data.documents.map(doc => {
      const chunks = this.data.document_chunks.filter(c => c.document_id === doc.id);
      return {
        ...doc,
        chunk_count: chunks.length,
      };
    });
  }
  public getDocumentById(id: string): LegalDocument | undefined {
    const doc = this.data.documents.find(d => d.id === id);
    if (!doc) return undefined;
    const chunkCount = this.data.document_chunks.filter(c => c.document_id === doc.id).length;
    return { ...doc, chunk_count: chunkCount };
  }
  public addDocument(doc: LegalDocument): LegalDocument {
    this.data.documents.push(doc);
    this.save();
    return doc;
  }
  public updateDocument(id: string, updates: Partial<LegalDocument>): LegalDocument | undefined {
    const doc = this.data.documents.find(d => d.id === id);
    if (!doc) return undefined;
    Object.assign(doc, updates, { updated_at: new Date().toISOString() });
    this.save();
    return doc;
  }
  public deleteDocument(id: string): boolean {
    const initial = this.data.documents.length;
    this.data.documents = this.data.documents.filter(d => d.id !== id);
    this.data.document_chunks = this.data.document_chunks.filter(c => c.document_id !== id);
    const changed = this.data.documents.length < initial;
    if (changed) this.save();
    return changed;
  }

  // Document Chunks & Vectors
  public getChunks(documentId?: string): DocumentChunk[] {
    if (documentId) {
      return this.data.document_chunks.filter(c => c.document_id === documentId);
    }
    return this.data.document_chunks;
  }
  public addChunks(chunks: DocumentChunk[]): void {
    this.data.document_chunks.push(...chunks);
    this.save();
  }
  public deleteChunksForDocument(documentId: string): void {
    this.data.document_chunks = this.data.document_chunks.filter(c => c.document_id !== documentId);
    this.save();
  }

  // Feedback
  public addFeedback(fb: Feedback): Feedback {
    this.data.feedback.push(fb);
    this.save();
    return fb;
  }
  public getFeedback(): Feedback[] {
    return this.data.feedback;
  }

  // Audit Logs
  public addAuditLog(log: AuditLog): void {
    this.data.audit_logs.push(log);
    // Keep max 2000 audit logs
    if (this.data.audit_logs.length > 2000) {
      this.data.audit_logs = this.data.audit_logs.slice(-2000);
    }
    this.save();
  }
  public getAuditLogs(limit: number = 100): AuditLog[] {
    return this.data.audit_logs.slice(-limit).reverse();
  }

  // Ingestion Jobs
  public addIngestionJob(job: IngestionJob): IngestionJob {
    this.data.ingestion_jobs.push(job);
    this.save();
    return job;
  }
  public updateIngestionJob(id: string, updates: Partial<IngestionJob>): IngestionJob | undefined {
    const job = this.data.ingestion_jobs.find(j => j.id === id);
    if (!job) return undefined;
    Object.assign(job, updates);
    this.save();
    return job;
  }
  public getIngestionJobs(limit: number = 50): IngestionJob[] {
    return this.data.ingestion_jobs.slice(-limit).reverse();
  }
}

export const db = new PersistentDatabase();
