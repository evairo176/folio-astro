import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Frontmatter is authored by hand and some entries leave list keys empty (only
// comments under the key), which YAML parses as null. Coerce those to [] so the
// build does not fail on an otherwise valid entry.
const stringList = z
  .array(z.string())
  .nullish()
  .transform((v) => (v ?? []).filter(Boolean))
  .default([]);

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/projects" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.string(),
    company: z.string().optional(),
    tags: stringList,
    featured: z.boolean().default(false),
    cover: z.string().optional(),
    images: stringList,
    metrics: stringList,
    role: z.string().optional(),
    stack: stringList,
    url: z.string().optional(),
    repo: z.string().optional(),
    status: z.string().optional(),
  }),
});

// `<slug>.md` is English, `<slug>.id.md` is Indonesian. Both must stay distinct
// entries (same id would silently drop one), so ids keep the `.id` marker and
// the page layer maps both onto one shared /blogs/<slug> route.
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.string(),
    tags: stringList,
    lang: z.enum(["en", "id"]).default("en"),
  }),
});

export const collections = { projects, blog };
