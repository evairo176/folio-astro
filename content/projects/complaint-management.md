---
title: "Complaint Dashboard - Watsons Internal"
description: "Store complaint ticket system with multi-division workflow (StoreOps/DC/SC/Finance), SLA tracking, email notifications, and role-based visibility."
date: "2026-09-05"
tags: ["React", ".NET", "TypeScript", "SQL Server", "SMTP", "RBAC", "SLA"]
featured: true
cover: "/projects/complaint-management/funnel.jpg"
images:
  - /projects/complaint-management/funnel.jpg
  - /projects/complaint-management/dashboard.jpg
  - /projects/complaint-management/logbook.jpg
  - /projects/complaint-management/aging-sla.jpg
metrics:
  - "18 | email templates"
  - "16-col | store logbook view"
  - "OS | aging/SLA auto-classed"
---

Complaint Dashboard for Watsons: stores raise complaint tickets, and DC/SC/Finance divisions process them across claim (CC) and non-claim (NC) paths until closure or payment - with SLA deadlines, email notifications, and strict data visibility rules.

**Role:** Fullstack developer - end-to-end features, diagnostics, deployment.

## Key Features

### Ticket workflow
- Store creates a ticket (registration no, items, reasons) -> DC validates and picks the path (claim -> CC or non-claim -> NC) -> SC/Finance investigate, invoice, and close.
- Step-driven engine with per-step owners, mandatory documents, and attachments per step.

### SLA & aging
- Aging classified into buckets (Standard / Basic Minimum / Non-Compliant / On Process) and "N of M" next-step tracking.
- Dashboard funnels and aging reports per role.

### Email notifications
- 18 templates covering every step, routed by role and step owner; watcher receives CC.
- Store emails are cost-masked; division emails include itemized costs (cost data is classified).

### Role-based visibility
- StoreOps sees a 16-column logbook, no cost/amount columns, and a simplified detail page.
- Divisions see full data; Viewer role is read-only; RBAC permission-gated menus.

## Tech Stack

React + TypeScript (TanStack Router/Query, shadcn-style UI), ASP.NET Core (.NET 10) + EF Core + SQL Server (+ views), SMTP email rendering with templates, Excel exports, IIS subpath deploy.

## Engineering Challenges & Solutions

- **Cost is sensitive data** - enforced masking at every layer (email body, web tabs, logbook, dashboards) without duplicating logic across FE/BE.
- **Var-based costing** - item cost = (physical - system) x unit price from a per-store price view; auto-filled on create, re-computed on DC step.
- **Notification correctness** - watcher as CC, store as To, per-role fan-out via `FinalizeStep`, plus readable rate-limit (429) JSON.

## Outcome

A compliant complaint-handling system that closes the loop store -> DC -> SC -> Finance with SLA enforcement, full audit trail, and role-appropriate views.