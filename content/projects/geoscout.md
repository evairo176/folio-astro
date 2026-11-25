---
title: "GeoScout — Location Intelligence"
description: "Site-selection / location-intelligence SaaS that scores business locations per H3 hexagon. Combines OpenStreetMap POIs, WorldPop population, and BPS demographics into a live suitability heatmap with adjustable category weights, top-N ranking, value-for-money discovery, and walking-distance catchment analysis across 15 Indonesian cities."
date: "2026-06-01"
tags: ["FastAPI", "Python", "PostgreSQL", "PostGIS", "H3", "MapLibre GL", "OpenStreetMap", "WorldPop", "React", "Vite", "TypeScript"]
url: "https://geoscout.evairo.fun"
repo: "https://github.com/evairo176/geoscout"
featured: true
cover: /projects/geoscout/heatmap-scoring.png
images:
  - /projects/geoscout/heatmap-scoring.png
  - /projects/geoscout/top10-ranking.png
  - /projects/geoscout/ranking-data.png
  - /projects/geoscout/business-picker.png
  - /projects/geoscout/pricing.png
metrics:
  - "15 | cities ingested"
  - "H3 res-9 | hexagon scoring grid"
  - "Live | weight-adjustable scores"
---

GeoScout answers one question for anyone opening a physical business: **where is the best spot?** It scores every ~175m hexagon of a district on location suitability for a chosen business type — coffee shop, minimarket, gym — by fusing real points-of-interest, population density, and purchasing-power demographics into an interactive heatmap you can re-weight live.

## Overview

Picking a retail location is usually gut-feel or expensive consultancy. GeoScout turns it into data: it tiles a district into [Uber H3](https://h3geo.org/) hexagons (resolution 9), computes a 0–100 suitability score per hexagon from competitor density, crowd-pullers (offices/campuses/malls), demographics, and accessibility, then renders the result as a red-to-green heatmap over a real basemap. Slide the category weights and every hexagon re-scores instantly. Currently 15 Indonesian districts are ingested — Coblong & Lengkong (Bandung), Gubeng, Wonokromo & Tegalsari (Surabaya), Menteng & Kebayoran Baru, Setiabudi & Tebet (Jakarta), Denpasar Barat, Gondokusuman (Yogyakarta), Klojen (Malang), Medan Petisah, Makassar, and Semarang Tengah.

## Key Features

### H3 Hexagon Suitability Heatmap
- District tiled into H3 res-9 hexagons; each cell carries a live 0–100 suitability score.
- Red → yellow → green legend (`kurang` → `prima`) rendered with MapLibre GL over a CARTO dark basemap.
- Scores recompute client-side the instant you move a category weight slider — no round-trip.

### Adjustable Category Weights
- Per-business-type presets (e.g. Cafe / Coffee Shop) seed sensible weights across competition, crowd-pull, demographics, and accessibility.
- Drag any weight and the whole map re-scores live, with a one-click reset back to the preset.

### Top-N Ranking & Hidden Gems
- "Top 10 lokasi terbaik" highlights and ranks the highest-scoring hexagons with their scores.
- "Value-for-money (hidden gems)" surfaces high-score / lower-cost cells.
- "Cari lahan sesuai budget" filters candidate locations by budget.

### Transparency Layer (real OSM POIs)
- Every data point is a real OpenStreetMap POI — toggle competitors and crowd-pullers on the map and click any point to see its name + OSM ID.
- Open-time filter (siang / malam) for crowd-pullers, real competitor-distance radius, and 5/10/15-minute walking catchment.

### Demographic Profile (premium)
- Per-district demographics from BPS 2024: spending per capita, poverty rate, average years of schooling, life expectancy — used as a proxy for market purchasing power.

## Architecture

- **Backend:** FastAPI (Python) on port 8430, serving scoring + GeoJSON endpoints.
- **Spatial data store:** PostgreSQL + **PostGIS** (`geoscout` database) holding hexagon geometries, POIs, and per-district aggregates.
- **Ingestion:** OpenStreetMap POIs + WorldPop 2020 (~100m population raster) + BPS 2024 demographics, aggregated per H3 cell at ingest time.
- **Frontend:** React + Vite + TypeScript SPA on a Node service (port 3430), MapLibre GL for the WebGL hexagon/heatmap rendering.
- **Ops:** systemd-managed (`geoscout-api` / `geoscout-fe`), deployed at `geoscout.evairo.fun`.

## Tech Stack

**Frontend**
- React + Vite + TypeScript
- MapLibre GL JS (vector basemap + hexagon layers)
- H3-JS for client-side hexagon math and live re-scoring

**Backend**
- FastAPI (Python)
- PostgreSQL + PostGIS for spatial queries
- H3 for hexagon indexing; Turf-style geometry ops for catchment/radius

## Engineering Challenges & Solutions

- **Live re-scoring without a server round-trip:** category-weight changes must feel instant across hundreds of hexagons. The scoring is a weighted linear combination of pre-computed per-hexagon feature values, so the client recomputes scores locally on slider change and only re-styles the MapLibre layer — no refetch.
- **Honest, sourced data:** rather than synthetic scores, every signal is traceable — POIs are clickable to their OSM ID, population is WorldPop, demographics are BPS 2024. The transparency layer is a deliberate trust feature.
- **Accessibility modeling:** walking catchment (5/10/15 min) and real competitor-distance radius use actual geometry rather than naive straight-line buffers, so "10 minutes on foot" reflects reachable area.

## Quality & Verification

- Numeric analyze routes per district verified against known landmarks (e.g. Gubeng) to confirm hexagon-to-place mapping.
- Premium features (PDF/PNG investment report) gated behind an unlock code until purchase, so the suitability map stays free to explore.

## Outcome

GeoScout makes site selection explorable in seconds: open a city, pick a business type, and read the green hexagons. It packages a genuinely hard geospatial problem — fusing POIs, population, and demographics into a defensible per-location score — behind a map anyone can drive.
