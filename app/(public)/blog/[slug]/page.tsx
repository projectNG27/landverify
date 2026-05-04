import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogMarkdown } from "@/components/blog/BlogMarkdown";
import { formatBlogDate, getAllPostSlugs, getPostBySlug } from "@/lib/blog";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Article" };
  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="text-center text-sm font-semibold text-[var(--lv-primary)]">
        <Link href="/blog" className="hover:underline">
          Insights
        </Link>
      </p>
      <header className="mt-4 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--lv-ink)] sm:text-4xl">{post.title}</h1>
        <time dateTime={post.date} className="mt-3 block text-sm text-[var(--lv-ink-muted)]">
          {formatBlogDate(post.date, "long")}
        </time>
        {(post.challenge || post.solution) && (
          <div className="mx-auto mt-6 flex max-w-xl flex-col gap-3 text-left sm:flex-row sm:gap-4">
            {post.challenge && (
              <div className="flex-1 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/40 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--lv-ink-muted)]">The challenge</p>
                <p className="mt-1 text-sm font-medium text-[var(--lv-ink)]">{post.challenge}</p>
              </div>
            )}
            {post.solution && (
              <div className="flex-1 rounded-xl border border-[var(--lv-primary)]/30 bg-[var(--lv-primary)]/6 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--lv-primary)]">What verification does</p>
                <p className="mt-1 text-sm font-medium text-[var(--lv-ink)]">{post.solution}</p>
              </div>
            )}
          </div>
        )}
      </header>

      <BlogMarkdown markdown={post.content} className="mt-10" />

      <footer className="mt-14 border-t border-[var(--lv-border)] pt-8">
        <Link
          href="/blog"
          className="text-sm font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline"
        >
          ← All insights
        </Link>
      </footer>
    </article>
  );
}
