---
title: "Memvalidasi Ribuan Plot Lahan di Browser dengan Turf.js"
description: "Validasi plot geospasial untuk platform EUDR compliance: cek luas, irisan, dan self-intersection pada ratusan blok perkebunan, langsung di sisi klien."
date: "2026-04-28"
tags: ["GIS", "Turf.js", "Performance", "React"]
lang: "id"
---

EU Deforestation Regulation mewajibkan operator melampirkan bukti geolokasi ke setiap pengiriman, poligon lahan asal setiap komoditas. Untuk perkebunan yang membentang di 500+ blok, itu berarti ribuan geometri plot, dan setiap satunya harus valid sebelum bisa menopang Due Diligence Statement. Berikut cara saya menangani validasi itu di sisi klien dengan [Turf.js](https://turfjs.org), pada [EUDR Compliance Platform](https://folio.evairo.fun/projects/eudr-compliance).

## Apa Arti "Valid" Sebenarnya

Poligon plot bisa salah dengan cara yang tak kasat mata tapi fatal untuk kepatuhan:

- **Self-intersecting** (bentuk dasi kupu-kupu) — ring memotong dirinya sendiri, sehingga luasnya tak terdefinisi.
- **Winding order salah** — ring luar harus mengikuti orientasi konsisten; sebagian tool menghasilkan ring terbalik.
- **Luas nol atau tak masuk akal** — "plot" seluas 2 meter persegi atau 90.000 hektar hampir pasti salah input.
- **Plot saling tumpang tindih** — dua blok mengklaim lahan yang sama membuat produksi dihitung ganda.
- **Titik di luar batas induknya** — plot yang jatuh di luar estate tempatnya bernaung.

## Kenapa di Sisi Klien

Insting yang jelas adalah memvalidasi di server dengan PostGIS. Saya memang tetap menyimpan dan cross-check di sana juga, tapi pass pertama berjalan di browser, dan itu keputusan sengaja:

- **Umpan balik instan.** Petugas lapangan yang mengunggah GeoJSON langsung melihat bowtie disorot di peta, tanpa round trip.
- **Server lebih murah.** Geometri rusak tidak pernah mencapai backend; tertangkap dan diperbaiki di tepi.
- **Native peta.** Datanya sudah dirender di peta Leaflet, jadi menjalankan cek di tempat geometri berada itu wajar.

## Toolkit Turf.js

Turf adalah kumpulan fungsi geospasial kecil yang bisa dikomposisi. Yang paling berperan:

- `area` — meter persegi sebuah poligon, untuk pita kewajaran.
- `booleanPointInPolygon` — apakah titik plot ini di dalam batas estate-nya?
- `intersect` / `booleanDisjoint` — apakah dua plot tumpang tindih?
- `unkinkPolygon` — memecah poligon self-intersecting jadi bagian valid, yang sekaligus jadi deteksi bowtie: jika unkink mengubah geometri, berarti tadinya ada self-intersection.
- `rewind` — menormalkan winding order ke orientasi konsisten.
- `centroid` / `buffer` — untuk pelabelan dan cek kedekatan.

Bentuk kasar pass validasinya:

```ts
import area from "@turf/area";
import unkinkPolygon from "@turf/unkink-polygon";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

function validatePlot(plot, estateBoundary) {
  const issues = [];

  const ha = area(plot) / 10_000;
  if (ha < 0.01 || ha > 10_000) issues.push(`Luas tak masuk akal: ${ha.toFixed(2)} ha`);

  const unkinked = unkinkPolygon(plot);
  if (unkinked.features.length > 1) issues.push("Poligon self-intersecting");

  const center = centroid(plot);
  if (!booleanPointInPolygon(center, estateBoundary))
    issues.push("Plot jatuh di luar batas estate-nya");

  return issues;
}
```

## Tembok Performa

Pengecekan overlap berpasangan itu O(n²). Dengan beberapa ratus plot, itu puluhan ribu panggilan `intersect`, dan `intersect` tidak murah. Versi naif mengunci main thread selama beberapa detik.

Dua perbaikan mengembalikannya ke kendali:

1. **Spatial index dulu.** Sebelum intersect mahal apa pun, saya membucket plot ke spatial index (R-tree via `rbush`/`flatbush`) dan hanya menguji pasangan yang bounding box-nya benar-benar tumpang tindih. Itu mengubah O(n²) jadi mendekati O(n log n) untuk data realistis yang mayoritas terpisah.
2. **Pra-filter bounding box.** Bahkan di antara pasangan kandidat, tes cepat overlap-bbox menolak sebagian besar non-overlap sebelum `intersect` level-poligon berjalan.

```ts
// Hanya jalankan intersect mahal pada kandidat yang bbox-nya overlap.
const tree = new Flatbush(plots.length);
for (const p of plots) tree.add(...bbox(p));
tree.finish();

for (let i = 0; i < plots.length; i++) {
  for (const j of tree.search(...bbox(plots[i]))) {
    if (j <= i) continue;
    if (intersect(plots[i], plots[j])) flagOverlap(i, j);
  }
}
```

## Kesimpulan

Validasi GIS terlihat seperti pekerjaan backend, tapi mendorong pass pertama ke browser memberi tim lapangan umpan balik instan dan menjaga data rusak keluar dari database sepenuhnya. Tangkapannya adalah performa: begitu Anda melakukan apa pun secara berpasangan di ratusan geometri, Anda butuh spatial index, bukan double loop. Turf memberi Anda primitif-nya; engineering-nya ada pada tidak memanggilnya n² kali.
