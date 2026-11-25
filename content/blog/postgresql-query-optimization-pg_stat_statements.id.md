---
title: "Optimisasi Query PostgreSQL dengan pg_stat_statements"
description: "Panduan mendalam menggunakan pg_stat_statements untuk mengidentifikasi query lambat, menganalisis execution plan, dan menerapkan perbaikan performa di database PostgreSQL produksi."
date: 2026-06-10
tags: ["postgresql", "database", "performance", "optimization", "devops"]
lang: "id"
---

# Optimisasi Query PostgreSQL dengan pg_stat_statements

Sebagai senior developer yang bekerja dengan PostgreSQL di lingkungan produksi, saya sudah melihat banyak query lambat. Tantangannya bukan hanya memperbaikinya—tapi menemukannya terlebih dahulu. Di sinilah `pg_stat_statements` berperan. Ekstensi bawaan ini adalah pertahanan pertama Anda untuk tuning performa database.

## Apa itu pg_stat_statements?

`pg_stat_statements` adalah ekstensi PostgreSQL yang melacak statistik eksekusi untuk semua pernyataan SQL yang dijalankan oleh server. Tidak diaktifkan secara default, tapi sekali diaktifkan, ini menjadi alat diagnostik performa paling berharga.

```sql
-- Aktifkan ekstensi
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Cek apakah berfungsi
SELECT count(*) FROM pg_stat_statements;
```

Ekstensi ini mempertahankan ring buffer statistik query, melacak metrik seperti total waktu eksekusi, baris yang diproses, shared buffer hits, dan lainnya. Secara default, melacak 5000 pernyataan paling sering, tapi ini bisa dikonfigurasi.

## Setup untuk Produksi

Pertama, tambahkan ke `postgresql.conf`:

```ini
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
pg_stat_statements.track_utility = off
pg_stat_statements.save = on
```

Restart PostgreSQL, lalu buat ekstensi di database Anda:

```sql
CREATE EXTENSION pg_stat_statements;
```

Pengaturan `track = all` menangkap semua pernyataan, termasuk dari prepared statements dan query bersarang. Untuk lingkungan sensitif keamanan, pertimbangkan `track = top` untuk hanya melacak pernyataan tingkat atas.

## Mengidentifikasi Query Bermasalah

Kekuatan sebenarnya datang dari query ke view `pg_stat_statements`. Ini query diagnostik yang saya gunakan:

```sql
SELECT 
    queryid,
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows / calls as avg_rows,
    shared_blks_hit,
    shared_blks_read,
    (shared_blks_hit::float / NULLIF(shared_blks_hit + shared_blks_read, 0)) * 100 as cache_hit_ratio
FROM pg_stat_statements 
WHERE query !~* '^pg_stat'
ORDER BY total_exec_time DESC 
LIMIT 20;
```

Ini menunjukkan query paling mahal berdasarkan total waktu eksekusi. Cari:
- `total_exec_time` tinggi dengan banyak `calls` → query lambat yang sering dieksekusi
- `cache_hit_ratio` rendah (< 95%) → shared buffers tidak cukup
- `avg_rows` tinggi dengan query sederhana → kemungkinan index hilang

## Menganalisis Execution Plan

Setelah mengidentifikasi query lambat, gunakan `EXPLAIN ANALYZE` untuk memahami kenapa lambat:

```sql
-- Dapatkan teks query aktual
SELECT query FROM pg_stat_statements WHERE queryid = 123456;

-- Lalu analisis
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM orders 
WHERE customer_id = 123 
  AND created_at > NOW() - INTERVAL '30 days';
```

Metrik kunci untuk diperhatikan di output explain:
- **Seq Scan vs Index Scan**: Sequential scan di tabel besar adalah red flag
- **Bitmap Heap Scan**: Sering menunjukkan penggunaan index tidak efisien
- **Sort**: Sort di memory baik; sort di disk (external merge) bermasalah
- **Join type**: Nested loops untuk tabel besar tidak efisien

## Pola Optimisasi Umum

### 1. Index yang Hilang
```sql
-- Sebelum optimisasi (ditunjukkan di pg_stat_statements)
SELECT * FROM users WHERE email = 'user@example.com';

-- Tambah index
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Verifikasi perbaikan
SELECT mean_exec_time FROM pg_stat_statements 
WHERE query LIKE '%users WHERE email =%';
```

### 2. Masalah Query N+1
```sql
-- Buruk: Multiple query dalam loop
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM order_items WHERE order_id IN (1,2,3...);

-- Baik: Single query dengan JOIN
SELECT o.*, oi.* 
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.user_id = 1;
```

### 3. Masalah Parameter Sniffing
```sql
-- Problem: Execution plan berbeda untuk parameter berbeda
SELECT * FROM products WHERE category_id = ? AND price > ?;

-- Solusi: Gunakan prepared statements dengan generic plans
PREPARE product_query (int, numeric) AS
SELECT * FROM products WHERE category_id = $1 AND price > $2;

-- Atau gunakan plan hints
SET plan_cache_mode = force_generic_plan;
```

## Script Monitoring Lanjutan

Ini script monitoring yang saya jalankan setiap jam di produksi:

```sql
-- Simpan tren query lambat
INSERT INTO query_performance_history
SELECT 
    now(),
    queryid,
    query,
    calls,
    total_exec_time,
    mean_exec_time,
    rows,
    shared_blks_hit,
    shared_blks_read
FROM pg_stat_statements 
WHERE mean_exec_time > 100  -- > 100ms
  AND calls > 10            -- dieksekusi multiple kali
  AND query !~* '^pg_stat'  -- exclude system queries
ORDER BY total_exec_time DESC 
LIMIT 50;
```

## Reset Statistik

Saat Anda melakukan optimisasi, reset statistik untuk mengukur perbaikan:

```sql
-- Reset untuk query spesifik
SELECT pg_stat_statements_reset(queryid => 123456);

-- Reset semua statistik
SELECT pg_stat_statements_reset();
```

## Pertimbangan Produksi

1. **Penggunaan Memory**: `pg_stat_statements.max` mengontrol penggunaan memory. 10,000 query di ~1KB masing-masing = ~10MB.
2. **Keamanan**: View menunjukkan teks query aktual, termasuk data sensitif. Batasi akses:
   ```sql
   REVOKE ALL ON pg_stat_statements FROM PUBLIC;
   GRANT SELECT ON pg_stat_statements TO monitoring_role;
   ```
3. **Persistence**: Dengan `pg_stat_statements.save = on`, statistik bertahan setelah restart.
4. **Kompatibilitas Versi**: Struktur view berubah antar versi PostgreSQL. Cek dokumentasi versi Anda.

## Menyatukan Semuanya

Ini workflow optimisasi saya:

1. **Monitor**: Jalankan query diagnostik harian
2. **Identifikasi**: Temukan 10 query paling lambat berdasarkan total_exec_time
3. **Analisis**: Gunakan EXPLAIN ANALYZE pada masing-masing
4. **Optimisasi**: Terapkan perbaikan sesuai (index, rewrite query, dll.)
5. **Verifikasi**: Reset statistik dan monitor perbaikan
6. **Dokumentasi**: Simpan log optimisasi dan dampaknya

Insight kunci: `pg_stat_statements` tidak hanya memberi tahu apa yang lambat—tapi apa yang penting. Query yang dieksekusi 100,000 kali di 10ms masing-masing berkontribusi lebih banyak ke beban sistem daripada query laporan 5-detik sekali sehari. Fokuskan upaya optimisasi Anda di mana akan memiliki dampak terbesar.

Ingat, optimisasi database bersifat iteratif. Perbaikan kecil terakumulasi seiring waktu. Dengan `pg_stat_statements` sebagai panduan, Anda bisa secara sistematis menghilangkan bottleneck performa dan menjaga database PostgreSQL berjalan lancar.