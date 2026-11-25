import { getCollection } from "astro:content";

export interface ProjectEntry {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  featured: boolean;
  cover?: string;
  images: string[];
  metrics: string[];
  body: string;
}

export interface PostEntry {
  slug: string;
  lang: "en" | "id";
  title: string;
  description: string;
  date: string;
  tags: string[];
  body: string;
}

/**
 * Entry ids are slugified from the filename, so `foo.id.md` may arrive as
 * `foo.id`, `fooid`, or `foo-id` depending on the loader version. The source
 * file path is unambiguous: derive both slug and language from it and leave the
 * id untouched, which keeps every entry unique at load time.
 */
function postLang(p: { filePath?: string }): "en" | "id" {
  return (p.filePath ?? "").endsWith(".id.md") ? "id" : "en";
}

function postSlug(p: { filePath?: string; id: string }): string {
  const fp = p.filePath ?? "";
  const base = fp.split("/").pop() ?? "";
  if (base) return base.replace(/\.id\.mdx?$/, "").replace(/\.mdx?$/, "");
  return p.id.replace(/\.id$/, "");
}

export async function getProjects(): Promise<ProjectEntry[]> {
  const all = await getCollection("projects");
  return all
    .map((p) => ({
      slug: p.id,
      title: p.data.title,
      description: p.data.description,
      date: p.data.date,
      tags: p.data.tags,
      featured: p.data.featured,
      cover: p.data.cover,
      images: p.data.images,
      metrics: p.data.metrics,
      body: p.body ?? "",
    }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getPosts(): Promise<PostEntry[]> {
  const all = await getCollection("blog");
  return all
    .map((p) => {
      const lang = postLang(p);
      return {
        slug: postSlug(p),
        lang,
        title: p.data.title,
        description: p.data.description,
        date: p.data.date,
        tags: p.data.tags,
        body: p.body ?? "",
      };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * One URL per slug. English is canonical when a translation exists, matching
 * the previous site's behaviour, with Indonesian served on the same path.
 */
export function uniqueSlugs(posts: PostEntry[]): string[] {
  return [...new Set(posts.map((p) => p.slug))];
}

export function pickPost(posts: PostEntry[], slug: string, lang: "en" | "id" = "en"): PostEntry | undefined {
  const candidates = posts.filter((p) => p.slug === slug);
  return candidates.find((p) => p.lang === lang) ?? candidates[0];
}

export function estimateReadMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
