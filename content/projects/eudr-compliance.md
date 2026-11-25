---
title: "EUDR Compliance Platform"
company: "KPN Plantation"
description: "End-to-end EU Deforestation-free Regulation (EUDR) platform for palm-oil operations: geospatial plot analysis, full supply-chain traceability (estate to mill to bulking to KCP), risk assessment, and automated Due Diligence Statement (DDS) generation. Cut reporting time by around 40%."
date: "2025-09-01"
tags: ["React 19", "TypeScript", "Vite", "Express 5", "Sequelize", "PostgreSQL", "Leaflet", "Turf.js", "GeoJSON", "AWS S3"]
featured: true
images:
  - /projects/eudr-compliance/image-1.png
metrics:
  - "~40% | reporting time cut"
  - "Geospatial | Turf.js validation"
  - "EUDR | compliance ready"
---

An end-to-end platform that lets a palm-oil producer prove its supply chain is **deforestation-free** under the EU Deforestation Regulation (EUDR). It combines geospatial plot analysis, full chain-of-custody traceability, risk scoring, and one-click Due Diligence Statement generation, cutting compliance reporting time by around **40%**.

> Internal KPN Plantation system. Architected and delivered end-to-end (business process, DB design, UI/UX, frontend, and backend).

## Overview

EUDR requires operators placing commodities on the EU market to demonstrate that the land behind each shipment was not deforested after the cutoff date, backed by geolocation evidence and a documented Due Diligence Statement. Doing this by hand across thousands of plots and a multi-step supply chain is slow and error-prone. This platform digitizes the whole flow: map and validate plots, trace material from estate to export, assess risk, and emit the regulatory DDS automatically.

## Key Features

### Geospatial Plot Analysis (GIS)
- Interactive maps with Leaflet / React-Leaflet over plot and block geometries.
- Client-side spatial analysis with a full Turf.js toolkit: area, centroid, buffer, intersect, point-in-polygon, within, disjoint, polygon cleaning/rewind, and self-intersection (unkink) detection.
- Spatial indexing (`flatbush`, `geojson-rbush`) for fast queries over large GeoJSON datasets.
- Plot geometry validation to catch overlaps and malformed polygons before they enter a report.

### Supply-Chain Traceability
- Full chain-of-custody modeling: **estate to mill (PKS) to bulking to KCP**, plus estate-to-PKS, PKS-to-bulking, and bulking-to-KCP linkage steps.
- Supplier hierarchy: company groups, companies, estates, mills, and master supplier registries.
- Material flow tracking across harvesting, production, and sales.

### Risk Assessment
- Plot- and supplier-level risk analysis to flag high-risk sourcing.
- Legality and compliance checks tied to each link in the chain.

### Due Diligence Statement (DDS) & Reporting
- Automated DDS document generation from live data using `easy-template-x` (Word templates), with PDF (`pdf-lib`, `pdfkit`) and Excel (`exceljs`, `xlsx`) exports.
- LibreOffice-backed conversion for clean, regulator-ready output.
- Dashboards for main operations and supply-chain visibility.

### Workflow, Access & Audit
- Multi-step approval workflow for reports and submissions.
- Role-based access control (roles, companies, user-company scoping).
- Activity logging for a full audit trail.
- File storage and presigned uploads/downloads via AWS S3.

## Architecture

A decoupled SPA + REST API:

**Frontend** — React 19 + TypeScript on Vite 7. State with Zustand, server state with TanStack Query, tables via TanStack Table, forms with React Hook Form + Zod/Yup. UI built on Radix primitives + Tailwind CSS 4. Mapping with Leaflet/React-Leaflet and the Turf.js geometry stack; drag-and-drop with dnd-kit; charts with Recharts.

**Backend** — Node.js + Express 5, PostgreSQL via Sequelize ORM. JWT auth (`jsonwebtoken` + `bcryptjs`), validation with `express-validator` + Zod. Document pipeline: `easy-template-x`, `pdf-lib`/`pdfkit`, `exceljs`, `libreoffice-convert`. Integrations: AWS S3 (uploads/exports), Google APIs, and email via Nodemailer.

The backend is organized in clean layers, **routes to controllers to services to repositories to models (entities)** with dedicated validators and middlewares, across ~34 route modules covering plots, supply-chain links, risk, DDS, dashboards, and masters.

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 7, TanStack Query + Table, Zustand, React Hook Form, Zod/Yup, Radix UI + Tailwind CSS 4, Leaflet/React-Leaflet, Turf.js, GeoJSON, Recharts, dnd-kit.
- **Backend:** Node.js, Express 5, Sequelize, PostgreSQL, JWT + bcrypt, express-validator/Zod, easy-template-x, pdf-lib/pdfkit, ExcelJS, AWS S3 SDK, Nodemailer, Google APIs.

## Engineering Challenges & Solutions

- **Large-scale geospatial validation** — thousands of plot polygons needed fast, correct spatial checks. Solved with client-side Turf.js analysis plus spatial indexing (flatbush / geojson-rbush) and geometry cleaning (unkink, rewind, clean-coords) to keep maps responsive and data valid.
- **Multi-step chain-of-custody integrity** — modeling estate to mill to bulking to KCP as explicit linkage entities so material can be traced end-to-end and any broken link surfaces immediately.
- **Regulator-ready document generation** — automated DDS output from live data via templated Word to PDF conversion, removing manual report assembly and cutting reporting time ~40%.
- **Layered, maintainable backend** — strict routes/controllers/services/repositories separation across 34 route modules keeps a large compliance domain testable and extensible.

## Outcome

A production compliance platform for KPN Plantation that turns a manual, multi-week EUDR reporting effort into a digital, auditable workflow, geolocated plots, traceable supply chain, automated Due Diligence Statements, with reporting time cut by around 40%.
