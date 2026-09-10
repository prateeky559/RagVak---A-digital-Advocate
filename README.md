# LexiRAG: Enterprise Legal Document QA & Retrieval-Augmented Generation

[![CI/CD Status](https://img.shields.io/badge/CI-Passing-brightgreen.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](#)
[![Node.js](https://img.shields.io/badge/Node.js-22-green.svg)](#)
[![React](https://img.shields.io/badge/React-19-cyan.svg)](#)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash%20%26%20Embeddings-orange.svg)](#)
[![License](https://img.shields.io/badge/License-Apache%202.0-lightgrey.svg)](#)

LexiRAG is a high-assurance, citation-grounded Legal Document Retrieval-Augmented Generation (RAG) platform. Designed for legal teams, compliance officers, and enterprise counsel, LexiRAG delivers accurate statutory answers backed by verbatim document snippets, strict legal guardrails, and real-time observability.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Key Capabilities](#2-key-capabilities)
3. [System Architecture](#3-system-architecture)
4. [Technology Stack](#4-technology-stack)
5. [Quick Start & Setup](#5-quick-start--setup)
6. [Environment Variables](#6-environment-variables)
7. [Default Roles & Credentials](#7-default-roles--credentials)
8. [API Reference Guide](#8-api-reference-guide)
9. [Legal Semantic Chunking](#9-legal-semantic-chunking)
10. [Vector Embeddings & Retrieval](#10-vector-embeddings--retrieval)
11. [Prompt Injection & Defense Layer](#11-prompt-injection--defense-layer)
12. [Legal Safety Tiers & Emergency Handling](#12-legal-safety-tiers--emergency-handling)
13. [Document Ingestion Pipeline](#13-document-ingestion-pipeline)
14. [Strict Citations & Verification](#14-strict-citations--verification)
15. [Observability & Quality Metrics](#15-observability--quality-metrics)
16. [Automated Testing & Benchmark](#16-automated-testing--benchmark)
17. [Docker & Container Orchestration](#17-docker--container-orchestration)
18. [Directory Structure](#18-directory-structure)
19. [Security Policy & Disclaimers](#19-security-policy--disclaimers)
20. [License](#20-license)

---

## 1. Project Overview
Navigating vast corpuses of statutory texts, judicial precedents, and regulatory compliance standards requires exact provenance and strict citation. LexiRAG solves the hallucination problem in legal AI by ensuring that:
- **Every claim is grounded** in an indexed statutory authority.
- **Interactive citations** expose the exact Section, Page, Match Confidence, and Source Excerpt.
- **Multi-layer safety guards** detect prompt injections, block illicit requests, and deflect emergency crisis queries.
- **Full audit transparency** records ingestion jobs, latency percentiles, and user satisfaction ratings.

---

## 2. Key Capabilities
- **Grounded Legal Synthesis**: Leverages Google Gemini models (`gemini-3.8-flash` and `gemini-embedding-2-preview`) with fallback vectorizers.
- **Section-Aware Chunking**: Intelligently segments statutory texts along logical boundaries (`Article`, `Section §`, `Chapter`).
- **Cryptographic Provenance**: Computes SHA-256 hashes on ingested documents to ensure legal integrity.
- **Role-Based Access Control**: Strict separation between Counsel (`USER`) and Compliance Officer (`ADMIN`).
- **Live Observability**: Real-time tracking of latency (p50/p95), satisfaction score, and security interceptions.

---

## 3. System Architecture
```
+-------------------------------------------------------------+
|               React 19 + Tailwind UI Client                 |
+------------------------------+------------------------------+
                               | HTTPS / JSON API
+------------------------------v------------------------------+
|             Express 4 API Gateway (Port 3000)               |
|  - JWT & RBAC Middleware       - Token-Bucket Rate Limiter  |
|  - Input Sanitizer             - Prompt Injection Guard     |
+------------------------------+------------------------------+
                               |
            +------------------+------------------+
            |                                     |
+-----------v------------+            +-----------v------------+
|  Legal RAG Pipeline    |            | Admin Ingestion Router |
|  - Legal Safety Filter |            |  - PDF / Text Parser   |
|  - Gemini Embeddings   |            |  - Semantic Chunker    |
|  - Vector Cosine Store |            |  - Vector Indexer      |
|  - Gemini 3.8 Flash    |            |  - Audit Logger        |
+------------------------+            +------------------------+
```

---

## 4. Technology Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Vite.
- **Backend API**: Node.js 22, Express 4, TypeScript (`tsx`).
- **AI & Vectors**: `@google/genai` (Gemini 3.8 Flash, Gemini Embeddings).
- **Security**: `bcryptjs` for salted password hashing, `jsonwebtoken` for auth, custom input sanitizers.
- **Testing**: Node.js built-in test runner (`node --test`), Python evaluation benchmark suite (`eval/eval_rag.py`).

---

## 5. Quick Start & Setup

### Prerequisites
- Node.js >= 20 (Node 22 recommended)
- Python 3.9+ (for evaluation benchmarks and CLI scripts)
- (Optional) `GEMINI_API_KEY` for live AI generation. If not provided, the deterministic semantic synthesizer activates automatically.

### Installation
```bash
# 1. Clone repository & install dependencies
npm install

# 2. Start development server (boots on port 3000)
npm run dev

# 3. In another terminal, verify system readiness
./scripts/healthcheck.sh
```

---

## 6. Environment Variables
Declare environment variables in `.env` (refer to `.env.example`):
```env
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_jwt_secret_key_here
EMBEDDING_MODEL=gemini-embedding-2-preview
GENERATION_MODEL=gemini-3.8-flash
LLM_MODEL=gemini-3.8-flash
```

---

## 7. Default Roles & Credentials
The system comes pre-seeded with two demo accounts for testing:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Compliance Officer (Admin)** | `admin@legalrag.internal` | `AdminPass123!` | Ingest documents, re-index vectors, view metrics & audit logs |
| **Legal Counsel (User)** | `counsel@legalrag.internal` | `UserPass123!` | Ask questions, manage conversations, submit citation feedback |

---

## 8. API Reference Guide

### Health Probes
- `GET /health`: Liveness probe.
- `GET /ready`: Readiness probe with vector store and database diagnostics.

### Authentication
- `POST /api/v1/auth/register`: Create a new user account.
- `POST /api/v1/auth/login`: Authenticate and receive `access_token` and `refresh_token`.
- `GET /api/v1/auth/me`: Retrieve current user profile.

### Legal Q&A (RAG)
- `POST /api/v1/ask`: Ask a legal query.
  ```json
  {
    "question": "Under GDPR Article 17, what are the grounds for erasure?",
    "top_k": 5,
    "jurisdiction_filter": "European Union"
  }
  ```
  **Response**:
  ```json
  {
    "answer": "Under GDPR Article 17...",
    "citations": [
      {
        "document_title": "General Data Protection Regulation (GDPR) - Chapter III",
        "section": "Article 17",
        "page": 1,
        "score": 0.89,
        "snippet": "Article 17 — Right to erasure..."
      }
    ],
    "safety_classification": "SAFE_INFORMATION",
    "disclaimer": "This application provides general legal information...",
    "latency_ms": 462
  }
  ```

### Admin & Documents
- `GET /api/v1/documents`: List all indexed legal documents.
- `GET /api/v1/documents/:id`: Retrieve detailed metadata and chunks for a document.
- `POST /api/v1/admin/documents/upload`: Upload PDF or text file with statutory metadata.
- `POST /api/v1/admin/documents/reindex`: Re-embed and index all documents.
- `GET /api/v1/admin/metrics`: View system telemetry, queries processed, and satisfaction score.

---

## 9. Legal Semantic Chunking
Traditional fixed-window chunkers fracture legal provisions midway through statutory definitions or clauses. The `DocumentChunker` in `server/chunker.ts` incorporates regex heuristics for:
- Statutory Articles (`Article 17`, `Article 20`)
- Sub-sections (`§ 2-314`, `§ 512(c)`)
- Title and Chapter headers
This guarantees that clauses retain their statutory context when embedded.

---

## 10. Vector Embeddings & Retrieval
- Embeddings are generated using Google's `gemini-embedding-2-preview` model with 3072/768 dimensions.
- Normalized vector representations are compared using Cosine Similarity:
  $$\text{sim}(u, v) = \frac{u \cdot v}{\|u\|_2 \|v\|_2}$$
- Chunks scoring below the confidence threshold ($< 0.40$) are pruned to prevent out-of-domain noise.

---

## 11. Prompt Injection & Defense Layer
The system enforces defense-in-depth:
- Sanitizes unicode homoglyphs and hidden control characters.
- Detects instruction override patterns (`ignore previous instructions`, `reveal system prompt`, `system:`, `jailbreak`).
- Immediately intercepts malicious queries and records security audit logs without forwarding them to the LLM.

---

## 12. Legal Safety Tiers & Emergency Handling
Every query is categorized into one of four safety tiers before processing:
1. `EMERGENCY`: Threat to life, violence, suicide. Intercepted with crisis hotline instructions.
2. `ILLEGAL_REQUEST`: Solicitation of crime assistance (money laundering, tax fraud). Blocked.
3. `PERSONALIZED_LEGAL_ADVICE`: Representation inquiries or predictions of lawsuit outcome. Injected with explicit non-attorney warnings.
4. `SAFE_INFORMATION`: General legal and statutory inquiries. Synthesized with citations.

---

## 13. Document Ingestion Pipeline
Admin users can ingest documents through:
1. **Drag-and-Drop Web UI**: Supporting PDF, TXT, and Markdown files.
2. **REST API Endpoint**: `POST /api/v1/admin/documents/upload`
3. **CLI Script**: `python3 scripts/ingest_documents.py`

---

## 14. Strict Citations & Verification
The prompt sent to Gemini explicitly instructs the model:
> "State facts ONLY from the retrieved context. For every factual assertion, append the corresponding bracketed citation marker like [1] or [2]. If the text does not contain sufficient authority, state clearly that the indexed knowledge base does not cover that provision."

---

## 15. Observability & Quality Metrics
The Admin Observability dashboard visualizes:
- **Total Queries Executed**
- **Average Latency (ms)**
- **Interceptions Triggered** (Prompt injections & illegal requests)
- **User Satisfaction Rate** (% thumbs up)
- **Subsystem Readiness Status**

---

## 16. Automated Testing & Benchmark

### Automated Test Suite
Run the 15-test automated validation suite:
```bash
npm test
```

### Retrieval & Security Evaluation Benchmark
Execute the automated benchmark against the running server:
```bash
python3 eval/eval_rag.py
```
This tests:
- Recall@K across GDPR, CCPA, UCC, and DMCA queries.
- Security interception accuracy against prompt injections and emergency probes.
- Response latency thresholds.

---

## 17. Docker & Container Orchestration
Build and run the entire multi-container production stack:
```bash
docker-compose up --build
```
Includes:
- `app`: LexiRAG container running on port 3000.
- `postgres`: PostgreSQL 16 with `pgvector` extension.
- `redis`: Redis 7 for distributed rate limiting.

---

## 18. Directory Structure
```
├── server.ts                 # Main Express server entry point
├── server/                   # Backend modular architecture
│   ├── config.ts             # Configuration and environment management
│   ├── db.ts                 # Atomic persistence engine
│   ├── security.ts           # Auth, password hashing, prompt sanitizer
│   ├── rateLimiter.ts        # In-memory Token-Bucket rate limiting
│   ├── chunker.ts            # Legal statutory syntax chunker
│   ├── embeddings.ts         # Gemini vector embedding service
│   ├── vectorStore.ts        # Cosine similarity vector search
│   ├── safety.ts             # Legal safety tiers & emergency classifier
│   ├── llm.ts                # Grounded Gemini synthesis service
│   ├── ragPipeline.ts        # End-to-end RAG orchestrator
│   ├── seedData.ts           # Initial statutory seed data
│   └── routes/               # REST API endpoints (auth, ask, admin, etc.)
├── src/                      # React 19 Frontend
│   ├── App.tsx               # Main application component
│   ├── types.ts              # Frontend TypeScript interfaces
│   ├── services/api.ts       # Frontend REST API client
│   └── components/           # Sub-components (Navbar, ChatView, Admin, etc.)
├── data/documents/           # Seed statutory texts (GDPR, CCPA, UCC, DMCA)
├── scripts/                  # CLI automation (healthcheck, ingest, reindex, seed)
├── eval/                     # Automated RAG retrieval & security benchmarks
├── tests/                    # Automated integration & unit tests
├── Dockerfile                # Production multi-stage Docker build
└── docker-compose.yml        # Multi-container orchestration
```

---

## 19. Security Policy & Disclaimers
LexiRAG provides informational summaries of legal texts and does not provide formal legal advice, representation, or guarantees. Always consult a licensed attorney for specific legal counsel. See [SECURITY.md](SECURITY.md) for full security details.

---

## 20. License
Distributed under the Apache 2.0 License. See `LICENSE` for details.
