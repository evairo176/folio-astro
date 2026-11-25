---
title: "Jobseeker — Job Board Platform"
description: "Job board where companies post vacancies and seekers search, filter, and apply end-to-end. Built with Next.js 13 App Router, TypeScript, TanStack Query, and Zod-validated forms."
date: "2025-11-01"
tags: ["Next.js", "TypeScript", "PostgreSQL", "NextAuth", "TanStack Query", "Zod", "Tailwind"]
featured: false
cover: "/projects/jobseeker/home.jpg"
images:
  - /projects/jobseeker/home.jpg
---

A two-sided job board: companies post and manage vacancies, while job seekers search, filter, and apply — then track their applications end to end. Built on the Next.js 13 App Router with a component architecture organized atomic-style (elements → organisms → containers) for a clean, scalable UI layer.

## Overview

A job board lives or dies on **search and filtering** — if a seeker can't narrow thousands of listings to the handful that fit, the product fails. Jobseeker focuses there: a dynamic search/filter system over jobs and companies, with dedicated discovery pages (`find-jobs`, `find-companies`) and detail routes, backed by typed API clients and server-state caching.

## Key Features

### For job seekers
- **Search & filter** — dynamic, multi-criteria search across jobs and companies (`FormSearchDynamic`, `FormFilterDynamic`).
- **Discovery** — curated home (featured jobs, latest jobs, categories, top companies) plus full `find-jobs` / `find-companies` listings.
- **Apply & track** — apply to a vacancy and follow application status (`AppliedJobModal`).
- **Company profiles** — browse companies and their open roles.

### For companies
- Post and manage vacancies, with authenticated sessions via NextAuth.

## Architecture

**Next.js 13 App Router** with a deliberately layered component model: `elements` (primitives) → `organism` (composed sections like `Hero`, `JobCard`, `FeaturedJobs`, `CompanyCard`) → `containers` (data-bound page sections) → route `app/*` pages. API access goes through **typed clients** (`types/clients`, `constans/clients`) so endpoints and payload shapes are centralized and type-checked. Server state is cached with **TanStack Query**; forms are built with **React Hook Form + Zod** for validation; **NextAuth** handles authentication.

## Tech Stack

**Frontend**
- Next.js 13 (App Router) + TypeScript
- TanStack Query (server-state caching)
- React Hook Form + Zod (validated forms)
- Radix UI primitives + Tailwind CSS + class-variance-authority (shadcn-style)
- Zustand (client state)
- NextAuth (authentication)

**Data**
- PostgreSQL

## Engineering Challenges & Solutions

- **Dynamic search/filter without prop-drilling chaos.** Filtering crosses many UI pieces (search bar, filter panel, result grid). Centralizing the query/filter state and feeding typed API clients keeps the search experience consistent and the components decoupled.
- **Scalable component taxonomy.** An atomic-style split (elements → organisms → containers) stops a job board's many card/list/form variants from collapsing into one giant component folder — each layer has a clear job.
- **Type-safe API boundary.** Centralized client definitions in `types/clients` + `constans/clients` mean endpoint and response shapes are declared once and reused, catching mismatches at compile time.

## Tech Stack Notes

Authentication via NextAuth, validated forms via Zod, and TanStack Query for caching together give the seeker flow (search → view → apply → track) a responsive, server-synced feel without manual fetch wiring.

## Outcome

An end-to-end job board covering both sides of the marketplace — company posting and seeker apply/track — with a strong search/filter core and a clean, layered Next.js 13 architecture that's straightforward to extend with new listing types or filters.
