import { DocumentChunk, db } from './db.js';

export interface VectorSearchParams {
  queryVector: number[];
  topK?: number;
  scoreThreshold?: number;
  jurisdictionFilter?: string;
  documentTypeFilter?: string;
  documentIdFilter?: string;
}

export interface SearchResult {
  chunk: DocumentChunk;
  score: number;
}

export interface IVectorStore {
  search(params: VectorSearchParams): Promise<SearchResult[]>;
  upsertChunks(chunks: DocumentChunk[]): Promise<void>;
  deleteByDocumentId(documentId: string): Promise<void>;
  getStats(): Promise<{ totalVectors: number; dimension: number }>;
}

export class VectorStore implements IVectorStore {
  /**
   * Computes cosine similarity between two normalized or non-normalized vectors
   */
  public static cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length || a.length === 0) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    if (denominator === 0) return 0;
    return dotProduct / denominator;
  }

  public async search(params: VectorSearchParams): Promise<SearchResult[]> {
    const {
      queryVector,
      topK = 5,
      scoreThreshold = 0.35, // Balanced threshold for legal retrieval
      jurisdictionFilter,
      documentTypeFilter,
      documentIdFilter,
    } = params;

    const allChunks = db.getChunks();
    const scoredChunks: SearchResult[] = [];

    for (const chunk of allChunks) {
      // Metadata filtering
      if (documentIdFilter && chunk.document_id !== documentIdFilter) continue;
      if (jurisdictionFilter && chunk.metadata?.jurisdiction !== jurisdictionFilter) continue;
      if (documentTypeFilter && chunk.metadata?.document_type !== documentTypeFilter) continue;

      if (!chunk.embedding || chunk.embedding.length === 0) continue;

      const score = VectorStore.cosineSimilarity(queryVector, chunk.embedding);
      if (score >= scoreThreshold) {
        scoredChunks.push({ chunk, score });
      }
    }

    // Sort descending by similarity score
    scoredChunks.sort((a, b) => b.score - a.score);

    // Deduplication: prevent multiple chunks with virtually identical text from overflowing top_k
    const deduplicated: SearchResult[] = [];
    const seenContents = new Set<string>();

    for (const item of scoredChunks) {
      const simplifiedContent = item.chunk.content.slice(0, 100).toLowerCase().replace(/\s+/g, ' ');
      if (!seenContents.has(simplifiedContent)) {
        seenContents.add(simplifiedContent);
        deduplicated.push(item);
      }
      if (deduplicated.length >= topK) break;
    }

    return deduplicated;
  }

  public async upsertChunks(chunks: DocumentChunk[]): Promise<void> {
    db.addChunks(chunks);
  }

  public async deleteByDocumentId(documentId: string): Promise<void> {
    db.deleteChunksForDocument(documentId);
  }

  public async getStats(): Promise<{ totalVectors: number; dimension: number }> {
    const chunks = db.getChunks();
    const firstChunk = chunks.find(c => c.embedding && c.embedding.length > 0);
    return {
      totalVectors: chunks.length,
      dimension: firstChunk ? firstChunk.embedding.length : 768,
    };
  }
}

export const vectorStore = new VectorStore();
