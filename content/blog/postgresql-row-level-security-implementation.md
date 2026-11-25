---
title: "PostgreSQL Row Level Security: Production Implementation Guide"
description: "Implementing PostgreSQL Row Level Security (RLS) for multi-tenant SaaS applications with practical examples and performance considerations."
date: 2026-06-10
tags: ["PostgreSQL", "Security", "Database", "Multi-tenant", "RLS", "SaaS"]
lang: "en"
---

# PostgreSQL Row Level Security: Production Implementation Guide

Row Level Security (RLS) transforms how you handle data isolation in PostgreSQL. Instead of application-level filtering, RLS pushes security policies directly into the database engine. For multi-tenant SaaS applications, this means tenant isolation becomes a database concern, not just application logic.

## Why RLS Over Application Logic

Traditional multi-tenant applications filter data in the application layer:

```sql
-- Application code
const userId = req.user.id;
const projects = await db.query(
  'SELECT * FROM projects WHERE user_id = $1',
  [userId]
);
```

This approach has three critical flaws:

1. **Forget-one-filter bugs**: Missing a WHERE clause exposes all data
2. **Complex joins**: Every query must include tenant filtering
3. **No database-level guarantees**: Direct database access bypasses application logic

RLS solves these by enforcing policies at the database level:

```sql
-- With RLS enabled
CREATE POLICY user_access_policy ON projects
  USING (user_id = current_setting('app.current_user_id')::integer);

-- Application code becomes simpler
const projects = await db.query('SELECT * FROM projects');
-- Only returns rows where user_id matches current user
```

## Basic RLS Setup

Enable RLS on a table:

```sql
-- Create a users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  tenant_id INTEGER NOT NULL
);

-- Create a projects table
CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  tenant_id INTEGER NOT NULL REFERENCES users(tenant_id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation_policy ON projects
  USING (tenant_id = current_setting('app.current_tenant_id')::integer);
```

The `current_setting()` function reads session variables you set in your application connection:

```javascript
// Node.js/Express example
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

## Advanced Policy Patterns

### Role-Based Access Control (RBAC)

Combine RLS with PostgreSQL roles for complex permission schemes:

```sql
-- Create roles
CREATE ROLE admin;
CREATE ROLE manager;
CREATE ROLE employee;

-- Grant table access
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO admin;
GRANT SELECT, INSERT, UPDATE ON projects TO manager;
GRANT SELECT ON projects TO employee;

-- Policy for admins (see all projects)
CREATE POLICY admin_policy ON projects
  FOR ALL
  TO admin
  USING (true);  -- Admins see everything

-- Policy for managers (see their tenant's projects)
CREATE POLICY manager_policy ON projects
  FOR ALL
  TO manager
  USING (tenant_id = current_setting('app.current_tenant_id')::integer)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id')::integer);

-- Policy for employees (read-only, their projects only)
CREATE POLICY employee_policy ON projects
  FOR SELECT
  TO employee
  USING (
    tenant_id = current_setting('app.current_tenant_id')::integer
    AND created_by = current_setting('app.current_user_id')::integer
  );
```

### Temporal Access Control

Implement time-based access policies:

```sql
-- Documents with expiration
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

### Hierarchical Data Access

For organizational hierarchies (departments, teams):

```sql
-- Department hierarchy
CREATE TABLE departments (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  tenant_id INTEGER NOT NULL,
  parent_id INTEGER REFERENCES departments(id)
);

-- Recursive policy for department access
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

## Performance Considerations

RLS adds overhead. Here's how to measure and optimize:

```sql
-- Check policy execution with EXPLAIN
EXPLAIN ANALYZE
SELECT * FROM projects WHERE name LIKE 'Test%';

-- Create indexes on policy columns
CREATE INDEX idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX idx_projects_tenant_user ON projects(tenant_id, created_by);

-- Use partial indexes for common policy conditions
CREATE INDEX idx_active_projects ON projects(tenant_id)
  WHERE status = 'active';

-- Monitor RLS performance
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

Common performance issues:

1. **Policy functions called per-row**: Use `IMMUTABLE` functions when possible
2. **Missing indexes on policy columns**: Index all columns in `USING` clauses
3. **Complex subqueries in policies**: Materialize common subqueries

## Testing RLS Policies

Comprehensive testing is critical:

```sql
-- Test as different roles
SET ROLE admin;
SET app.current_tenant_id = '1';
SELECT * FROM projects;  -- Should see all

SET ROLE manager;
SET app.current_tenant_id = '2';
SELECT * FROM projects;  -- Should see only tenant 2's projects

-- Test policy bypass attempts
SET app.current_tenant_id = NULL;
SELECT * FROM projects;  -- Should return empty

-- Test INSERT validation
SET app.current_tenant_id = '2';
INSERT INTO projects (name, tenant_id) 
VALUES ('Test', 1);  -- Should fail due to WITH CHECK
```

Automated test suite example:

```javascript
// Jest/Puppeteer style
describe('RLS Policies', () => {
  test('tenant isolation prevents cross-tenant access', async () => {
    // User from tenant 1
    await db.query("SET app.current_tenant_id = '1'");
    const tenant1Projects = await db.query('SELECT * FROM projects');
    
    // Switch to tenant 2
    await db.query("SET app.current_tenant_id = '2'");
    const tenant2Projects = await db.query('SELECT * FROM projects');
    
    // Should be different sets
    expect(tenant1Projects).not.toEqual(tenant2Projects);
  });
});
```

## Migration Strategy

Gradual RLS adoption for existing applications:

```sql
-- Phase 1: Audit existing queries
-- Add RLS but allow bypass for migration
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY bypass_during_migration ON projects
  USING (current_setting('app.migration_mode', true) = 'true');

-- Phase 2: Enable RLS for new features only
CREATE TABLE new_feature_table (
  id SERIAL PRIMARY KEY,
  data TEXT,
  tenant_id INTEGER NOT NULL
);
ALTER TABLE new_feature_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY new_feature_policy ON new_feature_table
  USING (tenant_id = current_setting('app.current_tenant_id')::integer);

-- Phase 3: Full RLS rollout
-- Update application to always set tenant context
-- Remove migration bypass policy
DROP POLICY bypass_during_migration ON projects;
```

## Common Pitfalls

1. **Forgotten WITH CHECK**: Policies need both `USING` (for SELECT) and `WITH CHECK` (for INSERT/UPDATE)
2. **Session variable leaks**: Always reset session variables between requests
3. **Policy conflicts**: Multiple policies combine with OR, not AND
4. **Performance on large tables**: Index policy columns aggressively
5. **Bypass via functions**: Functions run with definer rights by default

```sql
-- Dangerous: Function bypasses RLS
CREATE FUNCTION get_all_projects() RETURNS SETOF projects
  LANGUAGE sql SECURITY DEFINER  -- Runs with owner's permissions
AS $$
  SELECT * FROM projects;
$$;

-- Safe: Function respects RLS
CREATE FUNCTION get_my_projects() RETURNS SETOF projects
  LANGUAGE sql SECURITY INVOKER  -- Runs with caller's permissions
AS $$
  SELECT * FROM projects;
$$;
```

## Production Checklist

Before enabling RLS in production:

- [ ] All policy columns are indexed
- [ ] Application sets session variables consistently
- [ ] All database functions use `SECURITY INVOKER`
- [ ] Comprehensive test suite validates policies
- [ ] Monitoring for policy performance impact
- [ ] Backup/restore procedures tested with RLS
- [ ] Migration rollback plan documented
- [ ] Team trained on RLS concepts and debugging

## Conclusion

PostgreSQL Row Level Security moves data isolation from application code to database enforcement. While it adds complexity, the security benefits are substantial: guaranteed tenant isolation, reduced application bug surface, and centralized policy management.

Start with new tables, measure performance impact, and gradually migrate existing tables. The investment pays off in security assurance and simplified application logic.

For large-scale deployments, consider combining RLS with PostgreSQL's partitioning for both security and performance benefits. Each tenant's data can reside in separate partitions with tenant-specific policies, creating natural data boundaries at the storage level.