---
title: "Cutting an ETL Report From 4 Hours to 10 Minutes"
description: "How I rebuilt a plantation analytics data warehouse with Spark and Airflow to process 5M+ monthly records and turn an overnight report into a coffee-break job."
date: "2026-03-15"
tags: ["Data Engineering", "Apache Spark", "Airflow", "ETL"]
lang: "en"
---

At KPN Plantation I owned a production analytics data warehouse that fed block-level yield analysis across the company's estates. The pipeline processed 5M+ records a month, and when I inherited the reporting flow, generating a single analytics report took around **four hours**. By the end it ran in **under ten minutes**. Here is what actually moved the needle, and it was not "just add more workers."

## The Starting Point

The original report was a long chain of sequential SQL queries against the operational database, stitched together by a script that ran overnight. It was slow for three compounding reasons:

1. **It hammered the OLTP database.** Analytical scans competed with live transactional load, so it had to run at night and still dragged.
2. **It recomputed everything every time.** No intermediate state, no incremental loads, every run reprocessed the full history.
3. **It was single-threaded.** One query finished before the next started, even when they were independent.

## Step 1: Separate Analytics From Operations

The first fix was architectural, not performance tuning. I moved analytical workloads off the operational database into a dedicated warehouse. Operational systems keep serving transactions; the warehouse owns the heavy scans. This alone removed the "run it at night so it doesn't hurt production" constraint.

## Step 2: Spark for the Heavy Lifting

The transformation layer moved to **Apache Spark (PySpark)**. The win is not magic, it is parallelism plus a better execution model:

- Independent transformations run across partitions instead of one row-set at a time.
- Spark's query planner pushes filters down and avoids materializing intermediate results it does not need.
- Wide aggregations (yield per block, per period, per variety) parallelize naturally.

The trap I hit early: **data skew**. A handful of large estates held most of the records, so partitioning by estate left a few workers doing all the work while the rest idled. Repartitioning on a higher-cardinality composite key (estate + block + period) evened out the load and was one of the single biggest speedups.

## Step 3: Incremental, Not Full Reload

Recomputing five million records monthly when only the latest period changed is wasteful. I moved to incremental loads: ingest the new period, transform only what changed, and append to the warehouse. Historical partitions are computed once and left alone.

This is where most of the 4-hour-to-10-minute gain actually came from. Parallelism makes a full run faster; **not doing the full run** makes it disappear.

## Step 4: Airflow for Orchestration

The script-that-runs-overnight became an **Airflow DAG**. That gave me:

- **Explicit dependencies.** Tasks that can run in parallel do; tasks that depend on others wait. The DAG makes the real critical path visible.
- **Retries and idempotency.** A failed task retries on its own instead of failing the whole run at 3am.
- **Observability.** When a run is slow, the Gantt view shows exactly which task is the bottleneck, instead of guessing inside a monolithic script.
- **Backfills.** Reprocessing a historical period is a parameterized DAG run, not a hand-edited script.

## Step 5: Serve It

The output landed in PostgreSQL and surfaced through Streamlit dashboards for block-level yield analysis, so the people who needed the numbers got an interactive view instead of a static overnight PDF.

## What I Would Tell My Past Self

- **Architecture beats tuning.** Splitting analytics from operations and going incremental did more than any Spark config flag.
- **Watch for skew.** Uneven partitions make parallelism a lie. Partition on something high-cardinality.
- **The fastest job is the one you don't run.** Incremental processing was the real unlock; full reloads were the actual cost.
- **Orchestration is observability.** Airflow did not make the tasks faster, but it told me which task to make faster.

Turning an overnight job into a coffee-break job was not one clever trick. It was removing contention, stopping redundant work, parallelizing what was left, and orchestrating it so the bottleneck was always visible.
