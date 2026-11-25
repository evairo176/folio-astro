---
title: "ProFlow — Project Management SaaS"
description: "Modern project-management platform with automated template provisioning, real-time collaboration, and a microservice architecture built for multi-team horizontal scale."
date: "2026-06-01"
tags: ["React", "Node.js", "TypeScript", "PostgreSQL", "Redis", "WebSocket", "Microservices", "Docker"]
url: "https://proflow.evairo.fun"
repo: "https://github.com/evairo176/proflow"
featured: true
images:
  - /projects/proflow/image-1.png
  - /projects/proflow/image-2.png
metrics:
  - "9 | microservices"
  - "Real-time | WebSocket sync"
  - "30→5 min | deploy time"
---

ProFlow is a modern project-management SaaS built to help teams plan, track, and ship work together in real time. It pairs automated project-template provisioning with a microservice backend designed for multi-team horizontal scale.

**Live:** [pms.evairo.fun](https://pms.evairo.fun) · **Source:** [github.com/evairo176/proflow](https://github.com/evairo176/proflow)

## Overview

Most small-to-mid teams outgrow spreadsheets but find enterprise PM tools too heavy. ProFlow targets that gap: fast to onboard (spin up a ready-to-use board from a template in seconds), real-time by default (no refresh to see teammates' changes), and architected so each capability scales independently as usage grows.

## Key Features

### Project & Task Management
- **Automated template provisioning** — create a fully structured project (boards, columns, default tasks) from a template in one action, instead of building from scratch every time.
- **Kanban boards** with drag-and-drop columns and cards.
- **Task lifecycle** — status, priority, assignees, due dates, descriptions, and activity history.
- **Multi-team workspaces** — organize projects per team with isolated membership.

### Real-Time Collaboration
- **Live board sync over WebSocket** — task moves, edits, and new cards appear instantly for every connected member, no page refresh.
- **Presence & activity feed** — see who is doing what as it happens.
- **Optimistic UI** — actions feel instant, with server reconciliation behind the scenes.

### Authentication & Access Control
- **JWT access tokens (15 min)** + **rotating refresh tokens (30 days)** with token-family reuse detection and revoke-on-logout.
- **httpOnly + Secure + SameSite cookies** — tokens never touch `localStorage`, closing the XSS token-theft vector.
- **Role-based access** — owner / member permissions scoped per workspace.

### Notifications & Workflow
- Event-driven notifications via a dedicated webhook/notification service.
- Approval and assignment flows wired through the service layer.

### Admin Dashboard
- Workspace and user management, project overview, and operational metrics from a single admin surface.

## Architecture

ProFlow runs as **9 independent microservices** behind a single **API Gateway**, so the frontend talks to one endpoint while each domain scales on its own.

- **API Gateway** — single entry point; routes requests, forwards auth cookies to services, relays `Set-Cookie` back to the client, and proxies WebSocket upgrades.
- **Auth Service** — login, registration, token issue/rotate/revoke, cookie handling.
- **Project / Task Services** — core domain logic for boards, columns, and cards.
- **Realtime Service** — WebSocket hub for live board updates, backed by Redis.
- **Notification / Webhook Service** — event fan-out and outbound integrations.
- Plus supporting services for users, uploads, and workspace management.

**Data layer:** PostgreSQL for persistence (per-service schema, additive non-destructive migrations), Redis for real-time coordination and caching.

**Delivery:** Dockerized services, managed in production with a pm2 ecosystem (auto-restart, zero-downtime reloads), fronted by nginx (TLS, static frontend, `/api` + WebSocket proxy), with self-hosted CI/CD.

## Tech Stack

- **Frontend:** React (Vite), TypeScript, TanStack Query, Tailwind CSS, shadcn/ui, WebSocket client
- **Backend:** Node.js (TypeScript), Express, microservices + API Gateway
- **Data:** PostgreSQL, Redis
- **Real-time:** WebSocket
- **Infra/DevOps:** Docker, pm2, nginx, self-hosted CI/CD

## Engineering Challenges & Solutions

- **Distributed auth done safely** — instead of bearer tokens in `localStorage`, ProFlow uses httpOnly cookies relayed through the gateway, with rotating refresh tokens and reuse detection. Secure across services without exposing tokens to the client JS.
- **Per-service schema without clobbering production** — schemas are applied additively (`CREATE TABLE IF NOT EXISTS`, `ALTER ADD`) so deploys never destroy existing data.
- **Real-time at scale** — WebSocket sessions coordinated through Redis so board state stays consistent across multiple connections and service instances.
- **Conflict-free deployment** — the gateway runs on a dedicated port behind an nginx reverse proxy, with all 9 services supervised by pm2 for resilient, zero-downtime operation.

## Quality & Verification

- **31 end-to-end tests (Playwright)**, including a dedicated cookie/auth regression suite, all green before deploy.
- Full chain verified in production: `login → httpOnly cookie → /me → /projects → /tasks → cookie-only refresh`.
- Security defaults throughout: parameterized queries, input validation, httpOnly/Secure cookies.

## Outcome

ProFlow is live in production at [pms.evairo.fun](https://pms.evairo.fun) with all 9 services healthy, the full auth-and-data chain passing, self-hosted CI/CD shipping changes continuously, and a stable runtime (0 restarts after stabilization).
