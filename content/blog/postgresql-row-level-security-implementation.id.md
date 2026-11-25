---
title: "PostgreSQL Row Level Security: Panduan Implementasi Produksi"
description: "Mengimplementasikan PostgreSQL Row Level Security (RLS) untuk aplikasi SaaS multi-tenant dengan contoh praktis dan pertimbangan performa."
date: 2026-06-10
tags: ["PostgreSQL", "Security", "Database", "Multi-tenant", "RLS", "SaaS"]
lang: "id"
---

# PostgreSQL Row Level Security: Panduan Implementasi Produksi

Row Level Security (RLS) mengubah cara Anda menangani isolasi data di PostgreSQL. Alih-alih filter di lapisan aplikasi, RLS mendorong kebijakan keamanan langsung ke mesin database. Untuk aplikasi SaaS multi-tenant, ini berarti isolasi tenant menjadi tanggung jawab database, bukan hanya logika aplikasi.

## Mengapa RLS Lebih Baik Daripada Logika Aplikasi

Aplikasi multi-tenant tradisional memfilter data di lapisan aplikasi:

```sql
-- Kode aplikasi
const userId = req.user.id;
const projects = await db.query(
  'SELECT * FROM projects WHERE user_id = $1',
  [userId]
);
```

Pendekatan ini memiliki tiga kelemahan kritis:

1. **Bug lupa-filter**: Lupa klausa WHERE membuka semua data
2. **Join kompleks**: Setiap query harus menyertakan filter tenant
3. **Tidak ada jaminan tingkat database**: Akses database langsung melewati logika aplikasi

RLS menyelesaikan ini dengan menegakkan kebijakan di tingkat database:

```sql
-- Dengan RLS diaktifkan
CREATE POLICY user_access_policy ON projects
  USING (user_id = current_setting('app.current_user_id')::integer);

-- Kode aplikasi menjadi lebih sederhana
const projects = await db.query('SELECT * FROM projects');
-- Hanya mengembalikan baris di mana user_id cocok dengan user saat ini
```

## Setup RLS Dasar

Aktifkan RLS pada tabel:

```sql
-- Buat tabel users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  tenant_id INTEGER NOT NULL
);

-- Buat tabel projects
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  tenant_id INTEGER NOT NULL REFERENCES users(tenant_id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Aktifkan RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Buat kebijakan untuk isolasi tenant
CREATE POLICY tenant_isolation_policy ON projects
  USING (tenant_id = current_setting('app.current_tenant_id')::integer);
```

Fungsi `current_setting()` membaca variabel sesi yang Anda atur di koneksi aplikasi:

```javascript
// Contoh Node.js/Express
app.use(async (req, res, next) => {
  const pool = await db.connect();
  await pool.query(
    "SET app.current_tenant_id = $1",
    [req.user.tenantId]
  );
  req.db = pool;
  next();
});
```

## Pola Kebijakan Lanjutan

### Role-Based Access Control (RBAC)

Gabungkan RLS dengan role PostgreSQL untuk skema izin kompleks:

```sql
-- Buat role
CREATE ROLE admin;
CREATE ROLE manager;
CREATE ROLE employee;

-- Berikan akses tabel
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO admin;
GRANT SELECT, INSERT, UPDATE ON projects TO manager;
GRANT SELECT ON projects TO employee;

-- Kebijakan untuk admin (lihat semua project)
CREATE POLICY admin_policy ON projects
  FOR ALL
  TO admin
  USING (true);  -- Admin melihat semuanya

-- Kebijakan untuk manager (lihat project tenant mereka)
CREATE POLICY manager_policy ON projects
  FOR ALL
  TO manager
  USING (tenant_id = current_setting('app.current_tenant_id')::integer)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

-- Kebijakan untuk employee (hanya baca, project mereka saja)
CREATE POLICY employee_policy ON projects
  FOR SELECT
  TO employee
  USING (
    tenant_id = current_setting('app.current_tenant_id')::integer
    AND created_by = current_setting('app.current_user_id')::integer
  );
```

### Kontrol Akses Temporal

Implementasikan kebijakan akses berbasis waktu:

```sql
-- Dokumen dengan masa berlaku
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  accessible_from TIMESTAMP NOT NULL DEFAULT NOW(),
  accessible_until TIMESTAMP,
  created_by INTEGER NOT NULL
);

CREATE POLICY temporal_access_policy ON documents
  USING (
    tenant_id = current_setting('app.current_tenant_id')::integer
    AND NOW() >= accessible_from
    AND (accessible_until IS NULL OR NOW() <= accessible_until)
  );
```

### Akses Data Hierarkis

Untuk hierarki organisasi (departemen, tim):

```sql
-- Hierarki departemen
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  parent_id INTEGER REFERENCES departments(id)
);

-- Kebijakan rekursif untuk akses departemen
CREATE POLICY department_hierarchy_policy ON documents
  USING (
    tenant_id = current_setting('app.current_tenant_id')::integer
    AND department_id IN (
      WITH RECURSIVE department_tree AS (
        SELECT id FROM departments 
        WHERE id = current_setting('app.current_department_id')::integer
        UNION ALL
        SELECT d.id FROM departments d
        JOIN department_tree dt ON d.parent_id = dt.id
      )
      SELECT id FROM department_tree
    )
  );
```

## Pertimbangan Performa

RLS menambah overhead. Berikut cara mengukur dan mengoptimalkan:

```sql
-- Periksa eksekusi kebijakan dengan EXPLAIN
EXPLAIN ANALYZE
SELECT * FROM projects WHERE name LIKE 'Test%';

-- Buat indeks pada kolom kebijakan
CREATE INDEX idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX idx_projects_tenant_user ON projects(tenant_id, created_by);

-- Gunakan indeks parsial untuk kondisi kebijakan umum
CREATE INDEX idx_active_projects ON projects(tenant_id)
  WHERE status = 'active';

-- Monitor performa RLS
SELECT 
  schemaname,
  relname,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch
FROM pg_stat_user_tables
WHERE relname = 'projects';
```

Masalah performa umum:

1. **Fungsi kebijakan dipanggil per-baris**: Gunakan fungsi `IMMUTABLE` jika memungkinkan
2. **Indeks hilang pada kolom kebijakan**: Indeks semua kolom dalam klausa `USING`
3. **Subquery kompleks dalam kebijakan**: Materialisasikan subquery umum

## Pengujian Kebijakan RLS

Pengujian komprehensif sangat penting:

```sql
-- Uji sebagai role berbeda
SET ROLE admin;
SET app.current_tenant_id = '1';
SELECT * FROM projects;  -- Harus melihat semua

SET ROLE manager;
SET app.current_tenant_id = '2';
SELECT * FROM projects;  -- Harus melihat hanya project tenant 2

-- Uji upaya bypass kebijakan
SET app.current_tenant_id = NULL;
SELECT * FROM projects;  -- Harus mengembalikan kosong

-- Uji validasi INSERT
SET app.current_tenant_id = '2';
INSERT INTO projects (name, tenant_id) 
VALUES ('Test', 1);  -- Harus gagal karena WITH CHECK
```

Contoh suite tes otomatis:

```javascript
// Gaya Jest/Puppeteer
describe('Kebijakan RLS', () => {
  test('isolasi tenant mencegah akses lintas-tenant', async () => {
    // User dari tenant 1
    await db.query("SET app.current_tenant_id = '1'");
    const tenant1Projects = await db.query('SELECT * FROM projects');
    
    // Ganti ke tenant 2
    await db.query("SET app.current_tenant_id = '2'");
    const tenant2Projects = await db.query('SELECT * FROM projects');
    
    // Harus set berbeda
    expect(tenant1Projects).not.toEqual(tenant2Projects);
  });
});
```

## Strategi Migrasi

Adopsi RLS bertahap untuk aplikasi yang sudah ada:

```sql
-- Fase 1: Audit query yang ada
-- Tambahkan RLS tapi izinkan bypass untuk migrasi
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY bypass_during_migration ON projects
  USING (current_setting('app.migration_mode', true) = 'true');

-- Fase 2: Aktifkan RLS hanya untuk fitur baru
CREATE TABLE new_feature_table (
  id SERIAL PRIMARY KEY,
  data TEXT,
  tenant_id INTEGER NOT NULL
);
ALTER TABLE new_feature_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY new_feature_policy ON new_feature_table
  USING (tenant_id = current_setting('app.current_tenant_id')::integer);

-- Fase 3: Rollout RLS penuh
-- Perbarui aplikasi untuk selalu mengatur konteks tenant
-- Hapus kebijakan bypass migrasi
DROP POLICY bypass_during_migration ON projects;
```

## Jebakan Umum

1. **Lupa WITH CHECK**: Kebijakan perlu `USING` (untuk SELECT) dan `WITH CHECK` (untuk INSERT/UPDATE)
2. **Kebocoran variabel sesi**: Selalu reset variabel sesi antar request
3. **Konflik kebijakan**: Beberapa kebijakan digabungkan dengan OR, bukan AND
4. **Performa pada tabel besar**: Indeks kolom kebijakan secara agresif
5. **Bypass melalui fungsi**: Fungsi berjalan dengan hak definer secara default

```sql
-- Berbahaya: Fungsi melewati RLS
CREATE FUNCTION get_all_projects() RETURNS SETOF projects
  LANGUAGE sql SECURITY DEFINER  -- Berjalan dengan izin pemilik
AS $$
  SELECT * FROM projects;
$$;

-- Aman: Fungsi menghormati RLS
CREATE FUNCTION get_my_projects() RETURNS SETOF projects
  LANGUAGE sql SECURITY INVOKER  -- Berjalan dengan izin pemanggil
AS $$
  SELECT * FROM projects;
$$;
```

## Checklist Produksi

Sebelum mengaktifkan RLS di produksi:

- [ ] Semua kolom kebijakan terindeks
- [ ] Aplikasi mengatur variabel sesi secara konsisten
- [ ] Semua fungsi database menggunakan `SECURITY INVOKER`
- [ ] Suite tes komprehensif memvalidasi kebijakan
- [ ] Monitoring untuk dampak performa kebijakan
- [ ] Prosedur backup/restore diuji dengan RLS
- [ ] Rencana rollback migrasi didokumentasikan
- [ ] Tim dilatih tentang konsep RLS dan debugging

## Kesimpulan

PostgreSQL Row Level Security memindahkan isolasi data dari kode aplikasi ke penegakan database. Meskipun menambah kompleksitas, manfaat keamanannya substansial: isolasi tenant terjamin, permukaan bug aplikasi berkurang, dan manajemen kebijakan terpusat.

Mulai dengan tabel baru, ukur dampak performa, dan migrasikan tabel yang ada secara bertahap. Investasi ini terbayar dalam jaminan keamanan dan penyederhanaan logika aplikasi.

Untuk deployment skala besar, pertimbangkan menggabungkan RLS dengan partitioning PostgreSQL untuk manfaat keamanan dan performa. Data setiap tenant dapat berada di partisi terpisah dengan kebijakan spesifik-tenant, menciptakan batas data alami di tingkat penyimpanan.