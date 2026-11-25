---
title: "Tnosworld — Security Service PWA"
company: "PT. Extreme Network Sistem"
description: "PWA for security-service ordering and legal-entity registration with Google Maps and a custom Xendit gateway processing ~1K monthly transactions, plus Android push and Telegram order alerts."
date: "2023-04-01"
tags: ["React.js", "Laravel", "MySQL", "Redux Toolkit", "Xendit", "PWA"]
featured: false
metrics:
  - "~1K | transactions / month"
  - "PWA | installable, offline-aware"
  - "Push + Telegram | order alerts"
cover: "/projects/tnosworld/payment.jpg"
images:
  - /projects/tnosworld/payment.jpg
---

A Progressive Web App for ordering security services and registering legal entities, with map-based service selection, a custom payment gateway, and real-time order alerts. Delivered at PT. Extreme Network Sistem, the app processes around 1,000 transactions per month.

## Overview

Tnosworld digitizes two flows that were previously manual: **ordering on-site security services** (with location picking) and **legal-entity registration**. Built as a PWA so it installs like a native app and works across devices without app-store friction, while a custom Xendit integration handles payments and a dual push/Telegram channel keeps operators notified the moment an order lands.

## Key Features

- **Security-service ordering** — browse and order services, with **Google Maps** for picking the service location.
- **Legal-entity registration** — guided registration flow for business/legal entities.
- **Custom Xendit payment gateway** — integrated checkout processing ~1K transactions/month.
- **Real-time order alerts** — **Android push notifications** to customers plus **Telegram alerts** to operators, improving order-response turnaround.
- **PWA** — installable, responsive, app-like experience without an app store.

## Architecture

A **React.js** PWA frontend with **Redux Toolkit** for state, talking to a **Laravel + MySQL** backend. Payments go through a **custom Xendit gateway** integration. The notification layer is dual-channel: customer-facing **Android push** for status updates, and **Telegram** alerts to the operations team so new orders are actioned fast.

## Tech Stack

**Frontend**
- React.js + Redux Toolkit
- PWA (installable, service-worker caching)
- Google Maps integration

**Backend**
- Laravel (PHP) + MySQL
- Custom Xendit payment gateway
- Push notifications (Android) + Telegram bot alerts

## Engineering Challenges & Solutions

- **Fast order response.** A security-service order is time-sensitive. Routing every new order to **Telegram** (where the ops team already lives) plus customer push closed the gap between order placed and order actioned, improving turnaround.
- **Custom payment gateway.** Rather than a drop-in checkout, the Xendit integration was built to fit the service-ordering and registration flows, handling the ~1K monthly transaction volume reliably.
- **PWA over native.** Shipping as a PWA avoided app-store overhead while still giving an installable, app-like experience — the right tradeoff for the audience and timeline.

## Outcome

A production PWA handling real money (~1K transactions/month) across two distinct flows — security-service ordering with map-based location and legal-entity registration — with a custom Xendit gateway and dual push/Telegram alerting that sharpened order-response turnaround.

> Client product — no public URL.
