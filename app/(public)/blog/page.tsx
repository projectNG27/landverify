import type { Metadata } from "next";
import Link from "next/link";
import { formatBlogDate, getPostSummaries } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Insights",
  description:
    "Short articles on land-buying risks in Nigeria and how structured verification helps buyers decide with more clarity.",
};

export default async function BlogIndexPage() {
  const posts = await getPostSummaries();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-[var(--lv-primary)]">Insights</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--lv-ink)] sm:text-4xl">
          Challenges buyers face—and how verification helps
        </h1>
        <p className="mt-4 text-[var(--lv-ink-muted)]">
          We publish plain-language notes on common land-purchase risks and what structured, independent review can
          change. New posts ship by editing Markdown files in the repo—no dashboard required.
        </p>
      </header>

      {posts.length === 0 ? (
        <p className="mx-auto mt-14 max-w-lg text-center text-[var(--lv-ink-muted)]">
          No articles yet. Add <code className="rounded bg-[var(--lv-muted)] px-1.5 py-0.5 font-mono text-sm">.md</code>{" "}
          files under <code className="rounded bg-[var(--lv-muted)] px-1.5 py-0.5 font-mono text-sm">content/blog</code>.
        </p>
      ) : (
        <ul className="mx-auto mt-14 grid max-w-3xl gap-6">
          {posts.map((post) => (
            <li key={post.slug}>
              <article className="rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm transition hover:border-[var(--lv-primary)]/35 hover:shadow-md">
                <time
                  dateTime={post.date}
                  className="text-xs font-medium uppercase tracking-wide text-[var(--lv-ink-faint)]"
                >
                  {formatBlogDate(post.date, "long")}
                </time>
                <h2 className="mt-2 text-xl font-bold text-[var(--lv-ink)]">
                  <Link href={`/blog/${post.slug}`} className="hover:text-[var(--lv-primary)]">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--lv-ink-muted)]">{post.excerpt}</p>
                {(post.challenge || post.solution) && (
                  <dl className="mt-4 flex flex-col gap-2 text-xs sm:flex-row sm:flex-wrap sm:gap-3">
                    {post.challenge && (
                      <div className="rounded-lg border border-[var(--lv-border)] bg-[var(--lv-muted)]/40 px-3 py-2">
                        <dt className="font-semibold text-[var(--lv-ink-muted)]">Challenge</dt>
                        <dd className="mt-0.5 text-[var(--lv-ink)]">{post.challenge}</dd>
                      </div>
                    )}
                    {post.solution && (
                      <div className="rounded-lg border border-[var(--lv-primary)]/25 bg-[var(--lv-primary)]/5 px-3 py-2">
                        <dt className="font-semibold text-[var(--lv-primary)]">How we help</dt>
                        <dd className="mt-0.5 text-[var(--lv-ink)]">{post.solution}</dd>
                      </div>
                    )}
                  </dl>
                )}
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-4 inline-flex text-sm font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline"
                >
                  Read article
                </Link>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
