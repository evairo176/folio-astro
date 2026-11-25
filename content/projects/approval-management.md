---
title: "Approval Management - Watsons Internal"
description: "Multi-level approval workflow engine: template-driven approval flows, per-level approvers, request tasks, and full action histories."
date: "2026-09-08"
tags: ["React", ".NET", "TypeScript", "SQL Server", "Workflow", "RBAC"]
featured: false
cover: "/projects/approval-management/queue.jpg"
images:
  - /projects/approval-management/queue.jpg
metrics:
  - "5 | entities (task/flow/request/task/history)"
  - "Auto | per-level task generation"
---

Approval Management for Watsons: a configurable multi-level approval engine. Define an approval template (task), set its flow levels and approvers, then route requests through each level with full history and email updates.

**Role:** Fullstack developer.

## Key Features

- Template-driven flows: `Task -> TaskApprovalFlow` defines levels, required approvers, and email templates per level.
- On submit, the engine creates one approval task per level (`ApprovalTask`) and tracks current level on the request.
- Approvers act (approve/reject/skip) with remarks recorded in `ApprovalHistory`.
- Statuses: Pending/Approved/Rejected/Cancelled per request; Waiting/Pending/Approved/Rejected/Skipped per task.
- Automatic numbering prefix support per template.

## Tech Stack

React + TypeScript, ASP.NET Core + EF Core, SQL Server. Entities: TaskApproval, TaskApprovalFlow, ApprovalRequest, ApprovalTask, ApprovalHistory.

## Engineering Highlights

- Clean separation: template vs instance vs task vs history - one request produces N tasks without code branching per business case.
- Works alongside the shared RBAC layer, so approval menus and actions follow the same role/permission rules as other modules.

## Outcome

A reusable approval engine that supports any multi-step sign-off flow in the company without per-workflow code.