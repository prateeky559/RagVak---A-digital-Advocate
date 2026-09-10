import { Router, Response } from 'express';
import crypto from 'crypto';
import multer from 'multer';
import * as pdfParseModule from 'pdf-parse';
const pdfParse: any = (pdfParseModule as any).default || pdfParseModule;
import { AuthenticatedRequest, authenticateUser, requireAdmin } from './auth.js';
import { db, LegalDocument, IngestionJob } from '../db.js';
import { DocumentChunker } from '../chunker.js';
import { embeddingService } from '../embeddings.js';
import { SecurityService } from '../security.js';
import { createRateLimiter } from '../rateLimiter.js';

export const adminRouter = Router();

// Require both authentication and ADMIN role for all routes in adminRouter
adminRouter.use(authenticateUser);
adminRouter.use(requireAdmin);

// Multer memory storage for uploads (up to 25MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Upload rate limiter (10 uploads per minute)
const uploadLimiter = createRateLimiter(10, 60000, 'admin_upload');

// POST /api/v1/admin/documents/upload
adminRouter.post('/documents/upload', uploadLimiter, upload.single('file'), async (req: AuthenticatedRequest, res: Response) => {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  try {
    const {
      title,
      source = 'Official Publication',
      jurisdiction = 'General',
      document_type = 'STATUTE',
      version = '1.0',
      effective_date = new Date().toISOString().split('T')[0],
      raw_text,
    } = req.body;

    if (!title || typeof title !== 'string') {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Document title is required.',
          request_id: req.requestId,
        },
      });
      return;
    }

    let extractedText = '';

    if (req.file) {
      const sanitizedName = SecurityService.sanitizeFilename(req.file.originalname);
      if (req.file.mimetype === 'application/pdf' || sanitizedName.endsWith('.pdf')) {
        try {
          const parsed = await pdfParse(req.file.buffer);
          extractedText = parsed.text;
        } catch (pdfErr: any) {
          res.status(400).json({
            error: {
              code: 'PDF_PARSE_FAILED',
              message: `Failed to extract text from PDF: ${pdfErr.message}`,
              request_id: req.requestId,
            },
          });
          return;
        }
      } else {
        // Plain text / Markdown
        extractedText = req.file.buffer.toString('utf8');
      }
    } else if (raw_text && typeof raw_text === 'string') {
      extractedText = raw_text;
    } else {
      res.status(400).json({
        error: {
          code: 'NO_DOCUMENT_DATA',
          message: 'Either a file upload or raw_text must be provided.',
          request_id: req.requestId,
        },
      });
      return;
    }

    if (extractedText.trim().length < 20) {
      res.status(400).json({
        error: {
          code: 'DOCUMENT_TEXT_TOO_SHORT',
          message: 'Extracted document text contains fewer than 20 characters.',
          request_id: req.requestId,
        },
      });
      return;
    }

    // Compute checksum
    const checksum = crypto.createHash('sha256').update(extractedText).digest('hex');

    // Create Document entity
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newDoc: LegalDocument = {
      id: docId,
      title: title.trim(),
      source: source.trim(),
      jurisdiction: jurisdiction.trim(),
      document_type: document_type as any,
      version: version.trim(),
      effective_date,
      status: 'ACTIVE',
      checksum,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Track Ingestion Job
    db.addIngestionJob({
      id: jobId,
      document_id: docId,
      document_title: newDoc.title,
      status: 'PROCESSING',
      started_at: new Date().toISOString(),
      chunk_count: 0,
    });

    db.addDocument(newDoc);

    // Chunk Document
    const rawChunks = DocumentChunker.chunkDocument(newDoc, extractedText);

    // Generate Embeddings
    const texts = rawChunks.map(c => c.content);
    const embeddings = await embeddingService.embedDocuments(texts);

    const chunksWithVectors = rawChunks.map((chunk, idx) => ({
      ...chunk,
      embedding: embeddings[idx] || [],
    }));

    db.addChunks(chunksWithVectors);

    // Complete Job
    db.updateIngestionJob(jobId, {
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      chunk_count: chunksWithVectors.length,
    });

    // Audit Log
    db.addAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user_id: req.user!.userId,
      action: 'DOCUMENT_INGESTED',
      resource_type: 'LEGAL_DOCUMENT',
      resource_id: docId,
      request_id: req.requestId,
      created_at: new Date().toISOString(),
      metadata: {
        title: newDoc.title,
        chunk_count: chunksWithVectors.length,
        checksum,
      },
    });

    res.status(201).json({
      success: true,
      document: {
        ...newDoc,
        chunk_count: chunksWithVectors.length,
      },
      job_id: jobId,
      message: `Successfully ingested "${newDoc.title}" into vector store (${chunksWithVectors.length} chunks).`,
    });
  } catch (err: any) {
    db.updateIngestionJob(jobId, {
      status: 'FAILED',
      completed_at: new Date().toISOString(),
      error_message: err.message,
    });

    res.status(500).json({
      error: {
        code: 'INGESTION_FAILED',
        message: `Document ingestion failed: ${err.message}`,
        request_id: req.requestId,
      },
    });
  }
});

// POST /api/v1/admin/documents/reindex
adminRouter.post('/documents/reindex', async (req: AuthenticatedRequest, res: Response) => {
  const jobId = `job_reindex_${Date.now()}`;
  try {
    db.addIngestionJob({
      id: jobId,
      document_id: 'all_documents',
      document_title: 'Full Knowledge Base Reindex',
      status: 'PROCESSING',
      started_at: new Date().toISOString(),
      chunk_count: 0,
    });

    const allChunks = db.getChunks();
    const texts = allChunks.map(c => c.content);
    const newEmbeddings = await embeddingService.embedDocuments(texts);

    allChunks.forEach((c, idx) => {
      if (newEmbeddings[idx]) {
        c.embedding = newEmbeddings[idx];
      }
    });

    db.save();

    db.updateIngestionJob(jobId, {
      status: 'COMPLETED',
      completed_at: new Date().toISOString(),
      chunk_count: allChunks.length,
    });

    db.addAuditLog({
      id: `audit_${Date.now()}`,
      user_id: req.user!.userId,
      action: 'REINDEX_COMPLETED',
      resource_type: 'VECTOR_INDEX',
      request_id: req.requestId,
      created_at: new Date().toISOString(),
      metadata: { total_chunks_reindexed: allChunks.length },
    });

    res.json({
      success: true,
      message: `Re-indexing completed across ${allChunks.length} chunks.`,
      job_id: jobId,
      total_chunks: allChunks.length,
    });
  } catch (err: any) {
    db.updateIngestionJob(jobId, {
      status: 'FAILED',
      completed_at: new Date().toISOString(),
      error_message: err.message,
    });
    res.status(500).json({
      error: {
        code: 'REINDEX_FAILED',
        message: `Reindex operation failed: ${err.message}`,
        request_id: req.requestId,
      },
    });
  }
});

// PUT /api/v1/admin/documents/:id
adminRouter.put('/documents/:id', (req: AuthenticatedRequest, res: Response) => {
  const { title, source, jurisdiction, document_type, version, effective_date, status } = req.body;
  const updated = db.updateDocument(req.params.id, {
    title,
    source,
    jurisdiction,
    document_type,
    version,
    effective_date,
    status,
  });

  if (!updated) {
    res.status(404).json({
      error: {
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Legal document not found.',
        request_id: req.requestId,
      },
    });
    return;
  }

  db.addAuditLog({
    id: `audit_${Date.now()}`,
    user_id: req.user!.userId,
    action: 'DOCUMENT_UPDATED',
    resource_type: 'LEGAL_DOCUMENT',
    resource_id: req.params.id,
    request_id: req.requestId,
    created_at: new Date().toISOString(),
    metadata: { updates: req.body },
  });

  res.json({
    success: true,
    document: updated,
  });
});

// DELETE /api/v1/admin/documents/:id
adminRouter.delete('/documents/:id', (req: AuthenticatedRequest, res: Response) => {
  const removed = db.deleteDocument(req.params.id);
  if (!removed) {
    res.status(404).json({
      error: {
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Document not found.',
        request_id: req.requestId,
      },
    });
    return;
  }

  db.addAuditLog({
    id: `audit_${Date.now()}`,
    user_id: req.user!.userId,
    action: 'DOCUMENT_DELETED',
    resource_type: 'LEGAL_DOCUMENT',
    resource_id: req.params.id,
    request_id: req.requestId,
    created_at: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Document and all associated vector embeddings have been deleted.',
  });
});

// GET /api/v1/admin/ingestion-jobs
adminRouter.get('/ingestion-jobs', (req: AuthenticatedRequest, res: Response) => {
  const jobs = db.getIngestionJobs(50);
  res.json({
    jobs,
    total: jobs.length,
  });
});

// GET /api/v1/admin/metrics
adminRouter.get('/metrics', (req: AuthenticatedRequest, res: Response) => {
  const users = db.getUsers();
  const docs = db.getDocuments();
  const chunks = db.getChunks();
  const feedbackList = db.getFeedback();
  const auditLogs = db.getAuditLogs(500);

  const ragLogs = auditLogs.filter(a => a.action === 'RAG_QUERY_EXECUTED');
  const latencies = ragLogs.map(a => a.metadata?.latency_ms || 0).filter(l => l > 0);
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

  const totalQuestions = ragLogs.length;
  const injectionLogs = auditLogs.filter(a => a.action === 'PROMPT_INJECTION_DETECTED');

  const positiveRatings = feedbackList.filter(f => f.rating === 1).length;
  const negativeRatings = feedbackList.filter(f => f.rating === -1).length;
  const satisfactionRate = feedbackList.length > 0 ? Math.round((positiveRatings / feedbackList.length) * 100) : 100;

  res.json({
    users: {
      total: users.length,
      active: users.filter(u => u.is_active).length,
    },
    documents: {
      total_documents: docs.length,
      total_chunks: chunks.length,
    },
    performance: {
      total_questions: totalQuestions,
      average_latency_ms: avgLatency,
      prompt_injections_blocked: injectionLogs.length,
    },
    feedback: {
      total_feedback: feedbackList.length,
      positive: positiveRatings,
      negative: negativeRatings,
      satisfaction_rate_percent: satisfactionRate,
    },
    recent_jobs: db.getIngestionJobs(5),
  });
});
