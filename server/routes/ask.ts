import { Router, Response } from 'express';
import { AuthenticatedRequest, optionalAuth } from './auth.js';
import { RAGPipeline } from '../ragPipeline.js';
import { createRateLimiter } from '../rateLimiter.js';
import { db } from '../db.js';

export const askRouter = Router();

// Rate limit: 30 requests per minute
const askLimiter = createRateLimiter(30, 60000, 'ask');

askRouter.post('/', askLimiter, optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      question,
      conversation_id,
      top_k = 5,
      jurisdiction_filter,
      document_type_filter,
      attachments,
    } = req.body;

    // Validate question
    if (!question || typeof question !== 'string' || question.trim().length === 0) {
      res.status(400).json({
        error: {
          code: 'INVALID_QUESTION',
          message: 'The question field is required and cannot be empty.',
          request_id: req.requestId,
        },
      });
      return;
    }

    if (question.length > 3000) {
      res.status(400).json({
        error: {
          code: 'QUESTION_TOO_LONG',
          message: 'Question length exceeds maximum limit of 3000 characters.',
          request_id: req.requestId,
        },
      });
      return;
    }

    // Validate top_k
    const parsedTopK = parseInt(top_k as any, 10) || 5;
    if (parsedTopK < 1 || parsedTopK > 10) {
      res.status(400).json({
        error: {
          code: 'INVALID_TOP_K',
          message: 'top_k must be an integer between 1 and 10.',
          request_id: req.requestId,
        },
      });
      return;
    }

    // Check conversation ownership if conversation_id is provided
    let activeConversationId = conversation_id;
    const userId = req.user?.userId || 'guest_user';

    if (conversation_id) {
      if (req.user) {
        const conv = db.getConversationById(conversation_id, req.user.userId);
        if (!conv) {
          res.status(404).json({
            error: {
              code: 'CONVERSATION_NOT_FOUND',
              message: 'Conversation was not found or does not belong to the authenticated user.',
              request_id: req.requestId,
            },
          });
          return;
        }
      }
    } else if (req.user) {
      // Auto-create conversation for authenticated user if none provided
      const newConv = db.addConversation({
        id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        user_id: req.user.userId,
        title: question.trim().slice(0, 50) + (question.length > 50 ? '...' : ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      activeConversationId = newConv.id;
    }

    // Execute RAG Pipeline
    const ragResult = await RAGPipeline.execute({
      question,
      conversation_id: activeConversationId,
      top_k: parsedTopK,
      jurisdiction_filter,
      document_type_filter,
      user_id: req.user?.userId,
      request_id: req.requestId || `req_${Date.now()}`,
      attachments,
    });

    res.json(ragResult);
  } catch (err: any) {
    console.error('Error handling /ask request:', err);
    res.status(500).json({
      error: {
        code: 'RAG_PROCESSING_ERROR',
        message: err.message || 'An error occurred while processing your legal query.',
        request_id: req.requestId,
      },
    });
  }
});
