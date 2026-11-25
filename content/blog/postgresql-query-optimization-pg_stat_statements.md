---
title: "PostgreSQL Query Optimization with pg_stat_statements"
description: "Deep dive into using pg_stat_statements for identifying slow queries, analyzing execution plans, and implementing performance improvements in production PostgreSQL databases."
date: 2026-06-10
tags: ["postgresql", "database", "performance", "optimization", "devops"]
lang: "en"
---

# PostgreSQL Query Optimization with pg_stat_statements

As a senior developer working with PostgreSQL in production, I've seen my share of slow queries. The challenge isn't just fixing them—it's finding them first. That's where `pg_stat_statements` comes in. This built-in extension is your first line of defense for database performance tuning.

## What is pg_stat_statements?

`pg_stat_statements` is a PostgreSQL extension that tracks execution statistics for all SQL statements executed by the server. It's not enabled by default, but once activated, it becomes your most valuable performance diagnostic tool.

```sql
-- Enable the extension
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Check if it's working
SELECT count(*) FROM pg_stat_statements;
```

The extension maintains a ring buffer of query statistics, tracking metrics like total execution time, rows processed, shared buffer hits, and more. By default, it tracks the 5000 most frequent statements, but this is configurable.

## Setting Up for Production

First, add to your `postgresql.conf`:

```ini
shared_preload_libraries = 'pg_stat_statements'
pg_stat_statements.max = 10000
pg_stat_statements.track = all
pg_stat_statements.track_utility = off
pg_stat_statements.save = on
```

Restart PostgreSQL, then create the extension in your database:

```sql
CREATE EXTENSION pg_stat_statements;
```

The `track = all` setting captures all statements, including those from prepared statements and nested queries. For security-sensitive environments, consider `track = top` to only track top-level statements.

## Identifying Problem Queries

The real power comes from querying the `pg_stat_statements` view. Here's my go-to diagnostic query:

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

This shows your most expensive queries by total execution time. Look for:
- High `total_exec_time` with many `calls` → frequently executed slow queries
- Low `cache_hit_ratio` (< 95%) → insufficient shared buffers
- High `avg_rows` with simple queries → potential missing indexes

## Analyzing Execution Plans

Once you've identified slow queries, use `EXPLAIN ANALYZE` to understand why they're slow:

```sql
-- Get the actual query text
SELECT query FROM pg_stat_statements WHERE queryid = 123456;

-- Then analyze it
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM orders 
WHERE customer_id = 123 
  AND created_at > NOW() - INTERVAL '30 days';
```

Key metrics to watch in the explain output:
- **Seq Scan vs Index Scan**: Sequential scans on large tables are red flags
- **Bitmap Heap Scan**: Often indicates inefficient index usage
- **Sort**: In-memory sorts are fine; disk sorts (external merge) are problematic
- **Join type**: Nested loops for large tables are inefficient

## Common Optimization Patterns

### 1. Missing Indexes
```sql
-- Before optimization (showing in pg_stat_statements)
SELECT * FROM users WHERE email = 'user@example.com';

-- Add index
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);

-- Verify improvement
SELECT mean_exec_time FROM pg_stat_statements 
WHERE query LIKE '%users WHERE email =%';
```

### 2. N+1 Query Problems
```sql
-- Bad: Multiple queries in a loop
SELECT * FROM orders WHERE user_id = 1;
SELECT * FROM order_items WHERE order_id IN (1,2,3...);

-- Good: Single query with JOIN
SELECT o.*, oi.* 
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.user_id = 1;
```

### 3. Parameter Sniffing Issues
```sql
-- Problem: Different execution plans for different parameters
SELECT * FROM products WHERE category_id = ? AND price > ?;

-- Solution: Use prepared statements with generic plans
PREPARE product_query (int, numeric) AS
SELECT * FROM products WHERE category_id = $1 AND price > $2;

-- Or use plan hints
SET plan_cache_mode = force_generic_plan;
```

## Advanced Monitoring Script

Here's a monitoring script I run hourly in production:

```sql
-- Save slow query trends
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
  AND calls > 10            -- executed multiple times
  AND query !~* '^pg_stat'  -- exclude system queries
ORDER BY total_exec_time DESC 
LIMIT 50;
```

## Resetting Statistics

When you make optimizations, reset the statistics to measure improvement:

```sql
-- Reset for specific query
SELECT pg_stat_statements_reset(queryid => 123456);

-- Reset all statistics
SELECT pg_stat_statements_reset();
```

## Production Considerations

1. **Memory Usage**: `pg_stat_statements.max` controls memory usage. 10,000 queries at ~1KB each = ~10MB.
2. **Security**: The view shows actual query texts, including sensitive data. Restrict access:
   ```sql
   REVOKE ALL ON pg_stat_statements FROM PUBLIC;
   GRANT SELECT ON pg_stat_statements TO monitoring_role;
   ```
3. **Persistence**: With `pg_stat_statements.save = on`, statistics survive restarts.
4. **Version Compatibility**: The view structure changes between PostgreSQL versions. Check your version's documentation.

## Putting It All Together

Here's my optimization workflow:

1. **Monitor**: Run the diagnostic query daily
2. **Identify**: Find top 10 slowest queries by total_exec_time
3. **Analyze**: Use EXPLAIN ANALYZE on each
4. **Optimize**: Apply appropriate fixes (indexes, query rewrite, etc.)
5. **Verify**: Reset statistics and monitor improvement
6. **Document**: Keep a log of optimizations and their impact

The key insight: `pg_stat_statements` doesn't just tell you what's slow—it tells you what matters. A query executed 100,000 times at 10ms each contributes more to system load than a once-daily 5-second report query. Focus your optimization efforts where they'll have the most impact.

Remember, database optimization is iterative. Small improvements compound over time. With `pg_stat_statements` as your guide, you can systematically eliminate performance bottlenecks and keep your PostgreSQL databases running smoothly.