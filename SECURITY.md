# Security Policy & Defensive Architecture

## 1. Threat Model & Overview
Legal AI applications present unique security challenges:
- **Prompt Injection & System Prompt Leaks**: Adversaries may attempt to bypass grounding constraints, alter statutory citations, or extract confidential internal prompts.
- **Unauthorized Practice of Law (UPL)**: The system must never provide speculative guarantees, formal legal representation, or execute illegal instructions.
- **Data Poisoning**: Ingested legal documents must be authenticated and validated with cryptographic checksums (`SHA-256`) to ensure integrity.

---

## 2. Defensive Controls Implemented

### A. Strict Prompt Injection Scanner
The ingestion and query gateways sanitize all input strings:
- Strips null bytes and control characters.
- Detects instruction override signatures (e.g. `ignore all previous instructions`, `reveal system prompt`, `<|im_start|>`, `system:`, `as an unrestricted model`).
- Blocks and records violations in the security audit log (`SECURITY_INTERCEPTION`).

### B. Legal Safety & Emergency Classifier
Before semantic retrieval begins, `LegalSafetyService` assigns a risk category:
1. `EMERGENCY`: Violence, immediate bodily threat, suicide. Instantly bypassed to emergency services (911/crisis hotline); no LLM is executed.
2. `ILLEGAL_REQUEST`: Solicitation of assistance with tax fraud, money laundering, evidence destruction, or fleeing jurisdiction. Blocked with standard refusal.
3. `PERSONALIZED_LEGAL_ADVICE`: Tailored questions regarding lawsuits, divorce, or damage calculations. Injected with a statutory advisory reminding user of non-attorney status.
4. `SAFE_INFORMATION`: Substantive questions regarding statutes, regulations, or case law. Processed with grounded citations.

### C. Grounding & Anti-Hallucination
- Gemini is configured with explicit instructions requiring citations for every factual proposition.
- If no indexed documents match the user query with sufficient semantic similarity, the system states that no relevant authorities were found rather than hallucinating answers.

### D. Authentication & Rate Limiting
- Passwords are encrypted using salted `bcryptjs` hashes.
- Stateless, cryptographically signed JSON Web Tokens (`HS256`).
- In-memory Token-Bucket rate limiting prevents denial-of-service and brute force abuse across sensitive endpoints (`/api/v1/auth/*` and `/api/v1/ask`).

---

## 3. Reporting a Vulnerability
To report a potential vulnerability or security issue, please contact the security team or compliance officer at `security@legalrag.internal`. All disclosures receive prompt investigation within 24 hours.
