---
title: "Validating Thousands of Land Plots in the Browser with Turf.js"
description: "Geospatial plot validation for an EUDR compliance platform: area, intersection, and self-intersection checks on hundreds of plantation blocks, client-side."
date: "2026-04-28"
tags: ["GIS", "Turf.js", "Performance", "React"]
lang: "en"
---

The EU Deforestation Regulation requires operators to attach geolocation evidence to every shipment, polygons of the land each commodity came from. For a plantation spanning 500+ blocks, that means thousands of plot geometries, and every one of them has to be valid before it can back a Due Diligence Statement. Here is how I handled that validation client-side with [Turf.js](https://turfjs.org), on the [EUDR Compliance Platform](https://folio.evairo.fun/projects/eudr-compliance).

## What "Valid" Actually Means

A plot polygon can be wrong in ways that are invisible to the eye but fatal to compliance:

- **Self-intersecting** (a bowtie) — the ring crosses itself, so its area is undefined.
- **Wrong winding order** — exterior rings should follow a consistent orientation; some tools emit reversed rings.
- **Zero or implausible area** — a "plot" of 2 square meters or 90,000 hectares is almost certainly a data-entry error.
- **Overlapping plots** — two blocks claiming the same land double-counts production.
- **Points outside their parent boundary** — a plot that falls outside the estate it belongs to.

## Why Client-Side

The obvious instinct is to validate on the server with PostGIS. I do persist and cross-check there too, but the first pass runs in the browser, and that was a deliberate call:

- **Instant feedback.** A field officer uploading a GeoJSON sees the bowtie highlighted on the map immediately, no round trip.
- **Cheaper server.** Malformed geometry never reaches the backend; it gets caught and fixed at the edge.
- **Map-native.** The data is already rendered on a Leaflet map, so running the checks where the geometry lives is natural.

## The Turf.js Toolkit

Turf is a collection of small, composable geospatial functions. The ones that did the heavy lifting:

- `area` — square meters of a polygon, for the plausibility band.
- `booleanPointInPolygon` — is this plot point inside its estate boundary?
- `intersect` / `booleanDisjoint` — do two plots overlap?
- `unkinkPolygon` — splits a self-intersecting polygon into valid pieces, which doubles as bowtie detection: if unkinking changes the geometry, it had a self-intersection.
- `rewind` — normalizes ring winding order to a consistent orientation.
- `centroid` / `buffer` — for labeling and proximity checks.

A rough shape of the validation pass:

```ts
import area from "@turf/area";
import unkinkPolygon from "@turf/unkink-polygon";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

function validatePlot(plot, estateBoundary) {
  const issues = [];

  const ha = area(plot) / 10_000;
  if (ha < 0.01 || ha > 10_000) issues.push(`Implausible area: ${ha.toFixed(2)} ha`);

  const unkinked = unkinkPolygon(plot);
  if (unkinked.features.length > 1) issues.push("Self-intersecting polygon");

  const center = centroid(plot);
  if (!booleanPointInPolygon(center, estateBoundary))
    issues.push("Plot falls outside its estate boundary");

  return issues;
}
```

## The Performance Wall

Pairwise overlap checking is O(n²). With a few hundred plots that is tens of thousands of `intersect` calls, and `intersect` is not cheap. The naive version locked the main thread for seconds.

Two fixes brought it back under control:

1. **Spatial index first.** Before any expensive intersect, I bucket plots into a spatial index (an R-tree via `rbush`/`flatbush`) and only test pairs whose bounding boxes actually overlap. That turns O(n²) into something close to O(n log n) for realistic, mostly-disjoint data.
2. **Bounding-box pre-filter.** Even within candidate pairs, a quick bbox-overlap test rejects most non-overlaps before the polygon-level `intersect` runs.

```ts
// Only run the expensive intersect on bbox-overlapping candidates.
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

## Takeaway

GIS validation looks like a backend job, but pushing the first pass into the browser gave field teams instant feedback and kept malformed data out of the database entirely. The catch is performance: the moment you do anything pairwise across hundreds of geometries, you need a spatial index, not a double loop. Turf gives you the primitives; the engineering is in not calling them n² times.
