---
title: "IT Helpdesk - Watsons Internal"
description: "Internal IT helpdesk: ticket intake from store/DC/office, technician queue, SLA tracking (response + resolution), comments, notifications, and role-based dashboards."
date: "2026-10-09"
tags: ["React", ".NET", "TypeScript", "SQL Server", "TanStack Query", "SLA", "Helpdesk"]
featured: true
cover: "/projects/it-helpdesk/hd-1.png"
images:
  - /projects/it-helpdesk/hd-1.png
  - /projects/it-helpdesk/hd-2.png
  - /projects/it-helpdesk/hd-3.png
  - /projects/it-helpdesk/hd-4.png
  - /projects/it-helpdesk/hd-5.png
  - /projects/it-helpdesk/hd-6.png
  - /projects/it-helpdesk/hd-7.png
  - /projects/it-helpdesk/hd-8.png
  - /projects/it-helpdesk/hd-9.png
  - /projects/it-helpdesk/hd-10.png
  - /projects/it-helpdesk/hd-11.png
  - /projects/it-helpdesk/hd-12.png
  - /projects/it-helpdesk/hd-13.png
  - /projects/it-helpdesk/hd-14.png
  - /projects/it-helpdesk/hd-15.png
  - /projects/it-helpdesk/hd-16.png
  - /projects/it-helpdesk/hd-17.png
  - /projects/it-helpdesk/hd-18.png
  - /projects/it-helpdesk/hd-19.png
  - /projects/it-helpdesk/hd-20.png
  - /projects/it-helpdesk/hd-21.png
  - /projects/it-helpdesk/hd-22.png
  - /projects/it-helpdesk/hd-23.png
  - /projects/it-helpdesk/hd-24.png
  - /projects/it-helpdesk/hd-25.png
metrics:
  - "2 | SLA tier (response & resolution)"
  - "4 | roles (admin, teknisi, user, view)"
---

IT Helpdesk is the internal ticketing module inside the Watsons portal: store, DC, and office users create IT tickets, technicians work them from a category-scoped queue, and SLA is measured from first response to final resolution. Every view is filtered by role.

**Role:** Fullstack developer.

## Key Features

- **Ticket lifecycle** - users create tickets with attachments; status flows Open, Accepted, User Pending, Resolved, Closed with commented history at every step.
- **Technician queue** - each technician only sees tickets from their mapped categories (their assigned tickets plus unassigned Open ones), with accept action straight from the table.
- **SLA ganda** - response SLA counts from ticket creation to first accept; resolution SLA counts from accept to resolved using leadtime per sub category, with pause time excluded.
- **Comments as conversation** - WhatsApp-style bubbles: messages from you on the right, others on the left, system events centered; the detail page polls so new messages appear without manual refresh.
- **Master data** - categories, sub categories (SLA leadtime + default priority), and technician-to-category mapping managed by admin.
- **Notifications** - separate notifications table for helpdesk: ticket created, comment added, status changed; actor never notifies themselves.
- **Role-based dashboard** - users see only their own tickets; technicians see their queue scope; admins get the full picture: top 10 technicians (tickets handled, SLA response/resolution, median times), top 10 users by status breakdown, and recent updates.

## Tech Stack

React + TypeScript (TanStack Router/Query), ASP.NET Core + EF Core + SQL Server, Recharts dashboard, shadcn-style UI.

## Engineering Highlights

- **Role-scoped everywhere** - queue, dashboard, detail access, and comment visibility are enforced server-side, not just hidden in the UI.
- **SLA computed with pause** - user-pending time is subtracted so technician performance is measured fairly.
- **Reusable UI** - sortable table headers, debounced search, status badge, skeleton loading, and confirm dialogs are shared components across all helpdesk pages.
- **Transactional updates** - status changes run in a transaction with idempotent guards and double-click protection on the frontend.

## Outcome

A complete ticketing loop: create, assign, communicate, resolve, monitor. Technicians know their queue, users know their SLA, and admins can spot bottlenecks in one dashboard.