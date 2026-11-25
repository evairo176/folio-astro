---
title: "Memangkas Laporan ETL dari 4 Jam Menjadi 10 Menit"
description: "Bagaimana saya membangun ulang data warehouse analitik perkebunan dengan Spark dan Airflow untuk memproses 5J+ record per bulan dan mengubah laporan semalaman jadi pekerjaan secangkir kopi."
date: "2026-03-15"
tags: ["Data Engineering", "Apache Spark", "Airflow", "ETL"]
lang: "id"
---

Di KPN Plantation saya memegang data warehouse analitik produksi yang memberi makan analisis yield level-blok di seluruh estate perusahaan. Pipeline-nya memproses 5J+ record per bulan, dan ketika saya mewarisi alur pelaporannya, menghasilkan satu laporan analitik butuh sekitar **empat jam**. Pada akhirnya ia berjalan dalam **di bawah sepuluh menit**. Berikut yang benar-benar menggerakkan jarum, dan itu bukan "tambah worker saja."

## Titik Awal

Laporan asli adalah rantai panjang query SQL berurutan terhadap database operasional, dijahit oleh script yang berjalan semalaman. Ia lambat karena tiga alasan yang saling menumpuk:

1. **Ia menghantam database OLTP.** Scan analitik bersaing dengan beban transaksional live, jadi harus berjalan malam hari dan tetap berat.
2. **Ia menghitung ulang semuanya setiap kali.** Tanpa state antara, tanpa incremental load, setiap run memproses ulang seluruh histori.
3. **Ia single-threaded.** Satu query selesai sebelum berikutnya mulai, bahkan saat mereka independen.

## Langkah 1: Pisahkan Analitik dari Operasional

Perbaikan pertama bersifat arsitektural, bukan tuning performa. Saya memindahkan beban analitik keluar dari database operasional ke warehouse khusus. Sistem operasional tetap melayani transaksi; warehouse memegang scan berat. Ini saja menghapus batasan "jalankan malam hari agar tidak melukai produksi".

## Langkah 2: Spark untuk Beban Berat

Lapisan transformasi pindah ke **Apache Spark (PySpark)**. Kemenangannya bukan sihir, tapi paralelisme plus model eksekusi yang lebih baik:

- Transformasi independen berjalan lintas partisi alih-alih satu set baris pada satu waktu.
- Query planner Spark mendorong filter ke bawah dan menghindari mematerialisasi hasil antara yang tak ia butuhkan.
- Agregasi lebar (yield per blok, per periode, per varietas) terparalelkan secara alami.

Jebakan yang saya tabrak lebih awal: **data skew**. Segelintir estate besar memegang mayoritas record, jadi mempartisi berdasarkan estate membuat beberapa worker melakukan semua pekerjaan sementara sisanya menganggur. Mempartisi ulang pada composite key berkardinalitas lebih tinggi (estate + blok + periode) meratakan beban dan jadi salah satu percepatan terbesar.

## Langkah 3: Incremental, Bukan Reload Penuh

Menghitung ulang lima juta record bulanan padahal hanya periode terbaru yang berubah itu boros. Saya pindah ke incremental load: ingest periode baru, transformasi hanya yang berubah, dan append ke warehouse. Partisi historis dihitung sekali lalu dibiarkan.

Di sinilah sebagian besar peningkatan 4-jam-jadi-10-menit benar-benar berasal. Paralelisme membuat run penuh lebih cepat; **tidak menjalankan run penuh** membuatnya lenyap.

## Langkah 4: Airflow untuk Orkestrasi

Script-yang-jalan-semalaman menjadi **Airflow DAG**. Itu memberi saya:

- **Dependensi eksplisit.** Task yang bisa paralel berjalan paralel; yang bergantung pada lainnya menunggu. DAG membuat critical path sebenarnya terlihat.
- **Retry dan idempotensi.** Task yang gagal mencoba ulang sendiri alih-alih menggagalkan seluruh run jam 3 pagi.
- **Observabilitas.** Saat run lambat, tampilan Gantt menunjukkan persis task mana yang jadi bottleneck, bukan menebak di dalam script monolitik.
- **Backfill.** Memproses ulang periode historis adalah run DAG yang diparameterkan, bukan script yang diedit tangan.

## Langkah 5: Sajikan

Output mendarat di PostgreSQL dan muncul lewat dashboard Streamlit untuk analisis yield level-blok, jadi orang yang butuh angkanya mendapat tampilan interaktif alih-alih PDF semalaman yang statis.

## Yang Akan Saya Katakan ke Diri Saya di Masa Lalu

- **Arsitektur mengalahkan tuning.** Memisahkan analitik dari operasional dan beralih incremental berbuat lebih banyak daripada flag config Spark mana pun.
- **Waspadai skew.** Partisi tak rata membuat paralelisme jadi bohong. Partisi pada sesuatu berkardinalitas tinggi.
- **Pekerjaan tercepat adalah yang tidak Anda jalankan.** Pemrosesan incremental adalah kunci sebenarnya; reload penuh adalah biaya yang sesungguhnya.
- **Orkestrasi adalah observabilitas.** Airflow tidak membuat task lebih cepat, tapi ia memberi tahu saya task mana yang harus dipercepat.

Mengubah pekerjaan semalaman jadi pekerjaan secangkir kopi bukan satu trik pintar. Itu menghilangkan kontensi, menghentikan pekerjaan redundan, memparalelkan sisanya, dan mengorkestrasinya agar bottleneck selalu terlihat.
