// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";

// Static output only: every route is prerendered to real HTML at build time,
// which is exactly what was missing from the TanStack SPA build (the crawlable
// content lived in <noscript> and Googlebot dropped it).
export default defineConfig({
  site: "https://folio.evairo.fun",
  output: "static",
  trailingSlash: "ignore",
  build: { format: "directory" },
  integrations: [
    sitemap({
      // Blog posts exist in two languages at the same URL shape; the .id
      // variant is rendered from the same route, so only the canonical URL set
      // goes into the sitemap.
      filter: (page) => !page.includes("/404"),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
