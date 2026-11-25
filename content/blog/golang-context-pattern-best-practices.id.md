---
title: "Pola Context di Golang: Praktik Terbaik untuk Produksi"
description: "Kuasai paket context Go dengan pola nyata untuk pembatalan, timeout, dan nilai request-scoped dalam sistem produksi."
date: 2026-06-11
tags: ["golang", "konkurensi", "context", "praktik-terbaik", "microservices"]
lang: "id"
---

Paket `context` di Go adalah salah satu API yang tampak sederhana namun memisahkan developer junior dari senior. Ini bukan sekadar tentang meneruskan nilai request-scoped, tapi tentang membangun sistem yang tangguh yang menangani pembatalan, timeout, dan degradasi graceful dengan benar. Setelah mengirimkan puluhan layanan Go ke produksi, berikut pola-pola yang benar-benar berfungsi.

## Tiga Tanggung Jawab Context

Context melayani tiga tujuan berbeda, sering disalahpahami:

1. **Propagasi pembatalan** - Sinyal kapan pekerjaan harus berhenti
2. **Penegakan timeout/deadline** - Mencegah operasi menggantung tanpa batas
3. **Nilai request-scoped** - Meneruskan metadata melalui rantai panggilan

Mencampurkan concern ini secara salah menyebabkan bug yang sulit dilacak. Mari kita uraikan.

## 1. Pembatalan: Cara yang Benar

```go
// SALAH: Membuat context baru tanpa parent
func processItem(item Item) error {
    ctx := context.Background() // Tidak ada propagasi pembatalan
    return doExpensiveWork(ctx, item)
}

// BENAR: Mewarisi context parent
func processItem(ctx context.Context, item Item) error {
    // Pembatalan parent merambat ke sini
    return doExpensiveWork(ctx, item)
}

// Lebih baik: Tambah timeout untuk operasi spesifik ini
func processItemWithTimeout(ctx context.Context, item Item) error {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    
    return doExpensiveWork(ctx, item)
}
```

Aturannya: **Jangan pernah membuat `context.Background()` di dalam fungsi yang harus menghormati pembatalan.** Selalu terima context sebagai parameter pertama.

## 2. Hierarki Timeout

Timeout harus membentuk hierarki dari luar ke dalam:

```go
func handler(ctx context.Context, req *Request) (*Response, error) {
    // Timeout luar: 30s untuk seluruh request
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()
    
    // Query database: maksimal 10s
    dbCtx, dbCancel := context.WithTimeout(ctx, 10*time.Second)
    defer dbCancel()
    
    user, err := db.GetUser(dbCtx, req.UserID)
    if err != nil {
        return nil, err
    }
    
    // Panggilan API eksternal: maksimal 5s
    apiCtx, apiCancel := context.WithTimeout(ctx, 5*time.Second)
    defer apiCancel()
    
    data, err := externalAPI.Fetch(apiCtx, user.Token)
    if err != nil {
        return nil, err
    }
    
    return &Response{User: user, Data: data}, nil
}
```

Perhatikan polanya: timeout dalam **lebih pendek** dari parent-nya. Ini memastikan request keseluruhan selesai dalam SLA-nya, bahkan jika komponen individual gagal.

## 3. Nilai Request-Scoped: Gunakan Secara Hemat

Nilai context adalah untuk metadata request-scoped, bukan untuk meneruskan parameter fungsi:

```go
// SALAH: Menggunakan context sebagai tas parameter
type User struct {
    ID   string
    Role string
}

func processRequest(ctx context.Context) error {
    // Jangan lakukan ini
    user := ctx.Value("user").(User)
    return processUser(user)
}

// BENAR: Teruskan parameter eksplisit
func processRequest(ctx context.Context, user User) error {
    // Context hanya untuk pembatalan/timeout
    return processUser(ctx, user)
}

// Penggunaan yang dapat diterima: Tracing dan observabilitas
type contextKey string

const (
    requestIDKey contextKey = "request_id"
    traceIDKey   contextKey = "trace_id"
)

func middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ctx := r.Context()
        ctx = context.WithValue(ctx, requestIDKey, uuid.New().String())
        ctx = context.WithValue(ctx, traceIDKey, r.Header.Get("X-Trace-ID"))
        
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

Insight kunci: **Jika nilai diperlukan agar fungsi bekerja, jadikan parameter. Jika itu metadata opsional untuk observabilitas, gunakan context.**

## 4. Pola Select untuk Operasi Konkuren

Ketika Anda memiliki beberapa goroutine yang bekerja, gunakan `select` untuk menangani pembatalan dengan benar:

```go
func parallelFetch(ctx context.Context, urls []string) ([]Result, error) {
    ctx, cancel := context.WithCancel(ctx)
    defer cancel()
    
    results := make([]Result, len(urls))
    errCh := make(chan error, len(urls))
    
    for i, url := range urls {
        go func(idx int, u string) {
            result, err := fetchSingle(ctx, u)
            if err != nil {
                errCh <- fmt.Errorf("fetch %s: %w", u, err)
                return
            }
            results[idx] = result
            errCh <- nil
        }(i, url)
    }
    
    // Tunggu semua goroutine atau pembatalan
    for range urls {
        select {
        case err := <-errCh:
            if err != nil {
                cancel() // Batalkan fetch yang tersisa
                return nil, err
            }
        case <-ctx.Done():
            return nil, ctx.Err()
        }
    }
    
    return results, nil
}
```

Pola ini memastikan bahwa jika ada goroutine yang gagal, kita membatalkan yang tersisa segera.

## 5. Context Transaksi Database

Transaksi database memerlukan penanganan khusus:

```go
func processWithTransaction(ctx context.Context, db *sql.DB, userID string) error {
    // Mulai transaksi dengan context
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()
    
    // Gunakan context YANG SAMA untuk semua query dalam transaksi
    if err := updateUser(ctx, tx, userID); err != nil {
        return err
    }
    
    if err := logActivity(ctx, tx, userID); err != nil {
        return err
    }
    
    // Commit dengan context
    if err := tx.Commit(); err != nil {
        return err
    }
    
    return nil
}
```

**Kritis:** Gunakan context yang sama untuk semua query dalam transaksi. Jika Anda membuat context baru dengan timeout lebih pendek untuk query individual, transaksi mungkin commit setelah beberapa query dibatalkan.

## 6. HTTP Client dengan Timeout yang Tepat

`http.Client` standar memiliki default yang membingungkan. Berikut setup siap produksi:

```go
func newHTTPClient() *http.Client {
    return &http.Client{
        Timeout: 30 * time.Second, // Timeout keseluruhan request
        Transport: &http.Transport{
            DialContext: (&net.Dialer{
                Timeout:   5 * time.Second,  // Timeout koneksi
                KeepAlive: 30 * time.Second,
            }).DialContext,
            TLSHandshakeTimeout:   5 * time.Second,
            ResponseHeaderTimeout: 10 * time.Second, // Tunggu header
            ExpectContinueTimeout: 1 * time.Second,
            MaxIdleConns:          100,
            MaxIdleConnsPerHost:   10,
            IdleConnTimeout:       90 * time.Second,
        },
    }
}

func makeRequest(ctx context.Context, client *http.Client, url string) (*http.Response, error) {
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }
    
    return client.Do(req)
}
```

Perhatikan kita memiliki tiga lapisan timeout:
1. Dial timeout (5s) - Pembentukan koneksi TCP
2. Response header timeout (10s) - Tunggu header HTTP
3. Timeout client keseluruhan (30s) - Seluruh request termasuk body

## 7. Menguji Perilaku Context

Menguji pembatalan context adalah wajib:

```go
func TestProcessWithTimeout(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
    defer cancel()
    
    start := time.Now()
    err := slowOperation(ctx)
    elapsed := time.Since(start)
    
    if !errors.Is(err, context.DeadlineExceeded) {
        t.Errorf("expected DeadlineExceeded, got %v", err)
    }
    
    if elapsed > 150*time.Millisecond {
        t.Errorf("operation took too long: %v", elapsed)
    }
}

func TestProcessWithCancel(t *testing.T) {
    ctx, cancel := context.WithCancel(context.Background())
    
    var wg sync.WaitGroup
    wg.Add(1)
    
    go func() {
        defer wg.Done()
        err := blockingOperation(ctx)
        if !errors.Is(err, context.Canceled) {
            t.Errorf("expected Canceled, got %v", err)
        }
    }()
    
    // Batalkan setelah penundaan singkat
    time.Sleep(50 * time.Millisecond)
    cancel()
    
    wg.Wait()
}
```

## 8. Anti-Pattern Umum yang Harus Dihindari

```go
// ANTI-PATTERN: Menyimpan context di struct
type Service struct {
    ctx context.Context // JANGAN LAKUKAN INI
}

// ANTI-PATTERN: Mengabaikan pembatalan
func riskyOperation(ctx context.Context) error {
    ch := make(chan Result)
    go func() {
        result := compute() // Mengabaikan ctx.Done()
        ch <- result
    }()
    
    select {
    case r := <-ch:
        return r
    case <-ctx.Done():
        // Goroutine masih berjalan!
        return ctx.Err()
    }
}

// ANTI-PATTERN: Mencampur concern
func businessLogic(ctx context.Context, userID string) error {
    // Ini untuk pembatalan atau untuk mendapatkan user?
    user := ctx.Value("user").(User) // MEMBINGUNGKAN
    return process(user)
}
```

## Intinya

Context adalah mekanisme Go untuk degradasi graceful. Ketika digunakan dengan benar, ini memungkinkan layanan Anda untuk:

1. **Gagal cepat** ketika dependensi lambat
2. **Menyebarkan pembatalan** melalui rantai panggilan yang dalam
3. **Menegakkan SLA** dengan hierarki timeout
4. **Membersihkan resource** ketika request dibatalkan

Pergeseran model mental sangat penting: context bukan sekadar parameter lain, itu adalah **control plane** untuk siklus hidup request Anda. Perlakukan dengan hormat yang layak, dan sistem produksi Anda akan berterima kasih.