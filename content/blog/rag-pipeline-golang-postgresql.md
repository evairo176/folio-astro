---
title: "Building a RAG Pipeline Serving 1,000+ Users with Golang and PostgreSQL"
description: "How I built a retrieval-augmented generation system over internal documents for plantation staff, and why I chose Golang + pgvector over the Python+LangChain default."
date: "2026-06-09"
tags: ["AI", "RAG", "Golang", "PostgreSQL", "LLM", "Architecture"]
lang: "en"
---

When management asked for an AI assistant that could answer questions about internal SOPs, field reports, and compliance documents, the obvious stack was Python plus LangChain. I went with **Golang and PostgreSQL** instead. Here is why, and how it handles 1,000+ internal staff without falling over.

## The Requirements

The system needed to:
- Ingest hundreds of internal documents (PDF, DOCX, plain text)
- Chunk, embed, and store vectors for semantic search
- Answer natural-language questions with citations back to source documents
- Serve concurrent requests from field staff across multiple regions
- Run on existing infrastructure (no GPU servers, no separate vector DB)

The "no separate vector DB" constraint was the turning point. We already ran PostgreSQL for everything else. Adding pgvector meant one less service to maintain, monitor, and back up.

## Architecture

```
[Documents] --> [Go Ingester] --> [Chunker] --> [Embedding API] --> [pgvector table]
                                                                            |
[User Query] --> [Go API] --> [Embed Query] --> [pgvector ANN search] --> [Context]
                     |                                                        |
                     +---> [LLM API with context] --> [Response + citations]
```

The entire pipeline is two Go services: an ingester (batch job) and the API server. PostgreSQL holds both the document metadata and the vector embeddings.

## Why Golang, Not Python

Python is the default for anything AI-related. But our constraint was not model training or experimentation. It was a production API serving concurrent users with low latency. Golang wins here for three reasons:

1. **Concurrency** — Goroutines handle parallel embedding calls and DB queries without the GIL or async ceremony. A single Go binary serves hundreds of concurrent requests.
2. **Deployment** — One static binary. No virtualenv, no dependency hell, no `pip install` on production servers.
3. **Performance** — The API layer is I/O bound (DB queries, LLM API calls). Go's standard library HTTP client and connection pooling are battle-tested at scale.

## The Chunking Strategy

Document chunking is where most RAG pipelines go wrong. Too small and you lose context. Too large and retrieval precision drops.

I settled on a hybrid approach:

```go
func ChunkDocument(doc Document, maxTokens int) []Chunk {
    // 1. Split by headers (##, ###) first
    sections := splitByHeaders(doc.Content)
    
    var chunks []Chunk
    for _, section := range sections {
        if countTokens(section) <= maxTokens {
            chunks = append(chunks, Chunk{
                Content:  section,
                Metadata: doc.Metadata,
            })
        } else {
            // 2. Fall back to paragraph splitting
            paragraphs := splitByParagraphs(section, maxTokens)
            chunks = append(chunks, paragraphs...)
        }
    }
    return chunks
}
```

Each chunk carries the parent document's metadata (title, department, date). This makes citation tracing straightforward: every answer includes the source document name and section.

## pgvector for Semantic Search

PostgreSQL with pgvector handles the vector similarity search. The schema is simple:

```sql
CREATE TABLE document_chunks (
    id         SERIAL PRIMARY KEY,
    doc_id     INTEGER REFERENCES documents(id),
    content    TEXT NOT NULL,
    embedding  vector(1536),  -- OpenAI ada-002 dimensions
    metadata   JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON document_chunks 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);
```

The IVFFlat index with 100 lists gives us sub-50ms query times on our dataset. For larger datasets, HNSW would be the next step.

Query:

```sql
SELECT content, metadata,
       1 - (embedding <=> $1::vector) AS similarity
FROM document_chunks
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

Five results, cosine similarity, no external vector database. The entire search runs inside the same PostgreSQL instance that holds our operational data.

## Handling 1,000+ Users

The system serves around 1,000 internal staff. Peak usage hits during morning hours when field supervisors check compliance requirements. Key decisions that kept it stable:

- **Connection pooling** — `pgxpool` with 20 max connections. No connection storms.
- **Embedding cache** — Identical queries (common in SOP lookups) hit a Redis cache before calling the embedding API. Cuts external API calls by roughly 40%.
- **Streaming responses** — The LLM response streams back to the frontend via Server-Sent Events. Users see the first token in under 2 seconds instead of waiting for the full response.
- **Rate limiting** — Per-user rate limits prevent any single department from monopolizing the LLM API budget.

## Results

After six months in production:

- **~1,000 active users** across multiple plantation regions
- **Routine support tickets cut by ~50%** (staff self-serve via the AI instead of emailing engineering)
- **Average response time** under 3 seconds (embedding + retrieval + LLM generation)
- **Infrastructure cost**: zero additional servers. Runs on existing PostgreSQL and a single Go binary on a VM.

## Lessons Learned

1. **pgvector is production-ready** for datasets under a few million vectors. Don't add Pinecone or Weaviate until you actually need to.
2. **Chunking matters more than the LLM model.** A good chunking strategy with a cheap model beats a bad chunking strategy with GPT-4.
3. **Golang is underrated for AI-adjacent services.** You don't need Python to build a RAG API. The AI part is an API call. The engineering part is everything around it.
4. **Start with the constraint.** "No new infrastructure" forced us into pgvector. That constraint ended up being the best architectural decision.

The system is not fancy. It does not use the latest framework or the most expensive model. It answers questions accurately, cites its sources, and stays up. That is what production AI looks like for most teams.
