---
title: "Voucher Management - Watsons Internal"
description: "Voucher program management system for Watsons: promotion submissions, barcode & online reports, Excel/PDF exports, and trigger sync pipelines."
date: "2026-09-01"
tags: ["React", ".NET", "TypeScript", "SQL Server", "Excel Export", "RBAC", "CI/CD"]
featured: true
cover: "/projects/voucher-management/summary-report.jpg"
images:
  - /projects/voucher-management/summary-report.jpg
metrics:
  - "3 | report variants (barcode/online/trigger)"
  - "Excel+PDF | exports with totals"
  - "0 | hardcoded report paths"
---

Voucher management system for Watsons, covering the full lifecycle: promotion submission and approval, barcode/online voucher data, reporting, and ownership-scoped access.

**Role:** Fullstack developer - design, backend, frontend, deployment.

## Key Features

### Promotion submissions & approval
- Submission workflow with status (draft/active/inactive), attachments, SKP numbers, and per-division budgets.
- Ownership scoping: users see their own submissions, SuperAdmin/Admin IT see all.
- SKP number is intentionally non-unique to support shared campaign codes.

### Reports
- Voucher report and summary variants for barcode, online, and trigger data.
- Excel exports with proper TOTAL footer (nominal, payment, sales), EF% aggregate ratio, and merge-cell-safe layout.
- PDF summary export mirroring the trigger layout, with Indonesian date formatting.

### Sync pipelines
- Daily scheduler (Python) syncs voucher promo/order/trigger data into staging tables with checkpointing and ordered migrations.

## Tech Stack

React + TypeScript (TanStack Router/Query, shadcn-style UI), ASP.NET Core (.NET 10) + EF Core + SQL Server, ClosedXML + QuestPDF for exports, Python scheduler jobs, IIS deployment with subpath routing.

## Engineering Challenges & Solutions

- **Merge-cell bug in Excel totals** - a TOTAL label merged over columns 1-9 silently swallowed the Nominal value; narrowed the merge to 1-4 so every total renders.
- **Three distinct export paths** - barcode, online V2, and legacy V1 use different services; mapped FE routes to exact BE handlers and fixed each TOTAL row individually.
- **Ownership + visibility rules** - created_by_email scoping plus role-differentiated columns (created-by shown only for admins).

## Outcome

A production voucher system where the operations team can submit programs, monitor usage, and export accurate Excel/PDF reports without spreadsheet cleanup.