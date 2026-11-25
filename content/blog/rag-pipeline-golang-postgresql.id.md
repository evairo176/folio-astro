---
title: "Membangun RAG Pipeline yang Melayani 1.000+ Pengguna dengan Golang dan PostgreSQL"
description: "Cara gue membangun sistem retrieval-augmented generation di atas dokumen internal untuk staf perkebunan, dan kenapa gue pilih Golang + pgvector alih-alih Python+LangChain."
date: "2026-06-09"
tags: ["AI", "RAG", "Golang", "PostgreSQL", "LLM", "Architecture"]
lang: "id"
---

Ketika manajemen minta AI assistant yang bisa jawab pertanyaan seputar SOP internal, laporan lapangan, dan dokumen compliance, stack yang obvious adalah Python plus LangChain. Gue malah pake **Golang dan PostgreSQL**. Ini alasan dan caranya handle 1.000+ staf internal tanpa down.

## Kebutuhannya

Sistem ini harus:
- Ingest ratusan dokumen internal (PDF, DOCX, plain text)
- Chunk, embed, dan simpan vector untuk semantic search
- Jawab pertanyaan natural language dengan sitasi balik ke dokumen sumber
- Handle request concurrent dari staf lapangan di berbagai region
- Jalan di infrastruktur yang udah ada (tanpa server GPU, tanpa vector DB terpisah)

Constraint "tanpa vector DB terpisah" yang jadi titik balik. Kita udah jalanin PostgreSQL untuk semuanya.Tambah pgvector berarti satu layanan lebih sedikit buat maintain, monitor, dan backup.

## Arsitektur

```
[Dokumen] --> [Go Ingester] --> [Chunker] --> [Embedding API] --> [tabel pgvector]
                                                                          |
[Query User] --> [Go API] --> [Embed Query] --> [pgvector ANN search] --> [Context]
                     |                                                      |
                     +---> [LLM API + context] --> [Response + sitasi]
```

Seluruh pipeline adalah dua Go service: ingester (batch job) dan API server. PostgreSQL nyimpan metadata dokumen sekaligus vector embedding.

## Kenapa Golang, Bukan Python

Python itu default untuk semua yang berbau AI. Tapi constraint kita bukan training model atau eksperimen. Ini production API yang serve user concurrent dengan latency rendah. Golang menang di tiga hal:

1. **Concurrency** — Goroutine handle parallel embedding call dan DB query tanpa GIL atau ceremony async. Satu binary Go serve ratusan request concurrent.
2. **Deployment** — Satu static binary. Tanpa virtualenv, tanpa dependency hell, tanpa `pip install` di server production.
3. **Performance** — Layer API itu I/O bound (query DB, call LLM API). HTTP client dan connection pooling di standard library Go udah battle-tested di scale.

## Strategi Chunking

Chunking dokumen itu tempat kebanyakan pipeline RAG salah. Terlalu kecil, konteks hilang. Terlalu besar, precision retrieval turun.

Gue pake pendekatan hybrid:

```go
func ChunkDocument(doc Document, maxTokens int) []Chunk {
    // 1. Split by headers (##, ###) dulu
    sections := splitByHeaders(doc.Content)
    
    var chunks []Chunk
    for _, section := range sections {
        if countTokens(section) <= maxTokens {
            chunks = append(chunks, Chunk{
                Content:  section,
                Metadata: doc.Metadata,
            })
        } else {
            // 2. Fall back ke split per paragraf
            paragraphs := splitByParagraphs(section, maxTokens)
            chunks = append(chunks, paragraphs...)
        }
    }
    return chunks
}
```

Setiap chunk bawa metadata dokumen induk (judul, departemen, tanggal). Ini bikin tracing sitasi gampang: setiap jawaban nyertakan nama dokumen sumber dan section-nya.

## pgvector untuk Semantic Search

PostgreSQL dengan pgvector handle vector similarity search. Schema-nya simpel:

```sql
CREATE TABLE document_chunks (
    id         SERIAL PRIMARY KEY,
    doc_id     INTEGER REFERENCES documents(id),
    content    TEXT NOT NULL,
    embedding  vector(1536),  -- dimensi OpenAI ada-002
    metadata   JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON document_chunks 
    USING ivfflat (embedding vector_cosine_ops) 
    WITH (lists = 100);
```

Index IVFFlat dengan 100 list kasih query time sub-50ms di dataset kita. Untuk dataset lebih besar, HNSW jadi langkah selanjutnya.

Query:

```sql
SELECT content, metadata,
       1 - (embedding <=> $1::vector) AS similarity
FROM document_chunks
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

Lima hasil, cosine similarity, tanpa external vector database. Seluruh search jalan di dalam instance PostgreSQL yang sama yang nyimpan data operasional.

## Handle 1.000+ User

Sistem ini melayani sekitar 1.000 staf internal. Peak usage terjadi pagi hari ketika supervisor lapangan cek kebutuhan compliance. Keputusan kunci yang bikin tetap stabil:

- **Connection pooling** — `pgxpool` dengan max 20 koneksi. Tanpa connection storm.
- **Embedding cache** — Query identik (umum di lookup SOP) kena Redis cache sebelum call embedding API. Kurangi call API eksternal sekitar 40%.
- **Streaming response** — Response LLM streaming ke frontend via Server-Sent Events. User lihat token pertama dalam 2 detik, bukan nunggu response penuh.
- **Rate limiting** — Rate limit per-user mencegah satu departemen monopolisasi budget API LLM.

## Hasil

Setelah enam bulan di production:

- **~1.000 user aktif** di berbagai region perkebunan
- **Tiket support rutin turun ~50%** (staf self-serve via AI daripada email engineering)
- **Rata-rata response time** di bawah 3 detik (embedding + retrieval + generasi LLM)
- **Biaya infrastruktur**: nol server tambahan. Jalan di PostgreSQL yang ada dan satu binary Go di VM.

## Pelajaran

1. **pgvector production-ready** untuk dataset di bawah beberapa juta vector. Jangan tambah Pinecone atau Weaviate sampai beneran butuh.
2. **Chunking lebih penting dari model LLM.** Strategi chunking yang bagus dengan model murah ngalahin strategi chunking jelek dengan GPT-4.
3. **Golang underrated untuk service AI-adjacent.** Lo nggak butuh Python buat bikin RAG API. Bagian AI-nya itu API call. Bagian engineering-nya itu semua di sekitarnya.
4. **Mulai dari constraint.** "Tanpa infrastruktur baru" maksa kita ke pgvector. Constraint itu akhirnya jadi keputusan arsitektural terbaik.

Sistem ini nggak fancy. Nggak pake framework terbaru atau model termahal. Dia jawab pertanyaan dengan akurat, kutip sumbernya, dan tetap jalan. Itu yang namanya production AI buat kebanyakan tim.
