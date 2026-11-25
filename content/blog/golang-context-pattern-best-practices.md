---
title: "Golang Context Pattern: Best Practices for Production"
description: "Master Go's context package with real-world patterns for cancellation, timeouts, and request-scoped values in production systems."
date: 2026-06-11
tags: ["golang", "concurrency", "context", "best-practices", "microservices"]
lang: "en"
---

Go's `context` package is one of those deceptively simple APIs that separates junior from senior developers. It's not just about passing request-scoped values, it's about building resilient systems that handle cancellation, timeouts, and graceful degradation properly. After shipping dozens of Go services in production, here are the patterns that actually work.

## The Three Responsibilities of Context

Context serves three distinct purposes, often misunderstood:

1. **Cancellation propagation** - Signal when work should stop
2. **Timeout/deadline enforcement** - Prevent operations from hanging indefinitely  
3. **Request-scoped values** - Pass metadata through call chains

Mixing these concerns incorrectly leads to subtle bugs. Let's break them down.

## 1. Cancellation: The Right Way

```go
// WRONG: Creating new context without parent
func processItem(item Item) error {
    ctx := context.Background() // No cancellation propagation
    return doExpensiveWork(ctx, item)
}

// RIGHT: Inherit parent context
func processItem(ctx context.Context, item Item) error {
    // Parent cancellation propagates here
    return doExpensiveWork(ctx, item)
}

// Even better: Add timeout for this specific operation
func processItemWithTimeout(ctx context.Context, item Item) error {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    
    return doExpensiveWork(ctx, item)
}
```

The rule: **Never create a `context.Background()` inside a function that should respect cancellation.** Always accept context as the first parameter.

## 2. Timeout Hierarchies

Timeouts should form a hierarchy from outer to inner scopes:

```go
func handler(ctx context.Context, req *Request) (*Response, error) {
    // Outer timeout: 30s for entire request
    ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()
    
    // Database query: 10s max
    dbCtx, dbCancel := context.WithTimeout(ctx, 10*time.Second)
    defer dbCancel()
    
    user, err := db.GetUser(dbCtx, req.UserID)
    if err != nil {
        return nil, err
    }
    
    // External API call: 5s max  
    apiCtx, apiCancel := context.WithTimeout(ctx, 5*time.Second)
    defer apiCancel()
    
    data, err := externalAPI.Fetch(apiCtx, user.Token)
    if err != nil {
        return nil, err
    }
    
    return &Response{User: user, Data: data}, nil
}
```

Notice the pattern: inner timeouts are **shorter** than their parent. This ensures the overall request completes within its SLA, even if individual components fail.

## 3. Request-Scoped Values: Use Sparingly

Context values are for request-scoped metadata, not for passing function parameters:

```go
// WRONG: Using context as a parameter bag
type User struct {
    ID   string
    Role string
}

func processRequest(ctx context.Context) error {
    // Don't do this
    user := ctx.Value("user").(User)
    return processUser(user)
}

// RIGHT: Pass explicit parameters
func processRequest(ctx context.Context, user User) error {
    // Context is only for cancellation/timeout
    return processUser(ctx, user)
}

// Acceptable use: Tracing and observability
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

Key insight: **If a value is required for the function to work, make it a parameter. If it's optional metadata for observability, use context.**

## 4. The Select Pattern for Concurrent Operations

When you have multiple goroutines doing work, use `select` to handle cancellation properly:

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
    
    // Wait for all goroutines or cancellation
    for range urls {
        select {
        case err := <-errCh:
            if err != nil {
                cancel() // Cancel remaining fetches
                return nil, err
            }
        case <-ctx.Done():
            return nil, ctx.Err()
        }
    }
    
    return results, nil
}
```

This pattern ensures that if any goroutine fails, we cancel the remaining ones immediately.

## 5. Database Transaction Contexts

Database transactions need special handling:

```go
func processWithTransaction(ctx context.Context, db *sql.DB, userID string) error {
    // Start transaction with context
    tx, err := db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()
    
    // Use the SAME context for all queries within transaction
    if err := updateUser(ctx, tx, userID); err != nil {
        return err
    }
    
    if err := logActivity(ctx, tx, userID); err != nil {
        return err
    }
    
    // Commit with context
    if err := tx.Commit(); err != nil {
        return err
    }
    
    return nil
}
```

**Critical:** Use the same context for all queries within a transaction. If you create a new context with a shorter timeout for individual queries, the transaction might commit after some queries have been cancelled.

## 6. HTTP Client with Proper Timeouts

The standard `http.Client` has confusing defaults. Here's a production-ready setup:

```go
func newHTTPClient() *http.Client {
    return &http.Client{
        Timeout: 30 * time.Second, // Overall request timeout
        Transport: &http.Transport{
            DialContext: (&net.Dialer{
                Timeout:   5 * time.Second,  // Connection timeout
                KeepAlive: 30 * time.Second,
            }).DialContext,
            TLSHandshakeTimeout:   5 * time.Second,
            ResponseHeaderTimeout: 10 * time.Second, // Wait for headers
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

Notice we have three layers of timeouts:
1. Dial timeout (5s) - TCP connection establishment
2. Response header timeout (10s) - Wait for HTTP headers
3. Overall client timeout (30s) - Entire request including body

## 7. Testing Context Behavior

Testing context cancellation is non-negotiable:

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
    
    // Cancel after short delay
    time.Sleep(50 * time.Millisecond)
    cancel()
    
    wg.Wait()
}
```

## 8. Common Anti-Patterns to Avoid

```go
// ANTI-PATTERN: Storing context in struct
type Service struct {
    ctx context.Context // DON'T DO THIS
}

// ANTI-PATTERN: Ignoring cancellation
func riskyOperation(ctx context.Context) error {
    ch := make(chan Result)
    go func() {
        result := compute() // Ignores ctx.Done()
        ch <- result
    }()
    
    select {
    case r := <-ch:
        return r
    case <-ctx.Done():
        // Goroutine still running!
        return ctx.Err()
    }
}

// ANTI-PATTERN: Mixing concerns
func businessLogic(ctx context.Context, userID string) error {
    // Is this for cancellation or for getting user?
    user := ctx.Value("user").(User) // CONFUSING
    return process(user)
}
```

## The Bottom Line

Context is Go's mechanism for graceful degradation. When used correctly, it allows your services to:

1. **Fail fast** when dependencies are slow
2. **Propagate cancellation** through deep call chains  
3. **Enforce SLAs** with timeout hierarchies
4. **Clean up resources** when requests are cancelled

The mental model shift is crucial: context isn't just another parameter, it's the **control plane** for your request's lifecycle. Treat it with the respect it deserves, and your production systems will thank you.