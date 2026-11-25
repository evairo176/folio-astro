---
title: "Production Analytics Data Warehouse"
company: "KPN Plantation"
description: "Spark/Airflow ETL warehouse processing 5M+ monthly records for block-level yield analysis, cutting report generation from ~4 hours to under 10 minutes."
date: "2025-03-01"
tags: ["Python", "Apache Spark", "Apache Airflow", "PostgreSQL", "Streamlit", "ETL"]
featured: true
metrics:
  - "5M+ | records / month"
  - "~4h → <10min | report generation"
  - "Airflow | orchestrated batch ETL"
images:
  # Tambahkan screenshot dashboard Streamlit sendiri:
  # - /projects/data-warehouse/yield-dashboard.png
---

A production analytics data warehouse for plantation operations: an Apache Spark + Airflow ETL pipeline that ingests and transforms 5M+ records per month into block-level yield analysis, cutting report generation from around four hours to under ten minutes. Built at KPN Plantation.

## Overview

Plantation yield analysis means crunching huge volumes of field data — harvest records, block-level measurements, operational logs — into reports management can act on. The old path was slow (~4 hours per report run) and fragile. The warehouse replaces it with a **scheduled, orchestrated batch pipeline**: raw operational data in, clean analytical tables out, surfaced through dashboards — reliably, every run.

## Key Features

- **Block-level yield analysis** — transforms raw harvest/operational data into per-block yield metrics, the unit decisions are made on.
- **High-volume ETL** — processes 5M+ records monthly through Spark's distributed engine.
- **Orchestrated scheduling** — Airflow DAGs coordinate extract → transform → load with dependency ordering, retries, and visibility into each run.
- **Analytical serving** — cleaned data lands in PostgreSQL and is surfaced via Streamlit dashboards for non-technical stakeholders.

## Architecture

A classic, robust analytics stack tuned for volume:

- **Extract** — pull raw operational/harvest data from source systems.
- **Transform (Apache Spark)** — distributed processing handles the 5M+ monthly records that would choke a single-node script; Spark does the heavy joins/aggregations for block-level yield.
- **Orchestrate (Apache Airflow)** — DAGs schedule and sequence the pipeline, with retries and run history so a failed stage is visible and recoverable rather than silently wrong.
- **Load (PostgreSQL)** — curated analytical tables as the serving layer.
- **Serve (Streamlit)** — interactive dashboards over the warehouse for yield analysis.

## Tech Stack

- **Processing:** Python + Apache Spark
- **Orchestration:** Apache Airflow (DAG-scheduled batch)
- **Warehouse:** PostgreSQL
- **Visualization:** Streamlit

## Engineering Challenges & Solutions

- **From ~4 hours to under 10 minutes.** The original reporting was a long, monolithic run. Moving the heavy transforms onto **Spark's distributed engine** and scheduling them as discrete, parallelizable Airflow tasks cut report generation by ~95% — the headline win.
- **5M+ records, reliably, every month.** Volume at this scale needs distributed compute, not a cron'd script. Spark handles the throughput; Airflow makes the pipeline observable and recoverable (retries, run history) so a bad upstream batch doesn't quietly corrupt reports.
- **Making it usable by non-engineers.** Clean warehouse tables are useless if stakeholders can't reach them. Streamlit dashboards put block-level yield analysis in front of decision-makers without a BI-tool license or SQL knowledge.

## Quality & Verification

The pipeline's correctness rests on idempotent, orchestrated stages — Airflow's dependency graph ensures transforms only run on complete upstream data, and run history surfaces failures instead of producing silently wrong reports. Output yield tables are validated against known totals before serving.

## Outcome

A production warehouse that turned a 4-hour reporting bottleneck into a sub-10-minute, scheduled pipeline over 5M+ monthly records — giving plantation management timely, block-level yield analysis through self-serve Streamlit dashboards.

> Internal plantation system — no public URL.
