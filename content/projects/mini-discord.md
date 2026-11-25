---
title: "Mini Discord — Real-Time Chat Platform"
description: "A full-stack Discord clone: servers, role-based members, text/audio/video channels, real-time messaging, 1:1 direct messages, file sharing, and live voice/video rooms. Built on Next.js 13 App Router with Socket.io and LiveKit."
date: "2024-01-01"
tags: ["Next.js 13", "TypeScript", "Prisma", "MySQL", "Socket.io", "LiveKit", "Clerk", "TanStack Query", "Tailwind"]
repo: "https://github.com/evairo176/pp-discord"
featured: true
images:
  - /projects/mini-discord/image-1.png
---

A full-stack **Discord clone**: create servers, invite members with roles, chat in real time across text channels, share files, DM other members one-on-one, and jump into live audio/video rooms, all in the browser.

**Repo:** [github.com/evairo176/pp-discord](https://github.com/evairo176/pp-discord)

## Overview

Mini Discord rebuilds the core of a modern team-chat app from the ground up. It models the full Discord domain, profiles, servers, members, channels, messages, and conversations, and layers real-time messaging and WebRTC voice/video on top, with proper authentication and role-based permissions throughout.

## Key Features

### Servers & Invites
- Create and customize servers (name + image).
- Unique invite codes for joining servers.
- Server settings, member management, and leave/delete flows.

### Channels
- Three channel types: **text, audio, and video**.
- Create, edit, and delete channels with permission checks.
- Channel-scoped messaging with infinite scroll.

### Role-Based Members
- Member roles: **ADMIN**, **MODERATOR**, and **GUEST**.
- Role-gated actions (manage members, kick, change roles, moderate messages).
- Admin/moderator controls surfaced contextually in the UI.

### Real-Time Messaging
- Live message delivery via **Socket.io** (no refresh).
- Edit and soft-delete messages in real time.
- Emoji picker (`emoji-mart`) and file attachments.
- Infinite-loading message history with TanStack Query.

### Direct Messages
- 1:1 conversations between members across a shared server.
- Real-time direct messages with the same edit/delete and file support.

### Voice & Video
- Live audio and video rooms powered by **LiveKit** (WebRTC), server SDK + React components.
- Join/leave calls directly from audio/video channels.

### File Sharing & Media
- File and image uploads via **UploadThing**.
- Attachment previews inside the message stream.

### Polish
- Light/dark mode (`next-themes`).
- Responsive layout with a command palette (`cmdk`).
- Built on shadcn/ui + Radix primitives.

## Architecture

A single **Next.js 13 (App Router)** application handling both UI and API:

- **Auth:** Clerk for authentication and user profiles, synced into a local `Profile` record.
- **Data model (Prisma + MySQL):** `Profile`, `Server`, `Member` (with `MemberRole` enum), `Channel` (with `ChannelType` enum), `Message`, `Conversation`, and `DirectMessage`, all with cascade deletes and indexed relations.
- **Real-time:** a Socket.io server running alongside Next.js for live message/DM events.
- **Media plane:** LiveKit for WebRTC audio/video; UploadThing for file uploads.
- **Client state:** TanStack Query for server state and infinite scroll, Zustand for modal/UI state, React Hook Form + Zod for forms and validation.

## Tech Stack

- **Framework:** Next.js 13 (App Router), React 18, TypeScript.
- **Auth:** Clerk (`@clerk/nextjs`).
- **Database / ORM:** MySQL + Prisma 5.
- **Real-time:** Socket.io (client + server).
- **Voice/Video:** LiveKit (`livekit-client`, `livekit-server-sdk`, `@livekit/components-react`).
- **Uploads:** UploadThing.
- **UI/State:** shadcn/ui + Radix, Tailwind CSS, TanStack Query, Zustand, React Hook Form + Zod, emoji-mart, `next-themes`, `cmdk`.

## Engineering Challenges & Solutions

- **Real-time consistency** — messages and DMs must appear, update, and delete instantly for every participant. Solved with a Socket.io event layer that broadcasts mutations, paired with TanStack Query infinite scroll for history.
- **Role-based authorization** — every server action is gated by member role (ADMIN/MODERATOR/GUEST), enforced both server-side and in the UI so guests can't perform privileged operations.
- **WebRTC voice/video** — integrated LiveKit for audio/video rooms tied to channel type, handling token generation server-side and call lifecycle on the client.
- **Relational integrity** — the Prisma schema uses cascade deletes and explicit self-relations (member-to-member conversations) so removing a server, channel, or member cleans up cleanly without orphaned data.

## Outcome

A feature-complete real-time chat platform that mirrors Discord's core experience, multi-server, role-aware, with live text, direct messages, file sharing, and WebRTC voice/video, demonstrating end-to-end full-stack work across auth, relational data modeling, real-time systems, and media streaming.
