"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { getAdminSessionUser } from "@/lib/admin-auth";
import { adminPublishPostSchema } from "@/lib/validations/admin-blog";

export type AdminPublishState = {
  ok: boolean;
  error?: string;
  success?: string;
  slug?: string;
};

function toSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function escapeFrontmatter(value: string): string {
  return value.replace(/"/g, '\\"');
}

function buildMarkdown(payload: {
  title: string;
  date: string;
  excerpt: string;
  challenge?: string;
  solution?: string;
  content: string;
}): string {
  const lines = [
    "---",
    `title: "${escapeFrontmatter(payload.title)}"`,
    `date: "${payload.date}"`,
    `excerpt: "${escapeFrontmatter(payload.excerpt)}"`,
  ];
  if (payload.challenge) lines.push(`challenge: "${escapeFrontmatter(payload.challenge)}"`);
  if (payload.solution) lines.push(`solution: "${escapeFrontmatter(payload.solution)}"`);
  lines.push("---", "", payload.content.trim(), "");
  return lines.join("\n");
}

async function publishToGithub(path: string, content: string, message: string) {
  const token = process.env.GITHUB_CONTENT_TOKEN;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  if (!token || !repo) {
    throw new Error("Missing GITHUB_CONTENT_TOKEN or GITHUB_REPO env configuration.");
  }

  const api = `https://api.github.com/repos/${repo}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const existing = await fetch(`${api}?ref=${encodeURIComponent(branch)}`, {
    method: "GET",
    headers,
    cache: "no-store",
  });

  let sha: string | undefined;
  if (existing.status === 200) {
    const body = (await existing.json()) as { sha?: string };
    sha = body.sha;
  } else if (existing.status !== 404) {
    throw new Error("Could not check existing post file in GitHub.");
  }

  const response = await fetch(api, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      sha,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub publish failed (${response.status}): ${text}`);
  }
}

export async function adminPublishPostAction(_: AdminPublishState, formData: FormData): Promise<AdminPublishState> {
  const user = await getAdminSessionUser();
  if (!user) return { ok: false, error: "Your admin session expired. Please sign in again." };

  const raw = {
    title: String(formData.get("title") ?? ""),
    date: String(formData.get("date") ?? ""),
    excerpt: String(formData.get("excerpt") ?? ""),
    challenge: String(formData.get("challenge") ?? ""),
    solution: String(formData.get("solution") ?? ""),
    content: String(formData.get("content") ?? ""),
  };

  const parsed = adminPublishPostSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return { ok: false, error: firstError ?? "Please check the form fields." };
  }

  const slug = toSlug(parsed.data.title);
  if (!slug) return { ok: false, error: "Unable to generate a slug from this title." };

  const markdown = buildMarkdown({
    ...parsed.data,
    challenge: parsed.data.challenge || undefined,
    solution: parsed.data.solution || undefined,
  });

  const contentPath = `content/blog/${slug}.md`;
  const hash = createHash("sha1").update(markdown).digest("hex").slice(0, 8);
  const message = `publish blog post: ${parsed.data.title} (${hash})`;

  try {
    await publishToGithub(contentPath, markdown, message);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to publish post.",
    };
  }

  revalidatePath("/blog");
  revalidatePath("/");
  return { ok: true, slug, success: `Published successfully as ${slug}.md` };
}

