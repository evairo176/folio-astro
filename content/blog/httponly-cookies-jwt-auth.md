---
title: "Why httpOnly Cookies Beat localStorage for JWT Auth"
description: "How I built a distributed auth flow for ProFlow's microservices using rotating refresh tokens in httpOnly cookies, and why localStorage was never an option."
date: "2026-05-20"
tags: ["Security", "Authentication", "Microservices", "Node.js"]
lang: "en"
---

When I built the authentication layer for [ProFlow](https://pms.evairo.fun), a project-management SaaS running on nine microservices, the very first decision was where to store the JWT. The popular answer in tutorials is `localStorage`. I went the other way: **httpOnly cookies**. Here is the reasoning, and the tradeoffs that come with it.

## The Problem With localStorage

`localStorage` is convenient. You log in, you stash the token, you attach it to an `Authorization` header on every request. It works in five minutes.

It is also readable by any JavaScript running on the page. That means a single XSS hole, one compromised npm dependency, one injected script, hands your access token to an attacker. There is no browser-level protection. The token sits in a key-value store that `document` can read at will.

For a B2B tool where a leaked token means access to a tenant's entire project workspace, that risk is not acceptable.

## The httpOnly Approach

An httpOnly cookie cannot be read by JavaScript. The browser stores it, attaches it automatically to requests for the matching domain, and `document.cookie` simply does not see it. Combined with `Secure` (HTTPS only) and `SameSite`, you remove the entire class of token-theft-via-XSS attacks.

The token shape I settled on:

- **Access token** — short-lived (15 minutes), JWT, sent as an httpOnly cookie.
- **Refresh token** — long-lived (30 days), rotating, also httpOnly, stored server-side with a reference so it can be revoked.

```
Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=900
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=2592000
```

## Rotating Refresh Tokens

A static refresh token that lives for 30 days is a liability. I rotate it: every time a client uses the refresh token to mint a new access token, the server issues a brand-new refresh token and invalidates the old one.

This gives you **reuse detection**. If an old refresh token is ever presented again, that means either a replay or a stolen token, so the server revokes the entire token family and forces re-login. The legitimate user loses one session; the attacker is locked out.

## The Microservice Twist

The hard part was not the cookie. It was making cookies work across nine independently deployed services behind an API gateway.

The frontend talks to exactly one endpoint: the gateway on port 3300. The gateway forwards the request, cookies and all, to the right service. When the auth service issues a `Set-Cookie` on token refresh, the gateway has to relay that header back out to the browser, untouched. Miss that relay and the client silently keeps using an expired token until everything 401s.

The rules that made it reliable:

- **One cookie domain.** Everything sits behind `api.*`, so one cookie covers every service.
- **Gateway is transparent for auth headers.** It forwards `Cookie` in and relays `Set-Cookie` out without rewriting.
- **Each service validates the JWT independently** with a shared secret, no chatty back-to-auth call on every request.

## Tradeoffs (Be Honest)

httpOnly is not free:

- **CSRF becomes your problem.** Cookies are sent automatically, so you need `SameSite=Strict`/`Lax` and, for sensitive mutations, a CSRF token. localStorage + header auth sidesteps CSRF entirely. You are trading one attack surface for another, and XSS is the worse one.
- **CORS gets fiddly.** Cross-origin requests need `credentials: "include"` on the client and exact-origin `Access-Control-Allow-Credentials` on the server. Wildcard origins are not allowed with credentials.
- **Mobile/native clients** can't lean on browser cookie handling, so you may need a second token path for them.

## How I Verified It

Auth is exactly the kind of code that breaks silently. I wrote a Playwright E2E suite, 31 tests, including a dedicated regression for the cookie flow: login sets the cookie, `/me` reads it, refresh rotates it, logout clears it, and a revoked token is rejected. The full chain has to go green before anything deploys.

## Takeaway

If your app runs in a browser and a stolen token is a real problem, default to httpOnly cookies with short-lived access tokens and rotating refresh tokens. You take on CSRF and CORS complexity, but you delete the XSS token-theft path entirely, and that is the trade worth making for anything handling real user data.
