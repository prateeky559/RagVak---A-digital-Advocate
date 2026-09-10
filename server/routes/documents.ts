import { Router, Response } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { db } from '../db.js';

export const documentsRouter = Router();

// GET /api/v1/documents
documentsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const docs = db.getDocuments();
  res.json({
    documents: docs,
    total: docs.length,
  });
});

// GET /api/v1/documents/:id
documentsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const doc = db.getDocumentById(req.params.id);
  if (!doc) {
    res.status(404).json({
      error: {
        code: 'DOCUMENT_NOT_FOUND',
        message: 'Legal document not found.',
        request_id: req.requestId,
      },
    });
    return;
  }

  const chunks = db.getChunks(doc.id).map(c => ({
    id: c.id,
    chunk_index: c.chunk_index,
    page_number: c.page_number,
    section: c.section,
    content: c.content,
    citation_label: c.citation_label,
  }));

  res.json({
    ...doc,
    chunks,
  });
});
