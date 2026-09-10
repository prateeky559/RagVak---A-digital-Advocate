import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface AppConfig {
  appEnv: string;
  appName: string;
  appVersion: string;
  debug: boolean;
  port: number;
  jwtSecret: string;
  jwtAccessExpiryMinutes: number;
  jwtRefreshExpiryDays: number;
  geminiApiKey: string;
  llmProvider: string;
  llmModel: string;
  embeddingProvider: string;
  embeddingModel: string;
  vectorStoreType: string;
  rateLimitPerMinute: number;
  logLevel: string;
  maxUploadSizeMb: number;
  adminEmail: string;
  dataDir: string;
}

const resolveLlmModel = (): string => {
  const model = process.env.LLM_MODEL?.trim();
  if (!model || model === 'gemini-2.5-flash' || model === 'gemini-1.5-flash' || model === 'gemini-2.0-flash') {
    return 'gemini-3.8-flash';
  }
  return model;
};

export const config: AppConfig = {
  appEnv: process.env.APP_ENV || 'development',
  appName: process.env.APP_NAME || 'Legal Document QA RAG',
  appVersion: process.env.APP_VERSION || '1.0.0',
  debug: process.env.DEBUG === 'true',
  port: 3000,
  jwtSecret: process.env.JWT_SECRET_KEY || 'legal-rag-secure-jwt-secret-key-production-32-chars-min',
  jwtAccessExpiryMinutes: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRE_MINUTES || '60', 10),
  jwtRefreshExpiryDays: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRE_DAYS || '7', 10),
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  llmProvider: process.env.LLM_PROVIDER || 'gemini',
  llmModel: resolveLlmModel(),
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'gemini',
  embeddingModel: process.env.EMBEDDING_MODEL || 'gemini-embedding-2-preview',
  vectorStoreType: process.env.VECTOR_STORE_TYPE || 'pgvector',
  rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60', 10),
  logLevel: process.env.LOG_LEVEL || 'INFO',
  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '25', 10),
  adminEmail: process.env.ADMIN_EMAIL || 'admin@legalrag.internal',
  dataDir: path.join(process.cwd(), 'data', 'storage'),
};
