import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { config } from './server/config.js';
import { db } from './server/db.js';
import { vectorStore } from './server/vectorStore.js';
import { seedInitialData } from './server/seedData.js';
import { authRouter } from './server/routes/auth.js';
import { askRouter } from './server/routes/ask.js';
import { conversationsRouter } from './server/routes/conversations.js';
import { feedbackRouter } from './server/routes/feedback.js';
import { documentsRouter } from './server/routes/documents.js';
import { adminRouter } from './server/routes/admin.js';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic security headers and CORS
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // Request ID middleware & timing
  app.use((req: Request, res: Response, next: NextFunction) => {
    const reqId = (req.headers['x-request-id'] as string) || `req_${crypto.randomUUID()}`;
    (req as any).requestId = reqId;
    res.setHeader('X-Request-Id', reqId);
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/ready')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms [${reqId}]`);
      }
    });

    next();
  });

  // JSON Body Parser
  app.use(express.json({ limit: `${config.maxUploadSizeMb}mb` }));
  app.use(express.urlencoded({ extended: true, limit: `${config.maxUploadSizeMb}mb` }));

  // Seed baseline demo corpus & users
  await seedInitialData();

  // Health and Readiness checks (Section 32)
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: config.appName,
      version: config.appVersion,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/ready', async (req: Request, res: Response) => {
    try {
      const stats = await vectorStore.getStats();
      const docs = db.getDocuments();
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'connected',
          vector_store: 'ready',
          indexed_vectors: stats.totalVectors,
          vector_dimension: stats.dimension,
          documents_count: docs.length,
          llm_provider: config.geminiApiKey ? 'gemini-active' : 'grounded-deterministic-fallback',
          embedding_provider: config.geminiApiKey ? 'gemini-embedding-active' : 'semantic-legal-vectorizer',
        },
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'not_ready',
        error: err.message,
      });
    }
  });

  // API v1 Routes (Section 8)
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/ask', askRouter);
  app.use('/api/v1/conversations', conversationsRouter);
  app.use('/api/v1/feedback', feedbackRouter);
  app.use('/api/v1/documents', documentsRouter);
  app.use('/api/v1/admin', adminRouter);

  // Centralized Error Handling Middleware (Section 31)
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const reqId = (req as any).requestId || 'unknown';
    console.error(`Unhandled API Error [${reqId}]:`, err);
    res.status(err.status || 500).json({
      error: {
        code: err.code || 'INTERNAL_SERVER_ERROR',
        message: err.message || 'An unexpected internal error occurred.',
        request_id: reqId,
      },
    });
  });

  // Vite Middleware for Frontend Serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Legal AI RAG Application server running on http://0.0.0.0:${PORT}`);
    console.log(`Environment: ${config.appEnv} | Version: ${config.appVersion}`);
  });
}

startServer().catch(err => {
  console.error('Fatal: Failed to start server', err);
  process.exit(1);
});
