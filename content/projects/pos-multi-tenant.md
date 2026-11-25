---
title: "POS Multi-Tenant Platform"
company: ""
description: "Multi-tenant point-of-sale SaaS for retail. Isolated tenant workspaces, real-time stock sync, per-tenant RBAC, multi-outlet, subscriptions, and an installable PWA cashier, built on a 7-service microservice backend behind an Nginx API gateway."
date: "2026-03-01"
tags: ["React 19", "TypeScript", "Express.js", "Prisma", "PostgreSQL", "Redis", "Socket.io", "Microservices", "Docker", "PWA"]
repo: "https://github.com/evairo176/pos_full"
url: "https://pos.evairo.fun"
featured: true
images:
  - /projects/pos-multi-tenant/image-1.jpg
  - /projects/pos-multi-tenant/image-2.jpg
  - /projects/pos/landing.jpeg
  - /projects/pos/pricing.jpeg
metrics:
  - "Multi-tenant | isolated stores"
  - "POS | real-time sales"
  - "Cloud | centralized admin"
---

A multi-tenant Point of Sale (POS) SaaS for retail stores. Each tenant (store/business) operates in a fully isolated workspace, its own users, products, inventory, and transactions, on top of a microservice backend designed to scale each domain independently.

**Repo:** [github.com/evairo176/pos_full](https://github.com/evairo176/pos_full)

## Overview

Retailers need more than a single cash register: catalog, stock across outlets, customers and loyalty, reporting, and billing, all isolated per business. POS Multi-Tenant delivers that as SaaS: spin up a tenant, manage multiple outlets, and run the cashier as an installable PWA that keeps working even on a flaky connection. The whole thing was built spec-driven (`.kiro/specs`) with a strict quality gate (test + build) before any module is considered done.

## Key Features

### Sales & Cashier (Kasir)
- Cart building and fast checkout flow optimized for counter use.
- Barcode and QR scanning (`jsbarcode`, `html5-qrcode`) for quick product lookup.
- Auto-incrementing receipt numbers (spec-driven, race-safe).
- Installable PWA cashier, offline-capable via Workbox service worker.

### Products & Catalog
- Catalog management with categories, SKUs, pricing, and bundles.
- Bulk product import (CSV/Excel parsing with `papaparse` / `xlsx`).
- Barcode support end-to-end.

### Inventory
- Stock tracking with mutations and adjustments.
- Stock transfers between outlets.
- Suppliers, purchase orders, and returns to suppliers.

### Customers & Loyalty
- Customer records with loyalty points and vouchers.
- Discounts, debts, and invoices.

### Transactions & Reports
- Sales history with dashboards and charts.
- Exports to PDF (`jspdf` + autotable) and Excel (`xlsx`).

### Multi-Outlet & Subscriptions
- Tenants manage multiple outlets under one account.
- Subscription plans with subscription guards gating tenant access by billing tier.
- SuperAdmin layer for cross-tenant business administration.

### Access Control (RBAC)
- Per-tenant role-based access control with default roles: **owner**, **manager**, **cashier**.
- Permissions stored per tenant in `RolePermission` and `MenuPermission`, governing both sidebar menu visibility and per-page actions.
- Owners can edit manager/cashier permissions directly from the RBAC page.

## Architecture

ProFlow-style microservice split, **7 backend services** behind a single **Nginx API gateway** (`:8080`), so the frontend talks to one endpoint while each domain scales independently:

- **auth-service** (3001) — authentication, JWT, sessions
- **tenant-service** (3002) — tenant isolation, outlets, subscriptions, RBAC
- **product-service** (3003) — catalog, categories, bulk import, uploads
- **inventory-service** (3004) — stock, transfers, suppliers, purchase orders
- **pos-service** (3005) — cart, checkout, receipts
- **report-service** (3006) — dashboards, sales history, exports
- **payment-service** (3007) — payment processing and methods

**Data layer:** PostgreSQL via Prisma 5 (shared schema), Redis (`ioredis`) for cache, sessions, and rate-limit backing.

**Shared code:** an npm workspaces monorepo with `@pos/shared` for cross-service types and utilities.

**Delivery:** every service Dockerized, orchestrated with `docker-compose`, images published to GitHub Container Registry via CI, deployed through a self-hosted runner.

## Tech Stack

- **Frontend:** React 19 + TypeScript (Vite, ESM), TanStack Router, TanStack Query + Axios, Redux Toolkit, React Hook Form + Zod, shadcn/ui + Radix + Tailwind CSS 4, `socket.io-client`, `vite-plugin-pwa` (Workbox).
- **Backend:** Node.js 20 + TypeScript, Express 4, Prisma 5, PostgreSQL, Redis, `jsonwebtoken` + `bcryptjs`, Zod validation, Helmet + `express-rate-limit` (Redis-backed), Winston/Morgan logging.
- **Infra:** npm workspaces monorepo, Nginx API gateway, Docker, GHCR + self-hosted CI/CD runner.

## Engineering Challenges & Solutions

- **Tenant isolation at scale** — every query is tenant-scoped; tenant context flows from auth through the gateway to each service, so no tenant can ever read another's data.
- **Granular, editable RBAC** — permissions live in the database per tenant (`RolePermission` / `MenuPermission`) instead of hard-coded, so owners reconfigure access without a redeploy, and the same rules drive both menu rendering and API authorization.
- **Real-time stock & order sync** — `socket.io` pushes inventory and transaction updates so multiple cashiers and outlets stay consistent without refreshing.
- **Offline-tolerant cashier** — PWA with a Workbox service worker keeps the checkout usable on unstable connections, a hard requirement for real retail counters.
- **Race-safe receipt numbers** — auto-increment receipt numbering was designed spec-first to avoid duplicates under concurrent checkouts.

## Quality & Verification

- Spec-driven development (`.kiro/specs`): requirements, design, then tasks per feature.
- **Quality gate:** `npm run check` (test + build) before any backend module is complete; every service ships a `/health` test, every route gets success + error tests.
- Unit testing with Jest/Vitest + `fast-check` (property-based), end-to-end with Playwright.
- Security defaults throughout: Zod validation at every boundary, Helmet, Redis-backed rate limiting, hashed credentials.

## Outcome

A production-shaped multi-tenant POS SaaS: isolated tenants, multi-outlet retail operations, configurable RBAC, subscription billing, and an installable offline-capable cashier, all on a CI/CD-deployed microservice backend.
