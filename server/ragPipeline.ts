import { LegalSafetyService, LegalSafetyCategory } from './safety.js';
import { SecurityService } from './security.js';
import { embeddingService } from './embeddings.js';
import { vectorStore, SearchResult } from './vectorStore.js';
import { llmService, GeneratedAnswer } from './llm.js';
import { db, MessageCitation } from './db.js';

export interface RAGRequest {
  question: string;
  conversation_id?: string;
  top_k?: number;
  jurisdiction_filter?: string;
  document_type_filter?: string;
  user_id?: string;
  request_id: string;
  attachments?: any[];
}

export interface RAGResponse {
  answer: string;
  citations: MessageCitation[];
  conversation_id?: string;
  message_id: string;
  request_id: string;
  safety_classification: LegalSafetyCategory;
  disclaimer: string;
  latency_ms: number;
}

export class RAGPipeline {
  /**
   * Complete end-to-end RAG workflow with safety, retrieval, generation and metrics
   */
  public static async execute(request: RAGRequest): Promise<RAGResponse> {
    const startTime = Date.now();
    const { question, conversation_id, top_k = 5, jurisdiction_filter, document_type_filter, user_id, request_id } = request;

    // 1. Input validation & sanitization
    const sanitizedQuestion = SecurityService.sanitizeText(question);
    if (!sanitizedQuestion || sanitizedQuestion.length < 3) {
      throw new Error('Question must be at least 3 characters long.');
    }
    if (sanitizedQuestion.length > 3000) {
      throw new Error('Question exceeds maximum permitted length of 3000 characters.');
    }

    // 2. Prompt Injection Defense Check
    const injectionCheck = SecurityService.checkPromptInjection(sanitizedQuestion);
    if (injectionCheck.isSuspicious) {
      db.addAuditLog({
        id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        user_id,
        action: 'PROMPT_INJECTION_DETECTED',
        resource_type: 'RAG_QUERY',
        request_id,
        created_at: new Date().toISOString(),
        metadata: { question: sanitizedQuestion.slice(0, 100), reason: injectionCheck.reason },
      });

      return {
        answer:
          'Security Notice: Your inquiry contains system instruction override patterns or prompt injection structures that violate security policy. The query cannot be processed.\n\nPlease ask a substantive legal question regarding laws, statutory provisions, or legal agreements.',
        citations: [],
        conversation_id,
        message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        request_id,
        safety_classification: 'HIGH_RISK_LEGAL',
        disclaimer: LegalSafetyService.LEGAL_DISCLAIMER,
        latency_ms: Date.now() - startTime,
      };
    }

    // 3. Safety Classification
    const safetyResult = LegalSafetyService.classifyQuery(sanitizedQuestion);

    // If query is blocked (Emergency or Illegal Assistance)
    if (safetyResult.isBlocked) {
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      return {
        answer: `${safetyResult.reason}\n\n${safetyResult.advisory}`,
        citations: [],
        conversation_id,
        message_id: messageId,
        request_id,
        safety_classification: safetyResult.category,
        disclaimer: LegalSafetyService.LEGAL_DISCLAIMER,
        latency_ms: Date.now() - startTime,
      };
    }

    // 4. Query Embedding Generation
    const queryVector = await embeddingService.embedQuery(sanitizedQuestion);

    // 5. Vector Search & Retrieval
    const searchResults: SearchResult[] = await vectorStore.search({
      queryVector,
      topK: Math.min(Math.max(top_k, 1), 10),
      scoreThreshold: 0.25, // allow relevant contextual chunks
      jurisdictionFilter: jurisdiction_filter,
      documentTypeFilter: document_type_filter,
    });

    // 6. Fetch conversation context if part of a conversation
    let history: { role: string; content: string }[] = [];
    if (conversation_id) {
      const pastMessages = db.getMessages(conversation_id);
      // Take last 4 messages for concise context
      history = pastMessages.slice(-4).map(m => ({ role: m.role, content: m.content }));
    }

    // 7. Grounded Answer Generation
    const generated: GeneratedAnswer = await llmService.generateAnswer({
      question: sanitizedQuestion,
      contextChunks: searchResults,
      safetyCategory: safetyResult.category,
      safetyAdvisory: safetyResult.advisory,
      conversationHistory: history,
    });

    // 8. Citations formatting
    const citations: MessageCitation[] = generated.citations.map(c => ({
      document_id: c.documentId,
      document_title: c.documentTitle,
      page: c.page,
      section: c.section,
      snippet: c.snippet,
      score: c.score,
      jurisdiction: c.jurisdiction,
      act_name: c.actName,
    }));

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const latency = Date.now() - startTime;

    // 9. Persist messages if conversation_id provided
    if (conversation_id) {
      // User message
      db.addMessage({
        id: `msg_u_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        conversation_id,
        role: 'user',
        content: sanitizedQuestion,
        created_at: new Date().toISOString(),
        request_id,
        attachments: request.attachments,
      });

      // Assistant message
      db.addMessage({
        id: messageId,
        conversation_id,
        role: 'assistant',
        content: generated.answer,
        created_at: new Date().toISOString(),
        request_id,
        citations,
        safety_classification: safetyResult.category,
      });
    }

    // 10. Audit log
    db.addAuditLog({
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      user_id,
      action: 'RAG_QUERY_EXECUTED',
      resource_type: 'RAG',
      request_id,
      created_at: new Date().toISOString(),
      metadata: {
        latency_ms: latency,
        chunks_retrieved: searchResults.length,
        safety_category: safetyResult.category,
        top_score: searchResults[0]?.score || 0,
      },
    });

    return {
      answer: generated.answer,
      citations,
      conversation_id,
      message_id: messageId,
      request_id,
      safety_classification: safetyResult.category,
      disclaimer: LegalSafetyService.LEGAL_DISCLAIMER,
      latency_ms: latency,
    };
  }
}
