---
title: "LaundryKu — Multi-Tenant Laundry Management App"
description: "Cross-platform mobile app for laundry businesses: multi-tenant operations, QR-tracked wash process, driver pickup/delivery, subscription billing, and owner analytics. Built with Expo SDK 54 + React Native."
date: "2025-08-01"
tags: ["React Native", "Expo", "TypeScript", "NativeWind", "Zustand", "TanStack Query", "Zod"]
featured: true
metrics:
  - "18 | domain services"
  - "Multi-tenant | outlet + staff scoping"
  - "QR | wash-process tracking"
images:
  #  2) Lokal: taruh file di public/projects/laundry-management/nama.png lalu referensikan
  #    - /projects/laundry-management/dashboard.png
---

A cross-platform mobile app that runs an entire laundry business from one phone — built for owners, outlet staff, and delivery drivers, each with their own scoped experience. Designed multi-tenant from the ground up: one app, many laundry brands, each with isolated outlets, staff, pricing, and reports.

## Overview

Most laundry shops in Indonesia still run on paper tickets and WhatsApp. LaundryKu replaces that with a structured flow that mirrors how a laundry actually operates: set up the business once (tenant → plan → outlet → staff → service catalog → pricing), then run the daily cycle — **terima order → proses cucian → siap diambil → selesai** — with every garment batch tracked end to end. The hard part isn't any single screen; it's keeping the whole flow unbroken across roles and outlets without losing an order.

## Key Features

### Daily operations
- **Order intake** — pick customer, select services, input quantity, print a QR ticket, take a down payment.
- **QR-tracked wash process** — staff scan the order QR to advance stages (wash → dry → iron → pack), so status is always truthful, not guessed.
- **Pickup & delivery** — a dedicated driver role with its own route screens for scheduled pickups and deliveries.
- **Customer notifications** — push alerts when laundry is ready, closing the loop without manual WhatsApp messages.

### Business & management
- **Multi-tenant + multi-outlet** — owners manage several outlets; staff and data are scoped per outlet.
- **Subscription plans** — tenant billing tiers gate features (the SaaS layer of the product).
- **Reports & cashflow** — daily revenue, cash flow, service performance, customer analytics.
- **Catalog, pricing, vouchers** — service categories, per-service pricing, promo vouchers, and inventory/purchase-order tracking.
- **Roles & permissions** — owner, manager, staff, and driver each see only what their role needs.

## Architecture

A service-oriented client: **18 typed domain services** (`order`, `process`, `delivery`, `payment`, `catalog`, `tenant`, `outlet`, `voucher`, `inventory`, `cashflow`, `report`, `role`, `purchase-order`, …) each wrapping the backend API with a single axios instance. Server state is owned by **TanStack Query** (caching, refetch, optimistic updates); local/session state (auth, cart, active outlet, theme) lives in **Zustand** stores. Routing is **file-based via Expo Router**, with route groups per role — `(auth)`, `(onboarding)`, `(tabs)`, `(drawer)`, `(driver)` — so each persona gets a distinct navigation tree from the same codebase.

## Tech Stack

**Mobile**
- Expo SDK 54 + React Native 0.81 + TypeScript
- Expo Router (file-based routing, role-grouped)
- NativeWind (Tailwind for RN) + glassmorphism UI
- Zustand (client state) + TanStack Query (server state)
- React Hook Form + Zod (typed, validated forms)
- expo-notifications (push), expo-secure-store (token storage)
- react-native-qrcode-svg (QR generation/scan), react-native-reanimated

**Quality**
- Jest + Testing Library (store + lib unit tests)
- TypeScript strict, `tsc --noEmit` gate

## Engineering Challenges & Solutions

- **Unbroken cross-role flow.** An order created at the counter must surface correctly for the wash-process staff, then the driver, then back to billing. Solved by modeling the lifecycle as explicit stages advanced via QR scans — state transitions are deliberate, not implicit, so an order can't silently fall out of the pipeline.
- **One codebase, four personas.** Owner/manager/staff/driver need very different screens. Expo Router route groups keep each persona's stack isolated while sharing services, components, and auth.
- **Server vs client state discipline.** Mixing API data into local state is the usual RN mess. Strict split — TanStack Query for anything from the backend, Zustand only for UI/session — keeps caching correct and screens predictable.

## Quality & Verification

Unit tests cover the Zustand stores and lib helpers (the stateful core), forms are validated with Zod schemas before submit, and the build is gated on `tsc --noEmit` under strict TypeScript. The wash-process and order lifecycle — the riskiest paths — are driven by deterministic QR-scan transitions rather than free-form status edits.

## Outcome

A production-shaped, multi-tenant laundry SaaS client that takes a shop from paper tickets to a structured digital flow: QR-tracked processing, role-scoped operations, driver logistics, subscription billing, and owner-level analytics — all cross-platform from a single Expo codebase.

> Client/product app — screenshots to be added.
