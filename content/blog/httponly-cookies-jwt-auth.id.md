---
title: "Kenapa httpOnly Cookie Mengalahkan localStorage untuk Auth JWT"
description: "Bagaimana saya membangun alur auth terdistribusi untuk microservice ProFlow memakai rotating refresh token di httpOnly cookie, dan kenapa localStorage tidak pernah jadi pilihan."
date: "2026-05-20"
tags: ["Security", "Authentication", "Microservices", "Node.js"]
lang: "id"
---

Saat membangun lapisan autentikasi untuk [ProFlow](https://pms.evairo.fun), sebuah SaaS manajemen proyek yang berjalan di atas sembilan microservice, keputusan pertama adalah di mana menyimpan JWT. Jawaban populer di tutorial adalah `localStorage`. Saya memilih jalan sebaliknya: **httpOnly cookie**. Berikut alasannya, beserta tradeoff yang menyertainya.

## Masalah dengan localStorage

`localStorage` itu praktis. Login, simpan token, tempelkan ke header `Authorization` di setiap request. Beres dalam lima menit.

Tapi ia juga bisa dibaca oleh JavaScript apa pun yang berjalan di halaman. Artinya satu celah XSS, satu dependency npm yang dikompromikan, satu script yang disuntikkan, langsung menyerahkan access token Anda ke penyerang. Tidak ada proteksi level browser. Token duduk di key-value store yang bisa dibaca `document` kapan saja.

Untuk tool B2B di mana token bocor berarti akses ke seluruh workspace proyek sebuah tenant, risiko itu tidak bisa diterima.

## Pendekatan httpOnly

httpOnly cookie tidak bisa dibaca JavaScript. Browser menyimpannya, menempelkannya otomatis ke request untuk domain yang cocok, dan `document.cookie` sama sekali tidak melihatnya. Dikombinasikan dengan `Secure` (HTTPS saja) dan `SameSite`, Anda menghapus seluruh kelas serangan pencurian-token-via-XSS.

Bentuk token yang saya pakai:

- **Access token** — berumur pendek (15 menit), JWT, dikirim sebagai httpOnly cookie.
- **Refresh token** — berumur panjang (30 hari), rotating, juga httpOnly, disimpan di sisi server dengan referensi agar bisa dicabut.

```
Set-Cookie: access_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Max-Age=900
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=2592000
```

## Rotating Refresh Token

Refresh token statis yang hidup 30 hari adalah liabilitas. Saya merotasinya: setiap kali klien memakai refresh token untuk mencetak access token baru, server menerbitkan refresh token yang benar-benar baru dan membatalkan yang lama.

Ini memberi Anda **reuse detection**. Jika refresh token lama pernah dipakai lagi, itu berarti replay atau token dicuri, sehingga server mencabut seluruh keluarga token dan memaksa login ulang. User sah kehilangan satu sesi; penyerang terkunci.

## Tantangan Microservice

Bagian sulitnya bukan cookie-nya. Tapi membuat cookie bekerja melintasi sembilan service yang di-deploy independen di balik satu API gateway.

Frontend bicara ke tepat satu endpoint: gateway di port 3300. Gateway meneruskan request, lengkap dengan cookie, ke service yang tepat. Saat auth service menerbitkan `Set-Cookie` ketika refresh token, gateway harus me-relay header itu kembali ke browser, tanpa diubah. Lewatkan relay itu dan klien diam-diam terus memakai token kedaluwarsa sampai semuanya 401.

Aturan yang membuatnya andal:

- **Satu domain cookie.** Semuanya ada di balik `api.*`, jadi satu cookie meliputi setiap service.
- **Gateway transparan untuk header auth.** Ia meneruskan `Cookie` masuk dan me-relay `Set-Cookie` keluar tanpa menulis ulang.
- **Tiap service memvalidasi JWT secara independen** dengan shared secret, tanpa panggilan balik ke auth di setiap request.

## Tradeoff (Harus Jujur)

httpOnly tidak gratis:

- **CSRF jadi masalah Anda.** Cookie dikirim otomatis, jadi Anda butuh `SameSite=Strict`/`Lax` dan, untuk mutasi sensitif, token CSRF. localStorage + header auth menghindari CSRF sepenuhnya. Anda menukar satu permukaan serangan dengan yang lain, dan XSS adalah yang lebih buruk.
- **CORS jadi rewel.** Request cross-origin butuh `credentials: "include"` di klien dan `Access-Control-Allow-Credentials` dengan origin eksak di server. Wildcard origin tidak diizinkan dengan credentials.
- **Klien mobile/native** tidak bisa bersandar pada penanganan cookie browser, jadi Anda mungkin butuh jalur token kedua untuk mereka.

## Cara Saya Memverifikasinya

Auth adalah jenis kode yang rusak diam-diam. Saya menulis suite E2E Playwright, 31 test, termasuk regression khusus untuk alur cookie: login men-set cookie, `/me` membacanya, refresh merotasinya, logout menghapusnya, dan token yang dicabut ditolak. Seluruh rantai harus hijau sebelum apa pun di-deploy.

## Kesimpulan

Jika aplikasi Anda berjalan di browser dan token dicuri adalah masalah nyata, default-kan ke httpOnly cookie dengan access token berumur pendek dan rotating refresh token. Anda menanggung kompleksitas CSRF dan CORS, tapi Anda menghapus jalur pencurian-token-via-XSS sepenuhnya, dan itu pertukaran yang layak untuk apa pun yang menangani data user nyata.
