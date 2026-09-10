import { GoogleGenAI } from '@google/genai';
import { config } from './config.js';

export interface IEmbeddingService {
  embedText(text: string): Promise<number[]>;
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(query: string): Promise<number[]>;
}

export class EmbeddingService implements IEmbeddingService {
  private aiClient: GoogleGenAI | null = null;
  private readonly dimension: number = 768;

  constructor() {
    if (config.geminiApiKey) {
      try {
        this.aiClient = new GoogleGenAI({
          apiKey: config.geminiApiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } catch (e) {
        console.warn('Could not initialize GoogleGenAI client for embeddings, using fallback engine');
      }
    }
  }

  public async embedQuery(query: string): Promise<number[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Query text cannot be empty for embedding generation');
    }
    return this.embedText(query);
  }

  public async embedText(text: string): Promise<number[]> {
    const sanitized = text.trim();
    if (!sanitized) {
      return new Array(this.dimension).fill(0);
    }

    if (this.aiClient) {
      try {
        // Attempt real Gemini embedding
        const response = await this.aiClient.models.embedContent({
          model: config.embeddingModel || 'gemini-embedding-2-preview',
          contents: sanitized,
        });

        const embValues = (response as any).embedding?.values || (response as any).embeddings?.[0]?.values;
        if (embValues && embValues.length > 0) {
          return this.normalizeVector(embValues);
        }
      } catch (err: any) {
        console.warn(`Gemini embedding API call failed: ${err?.message || err}. Falling back to semantic legal vectorizer.`);
      }
    }

    // Deterministic semantic legal vectorizer (768 dimensions)
    return this.generateSemanticLegalEmbedding(sanitized);
  }

  public async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!texts || texts.length === 0) return [];
    
    // Batch processing with chunking of 20 items
    const batchSize = 20;
    const results: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const promises = batch.map(t => this.embedText(t));
      const batchVectors = await Promise.all(promises);
      results.push(...batchVectors);
    }

    return results;
  }

  private normalizeVector(vec: number[]): number[] {
    let norm = 0;
    for (let i = 0; i < vec.length; i++) {
      norm += vec[i] * vec[i];
    }
    norm = Math.sqrt(norm);
    if (norm === 0) return vec;
    return vec.map(v => v / norm);
  }

  /**
   * Deterministic high-dimensional legal semantic vectorizer:
   * Maps terms, n-grams, and legal taxonomies into a 768-dimensional normalized unit sphere.
   */
  private generateSemanticLegalEmbedding(text: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    const words = text.toLowerCase().match(/\b[a-z0-9_-]+\b/g) || [];
    if (words.length === 0) return vector;

    // Legal domain semantic cluster definitions
    const legalClusters: Record<string, number[]> = {
      // Privacy & Data Rights (CCPA, GDPR)
      privacy: [10, 11, 12, 13, 14, 15, 16],
      consumer: [17, 18, 19, 20],
      deletion: [21, 22, 23, 24],
      disclosure: [25, 26, 27, 28],
      opt_out: [29, 30, 31, 32],
      personal_information: [33, 34, 35, 36, 37],
      gdpr: [38, 39, 40, 41],
      controller: [42, 43, 44],
      processor: [45, 46, 47],
      consent: [48, 49, 50],
      rectification: [51, 52, 53],
      erasure: [54, 55, 56],
      
      // Commercial & Contract Law (UCC)
      warranty: [70, 71, 72, 73, 74],
      merchantability: [75, 76, 77, 78],
      fitness: [79, 80, 81],
      breach: [82, 83, 84, 85],
      damages: [86, 87, 88],
      disclaimer: [89, 90, 91],
      buyer: [92, 93, 94],
      seller: [95, 96, 97],
      goods: [98, 99, 100],
      express: [101, 102, 103],
      implied: [104, 105, 106],
      ucc: [107, 108, 109],

      // Copyright & IP (DMCA)
      copyright: [130, 131, 132, 133],
      infringement: [134, 135, 136],
      safe_harbor: [137, 138, 139, 140],
      dmca: [141, 142, 143],
      takedown: [144, 145, 146],
      provider: [147, 148, 149],
      liability: [150, 151, 152],
      monetary: [153, 154, 155],
      agent: [156, 157, 158],
      notice: [159, 160, 161],

      // General Procedural & Jurisdictional
      statute: [180, 181, 182],
      section: [183, 184, 185],
      article: [186, 187, 188],
      jurisdiction: [189, 190, 191],
      penalty: [192, 193, 194],
      remedy: [195, 196, 197],
      obligation: [198, 199, 200],
      exemption: [201, 202, 203],
    };

    // Populate cluster weights
    for (const word of words) {
      for (const [clusterKey, indices] of Object.entries(legalClusters)) {
        if (word.includes(clusterKey) || clusterKey.includes(word)) {
          for (const idx of indices) {
            vector[idx] += 1.8;
          }
        }
      }

      // Hash-based projection across the remaining 768-dim space for general vocabulary
      let h1 = 0xdeadbeef;
      let h2 = 0x41c64e6d;
      for (let i = 0; i < word.length; i++) {
        const code = word.charCodeAt(i);
        h1 = Math.imul(h1 ^ code, 2654435761);
        h2 = Math.imul(h2 ^ code, 1597334677);
      }
      const pos1 = Math.abs(h1) % this.dimension;
      const pos2 = Math.abs(h2) % this.dimension;
      const sign1 = (h1 & 1) === 0 ? 1 : -1;
      const sign2 = (h2 & 1) === 0 ? 1 : -1;

      vector[pos1] += sign1 * 0.7;
      vector[pos2] += sign2 * 0.5;
    }

    // Bi-gram hashing
    for (let i = 0; i < words.length - 1; i++) {
      const bigram = `${words[i]}_${words[i+1]}`;
      let h = 0x811c9dc5;
      for (let j = 0; j < bigram.length; j++) {
        h = Math.imul(h ^ bigram.charCodeAt(j), 16777619);
      }
      const pos = Math.abs(h) % this.dimension;
      vector[pos] += 1.2;
    }

    return this.normalizeVector(vector);
  }
}

export const embeddingService = new EmbeddingService();
