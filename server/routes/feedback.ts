import { Router, Response } from 'express';
import { AuthenticatedRequest, optionalAuth } from './auth.js';
import { db, Feedback } from '../db.js';

export const feedbackRouter = Router();

// POST /api/v1/feedback
feedbackRouter.post('/', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const { message_id, rating, comment } = req.body;

  if (!message_id) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'message_id is required.',
        request_id: req.requestId,
      },
    });
    return;
  }

  if (rating !== 1 && rating !== -1) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'rating must be either 1 (positive) or -1 (negative).',
        request_id: req.requestId,
      },
    });
    return;
  }

  const newFeedback: Feedback = {
    id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: req.user?.userId || 'anonymous',
    message_id,
    rating,
    comment: comment ? String(comment).trim().slice(0, 1000) : undefined,
    created_at: new Date().toISOString(),
  };

  db.addFeedback(newFeedback);

  db.addAuditLog({
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: req.user?.userId,
    action: 'FEEDBACK_SUBMITTED',
    resource_type: 'FEEDBACK',
    resource_id: newFeedback.id,
    request_id: req.requestId,
    created_at: new Date().toISOString(),
    metadata: { rating, has_comment: !!comment },
  });

  res.status(201).json({
    success: true,
    feedback: newFeedback,
    message: 'Thank you for your feedback.',
  });
});
