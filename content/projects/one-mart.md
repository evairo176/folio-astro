---
title: "One Mart — Backend API (Garapin Cloud)"
description: "Retail backend for products, stock, shelves, transactions, and shelf-rental with multi-account Xendit payments. Built in Go with MongoDB and Firebase."
date: "2025-05-01"
tags: ["Golang", "MongoDB", "Firebase", "Xendit", "REST API"]
featured: false
metrics:
  - "Multi-account | Xendit routing"
  - "Shelf-rental | marketplace model"
  - "Go + MongoDB | backend"
images:
  # Backend API — biasanya tanpa screenshot. Bisa tambah diagram arsitektur jika ada:
  # - /projects/one-mart/architecture.png
---

Backend API powering One Mart, a retail platform built around a **shelf-rental marketplace model**: the store rents out physical shelf space to sellers, tracks their products and stock, processes customer transactions, and routes payments to the right party. Built in Go for throughput and deployed on Garapin Cloud.

## Overview

The interesting twist here isn't a normal POS — it's the **shelf-rental economics**. A seller rents a shelf, stocks it, and earns from sales on that shelf; the platform takes its cut and must settle money to many sellers correctly. That makes **multi-account payments** the core engineering problem: a single checkout can involve products from different shelf owners, and each owner needs to be paid into their own account.

## Key Features

- **Product & stock management** — catalog, inventory levels, per-shelf product assignment.
- **Shelf management & rental** — shelves as first-class entities, rented to sellers with their own product slots.
- **Transactions** — customer purchases spanning one or more shelves.
- **Multi-account Xendit payments** — payment routing/splitting so each shelf owner is settled into their own Xendit account, not a single pooled wallet.
- **Auth & identity** — Firebase for authentication/identity.

## Architecture

A Go REST backend with **MongoDB** as the primary store — a document model fits the flexible product/shelf/rental shapes well. **Firebase** handles authentication. The payment layer integrates **Xendit in multi-account mode**, the trickiest integration: mapping each shelf owner to their payout account and ensuring a multi-seller transaction splits and settles correctly.

## Tech Stack

- **Language:** Go (Golang)
- **Database:** MongoDB
- **Auth:** Firebase
- **Payments:** Xendit (multi-account)
- **Deploy:** Garapin Cloud

## Engineering Challenges & Solutions

- **Multi-account payment settlement.** A checkout touching several shelf owners must pay each one correctly. Solved by integrating Xendit's multi-account capability and modeling the owner→account mapping explicitly, so settlement follows shelf ownership rather than a single merchant account.
- **Shelf-rental data model.** Products belong to shelves, shelves are rented to sellers, sellers earn from sales — a three-way relationship. MongoDB's document model keeps these associations flexible without rigid join tables.

## Outcome

A working retail backend for a shelf-rental marketplace: sellers rent shelves and stock products, customers transact across shelves, and payments settle to the right owners automatically via multi-account Xendit — the hard requirement that distinguishes this from an off-the-shelf store backend.

> Client/company backend — no public URL.
