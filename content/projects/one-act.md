---
title: "One Act — Network Installation Automation"
company: "PT. Mega Akses Persada (Fiberstar)"
description: "Material approval-management and network-installation automation system for Fiberstar network operations, replacing manual field workflows with a structured digital approval and tracking flow used daily by field and operations teams."
date: "2026-04-01"
tags: [".NET", "Angular", "Express.js", "SQL Server"]
featured: true
images:
  - /projects/one-act/image-1.png
metrics:
  - ".NET | enterprise backend"
  - "Material + Network | approval flows"
  - "Integrated | enterprise systems"
---

An internal enterprise system for Fiberstar (PT. Mega Akses Persada) that digitizes material approval and network-installation workflows, replacing manual, paper-and-spreadsheet field processes with a structured, trackable flow used daily by field and operations teams.

> Internal enterprise system. Architected and delivered as Senior Fullstack Developer, no public URL.

## Overview

Fiberstar's network buildout depends on getting materials approved and installations executed quickly and accurately in the field. The legacy flow relied on manual coordination, slow, hard to audit, and easy to lose track of. One Act turns that into a single application: request and approve materials, drive the installation process, and keep operations visible end-to-end, integrated with the SQL Server systems the business already runs on.

## Key Features

### Material Approval Management
- Structured request-and-approval flow for installation materials.
- Status tracking from request through approval to fulfillment.
- Auditable history so operations can see who approved what and when.

### Network Installation Automation
- Digitizes the network-installation workflow used by field teams daily.
- Moves field operations off manual coordination onto a single tracked process.

### Enterprise Integration
- Integrates with existing SQL Server backends used across Fiberstar operations.
- Angular / .NET frontends consumed daily by field and operations staff.

## Architecture

A line-of-business enterprise application: **Angular** frontend over a **.NET** backend, with **Express.js** services where needed, persisting to **SQL Server**, the standard data platform across Fiberstar's internal systems. Built to slot into the company's existing enterprise environment rather than as a standalone product.

## Tech Stack

- **Frontend:** Angular, TypeScript.
- **Backend:** .NET, Express.js.
- **Database:** SQL Server.

## Engineering Practices

Beyond shipping One Act, this role carried broader engineering ownership at Fiberstar:

- **Code review & mentorship** — lead code reviews and mentor 4+ developers, reducing post-release defects by around 30%.
- **Self-hosted CI/CD** — engineered pipelines that cut deployment time from around 30 minutes to under 5 minutes, enabling multiple releases per week.
- **Enterprise architecture** — architected internal applications integrating SQL Server backends with Angular/.NET frontends used daily by field and operations teams.

## Outcome

A daily-driver internal system that streamlined Fiberstar's material approval and network-installation operations, delivered alongside faster releases (sub-5-minute deploys) and lower defect rates through disciplined review and mentorship.
