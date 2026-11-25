---
title: "All Management / Admin Portal - Watsons Internal"
description: "Central admin portal and shared foundation: projects, users, roles, modules, permissions (RBAC), email settings, and system-wide observability."
date: "2026-09-10"
tags: ["React", ".NET", "TypeScript", "SQL Server", "RBAC", "Admin"]
featured: false
cover: "/projects/all-management/image-1.png"
images:
  - /projects/all-management/image-1.png
  - /projects/all-management/image-2.png
  - /projects/all-management/image-3.png
  - /projects/all-management/image-4.png
  - /projects/all-management/image-5.png
  - /projects/all-management/image-6.png
  - /projects/all-management/image-7.png
  - /projects/all-management/image-8.png
  - /projects/all-management/image-9.png
  - /projects/all-management/image-10.png
  - /projects/all-management/image-11.png
  - /projects/all-management/image-12.png
  - /projects/all-management/image-13.png
  - /projects/all-management/image-14.png
  - /projects/all-management/image-15.png
metrics:
  - "1 | shared auth/RBAC foundation"
  - "5 | modules on one portal"
---

All Management is the central admin layer for the Watsons internal portal: one login, one set of users, and project-scoped roles/permissions across all modules (Voucher, Complaint, Approval, IT Helpdesk).

**Role:** Fullstack developer.

## Key Features

- **Per-project modules** - setiap project (mis. Voucher, Complaint, Approval, dst.) punya daftar module sendiri-sendiri; admin manage modules per project dari satu halaman pusat.
- **Per-project roles & permissions** - role dan permission (CRUD per module) didefinisikan per project, bukan global; RBAC matrix menampilkan Role × Module × CRUD per project.
- **User assignment lintas project** - satu user bisa di-assign ke banyak project sekaligus, dengan role yang berbeda di tiap project (contoh: jadi 'Admin' di complaint-dashboard tapi 'Viewer' di project lain).
- **Central auth & RBAC foundation** - satu login, satu sumber data user, aturan akses dibaca dari tabel yang sama untuk sidebar menu dan autorisasi API.
- **Email settings & templates** - konfigurasi SMTP, manajemen template email dengan placeholder, dan history pengiriman.
- **Observability** - activity logs, error logs dengan status penyelesaian, dan health checks.

## Tech Stack

React + TypeScript (TanStack Router/Query), ASP.NET Core + EF Core + SQL Server, JWT auth, SMTP.

## Engineering Highlights

- **RBAC per project** - tiap project punya role & permission CRUD sendiri; assignment user disimpan per project (`user_project_roles`), jadi role di project A tidak memengaruhi project B.
- **Satu sumber kebenaran** - sidebar visibility dan autorisasi API membaca tabel RBAC yang sama; tanpa hardcode role-string di komponen.
- **Self-healing seeders** - module & permission disinkronkan ulang saat startup, jadi role yang dicabut (mis. StoreOps tak lagi melihat Aging & SLA) tetap tercabut setelah redeploy.

## Outcome

One foundation that makes every business module consistent: same login, same permission model, same audit trail.