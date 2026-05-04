import { readFile, readdir } from "fs/promises";
import path from "path";
import matter from "gray-matter";
import { z } from "zod";

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

export function formatBlogDate(iso: string, month: "short" | "long" = "short"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month,
    day: "numeric",
  }).format(d);
}

const frontmatterSchema = z.object({
  title: z.string().trim().min(1, "title required"),
  date: z.string().trim().min(1, "date required"),
  excerpt: z.string().trim().min(1, "excerpt required"),
  /** Short label: the buyer problem this post discusses */
  challenge: z.string().trim().optional(),
  /** Short label: how LandVerify (or structured verification) addresses it */
  solution: z.string().trim().optional(),
});

export type BlogPostMeta = z.infer<typeof frontmatterSchema> & { slug: string };

export type BlogPostSummary = BlogPostMeta;

export type BlogPost = BlogPostMeta & { content: string };

function slugFromFilename(filename: string): string {
  return filename.replace(/\.md$/i, "");
}

async function parseMarkdownFile(filePath: string, slug: string): Promise<BlogPost | null> {
  const raw = await readFile(filePath, "utf-8");
  const { data, content } = matter(raw);
  const parsed = frontmatterSchema.safeParse(data);
  if (!parsed.success) {
    console.warn(`[blog] Invalid frontmatter in ${filePath}:`, parsed.error.flatten().fieldErrors);
    return null;
  }
  return {
    slug,
    ...parsed.data,
    content: content.trim(),
  };
}

/** All valid posts, newest first */
export async function getAllPosts(): Promise<BlogPost[]> {
  let names: string[] = [];
  try {
    names = await readdir(BLOG_DIR);
  } catch {
    return [];
  }
  const mdFiles = names.filter((n) => n.endsWith(".md"));
  const posts: BlogPost[] = [];
  for (const name of mdFiles) {
    const slug = slugFromFilename(name);
    const full = path.join(BLOG_DIR, name);
    const post = await parseMarkdownFile(full, slug);
    if (post) posts.push(post);
  }
  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return posts;
}

export async function getPostSummaries(): Promise<BlogPostSummary[]> {
  const posts = await getAllPosts();
  return posts.map(({ slug, title, date, excerpt, challenge, solution }) => ({
    slug,
    title,
    date,
    excerpt,
    challenge,
    solution,
  }));
}

export async function getLatestPostSummaries(limit: number): Promise<BlogPostSummary[]> {
  const all = await getPostSummaries();
  return all.slice(0, Math.max(0, limit));
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  if (!/^[a-z0-9-]+$/i.test(slug)) return null;
  const filePath = path.join(BLOG_DIR, `${slug}.md`);
  try {
    return await parseMarkdownFile(filePath, slug);
  } catch {
    return null;
  }
}

export async function getAllPostSlugs(): Promise<string[]> {
  const posts = await getAllPosts();
  return posts.map((p) => p.slug);
}
