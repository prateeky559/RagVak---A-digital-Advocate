import { Router, Response } from 'express';
import { AuthenticatedRequest, authenticateUser } from './auth.js';
import { db, Conversation } from '../db.js';

export const conversationsRouter = Router();

// All conversation routes require authentication
conversationsRouter.use(authenticateUser);

// GET /api/v1/conversations
conversationsRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  const conversations = db.getConversations(req.user!.userId);
  res.json({
    conversations,
    total: conversations.length,
  });
});

// POST /api/v1/conversations
conversationsRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  const { title } = req.body;
  const newConv: Conversation = {
    id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    user_id: req.user!.userId,
    title: (title && typeof title === 'string' && title.trim()) ? title.trim() : 'New Legal Inquiry',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  db.addConversation(newConv);
  res.status(201).json(newConv);
});

// GET /api/v1/conversations/:id
conversationsRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  const conv = db.getConversationById(req.params.id, req.user!.userId);
  if (!conv) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Conversation not found or access denied.',
        request_id: req.requestId,
      },
    });
    return;
  }
  const messages = db.getMessages(conv.id);
  res.json({
    ...conv,
    messages,
  });
});

// DELETE /api/v1/conversations/:id
conversationsRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  const removed = db.deleteConversation(req.params.id, req.user!.userId);
  if (!removed) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Conversation not found or access denied.',
        request_id: req.requestId,
      },
    });
    return;
  }
  res.json({ success: true, message: 'Conversation deleted.' });
});

// GET /api/v1/conversations/:id/messages
conversationsRouter.get('/:id/messages', (req: AuthenticatedRequest, res: Response) => {
  const conv = db.getConversationById(req.params.id, req.user!.userId);
  if (!conv) {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Conversation not found or access denied.',
        request_id: req.requestId,
      },
    });
    return;
  }
  const messages = db.getMessages(conv.id);
  res.json({
    conversation_id: conv.id,
    messages,
    total: messages.length,
  });
});
