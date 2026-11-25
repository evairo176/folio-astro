---
title: "AI RAG Internal Assistant"
company: "KPN Plantation"
description: "Retrieval-augmented generation assistant over internal documentation, serving 1,000+ internal staff and cutting routine engineering support tickets by around 50%. Built on a Go backend with Jina embeddings, Qdrant vector search, and a multi-layer guardrail system."
date: "2025-06-01"
tags: ["Golang", "Echo", "RAG", "Qdrant", "MongoDB", "Jina Embeddings", "React", "Vite", "CI/CD"]
featured: true
images:
  - /projects/ai-rag-assistant/image-1.png
  - /projects/ai-rag-assistant/image-2.png
  - /projects/ai-rag-assistant/image-3.png
  - /projects/ai-rag-assistant/image-4.png
  - /projects/ai-rag-assistant/image-5.png
  - /projects/ai-rag-assistant/image-6.png
metrics:
  - "1.000+ | active internal users"
  - "~50% | routine support tickets cut"
  - "1024-dim | semantic vector search"
  - "3-layer | safety guardrails"
---

An internal knowledge assistant for KPN Plantation that lets staff ask questions in natural language and get answers grounded strictly in company documents — policies, SOPs, technical manuals, and operational guides. Instead of digging through scattered PDFs or waiting on the engineering team, employees get instant, context-aware answers with the source material behind them.

## Overview

Plantation operations run on a large body of internal documentation that most staff rarely read end to end. The engineering team kept fielding the same routine questions — procedures, policy details, how-to steps — that were all already documented somewhere. The goal was to put that knowledge one question away, while making sure the assistant never invents answers or leaks sensitive information.

The system is a Retrieval-Augmented Generation (RAG) pipeline: documents are ingested, split into chunks, embedded into vectors, and stored in a vector database. When a user asks something, the question is embedded, the most relevant chunks are retrieved by semantic similarity, and those chunks are fed to an LLM as grounding context. The answer is built only from what the documents actually say.

## Key Features

### Document ingestion & processing
- Upload PDF, DOCX, and PPT files; text is extracted automatically per format.
- Each document is split into overlapping chunks (~1000 characters with 200-character overlap) so context isn't cut off mid-sentence.
- Every chunk is embedded and indexed for fast semantic retrieval.

### Semantic search & chat
- Natural-language questions are matched against document chunks by meaning, not keywords.
- Answers cite the retrieved context, so staff can verify the source.
- Conversation history is kept per session for coherent multi-turn chats.

### Knowledge base management
- A separate "knowledge" layer alongside uploaded documents for curated Q&A content.
- Admins manage system prompts that steer the assistant's tone and scope.

### Multi-layer safety guardrails
- **Input filtering** blocks out-of-scope or sensitive questions (other employees' salary, personal data, credentials, off-topic requests) before they ever reach the LLM.
- **Grounding enforcement** refuses to answer when no relevant document context is found, instead of letting the model improvise from general knowledge.
- **Dynamic admin rules** let administrators add, edit, or remove their own keyword and regex restrictions through an API — no redeploy needed. New rules hot-reload into the engine instantly.
- **Admin console** gives administrators a dedicated, login-protected page in the RAG Console to manage guardrail rules visually — add, toggle, and delete restrictions without touching the API directly.

## Architecture

The backend is a Go (Echo) REST API organized around a clean RAG pipeline:

**Ingestion path**
1. File uploaded → stored in S3-compatible object storage.
2. Format-specific extractor pulls raw text (PDF / DOCX / PPT).
3. Text is chunked with overlap to preserve context across boundaries.
4. Each chunk is embedded via Jina (1024-dimensional vectors).
5. Vectors are upserted into Qdrant for similarity search.

**Query path**
1. Incoming question runs through the guardrail input filter.
2. The question is embedded with the same Jina model.
3. Qdrant returns the top semantically similar chunks (HNSW index).
4. A grounding check verifies the retrieved context is relevant enough to answer.
5. Retrieved chunks + system prompt + chat history are assembled into the LLM request.
6. The LLM (OpenAI-compatible gateway) generates an answer grounded in the context.
7. The exchange is persisted to conversation history.

**Data layer**
- **Qdrant** — vector store for document and knowledge chunks (HNSW similarity search).
- **MongoDB** — documents, conversations, system prompts, and guardrail rules.
- **Redis** — caching for hot paths.
- **S3-compatible storage** — original uploaded files.

## Tech Stack

**Backend**
- Go with the Echo web framework
- Jina embeddings (jina-embeddings-v3, 1024-dim)
- Qdrant vector database
- MongoDB (documents, conversations, prompts, rules)
- Redis (caching)
- S3-compatible object storage
- OpenAI-compatible LLM gateway

**Frontend**
- React + Vite
- REST API integration with the Go backend

**Delivery**
- CI/CD pipeline for build and deploy
- Containerized services (Docker Compose)

## Engineering Challenges & Solutions

**Keeping answers grounded, not hallucinated.** An LLM left to its own devices will happily answer from general knowledge even when the documents say nothing. The fix was a grounding gate: if vector search returns no chunk above a minimum relevance score, the assistant refuses and tells the user the information isn't in the company documents. This single rule is what makes the answers trustworthy for an internal tool.

**Bounding what employees can ask.** A company assistant shouldn't answer questions about other staff's salaries, leak personal data, or wander into off-topic territory. I built a three-layer guardrail: a fast input filter (keyword + regex) that blocks before spending any tokens, the grounding check above, and mandatory system-prompt rules injected into every request. Crucially, admins can manage their own restriction rules dynamically through an API — rules live in the database and hot-reload into the engine, so policy changes don't require a code deploy.

**Preserving context across chunk boundaries.** Splitting documents naively cuts sentences and loses meaning. Using a fixed chunk size with deliberate overlap keeps each chunk self-contained enough for the embedder to capture its meaning, which directly improves retrieval quality.

## Quality & Verification

- The guardrail engine is covered by unit tests for input filtering, grounding logic, and dynamic rule matching (keyword + regex), including rule reload and clearing.
- The backend builds clean and passes `go vet`.
- Retrieval relevance is tuned via a minimum similarity threshold so weak matches don't trigger confident-sounding answers.

## Outcome

The assistant serves 1,000+ internal staff and cut routine engineering support tickets by around 50%, freeing the team from repeatedly answering questions the documentation already covered. Just as important, the guardrail design means the tool stays inside its lane — grounded in company documents, blocked from sensitive topics, and governable by admins without a redeploy.

> Internal plantation system — no public URL.
