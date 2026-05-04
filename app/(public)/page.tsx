import Image from "next/image";
import Link from "next/link";
import { SupportedStatesSection } from "@/components/public/SupportedStatesSection";
import { formatBlogDate, getLatestPostSummaries } from "@/lib/blog";
import { homeMedia } from "@/lib/home-media";

const steps = [
  { n: 1, title: "Choose a service", body: "Pick Basic, Standard, or Premium to match your budget and timeline." },
  { n: 2, title: "Pay and confirm", body: "Complete payment and upload proof so we can open your request." },
  { n: 3, title: "Submit land details", body: "Share location, documents, and seller information securely." },
  { n: 4, title: "We verify", body: "Our team reviews documents, location context, and available signals." },
  { n: 5, title: "Get your report", body: "Download your report and keep it for 20 business days after completion." },
] as const;

const pillars = [
  {
    title: "Documents that tell a story",
    body: "Survey plans, deeds, allocations, and receipts—reviewed in context so gaps are easier to spot.",
    media: homeMedia.pillarDocs,
  },
  {
    title: "Location you can point to",
    body: "Maps, coordinates, and on-the-ground signals help describe the plot—not just the paperwork.",
    media: homeMedia.pillarLocation,
  },
  {
    title: "Human-led judgment",
    body: "Structured checks plus experienced reviewers, so outputs read like guidance—not generic templates.",
    media: homeMedia.pillarReview,
  },
] as const;

const stats = [
  { value: "3", label: "Tiers for different risk levels" },
  { value: "20", label: "Business days to download after report ready" },
  { value: "4", label: "States supported today" },
] as const;

export default async function HomePage() {
  const insights = await getLatestPostSummaries(3);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[var(--lv-border)] bg-gradient-to-b from-[var(--lv-surface)] via-[var(--lv-bg)] to-[var(--lv-bg)] lv-hero-grid">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:gap-12 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:py-24">
          <div className="order-2 max-w-xl lg:order-1">
            <p className="lv-fade-up text-sm font-semibold uppercase tracking-wide text-[var(--lv-primary)]">
              Independent land verification
            </p>
            <h1 className="lv-fade-up lv-fade-up-delay-1 mt-3 text-3xl font-bold leading-[1.12] tracking-tight text-[var(--lv-ink)] sm:text-5xl lg:text-[3.35rem]">
              Verify land before you buy in Nigeria
            </h1>
            <p className="lv-fade-up lv-fade-up-delay-2 mt-5 text-base leading-relaxed text-[var(--lv-ink-muted)] sm:text-lg lg:text-xl">
              Know the risks. Avoid costly mistakes. Make informed decisions with structured verification
              insights—not guesswork or rushed WhatsApp chatter.
            </p>
            <div className="lv-fade-up lv-fade-up-delay-2 mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/submit-request"
                className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--lv-primary)] px-6 text-base font-semibold text-white shadow-lg shadow-[var(--lv-primary)]/25 transition-colors hover:bg-[var(--lv-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lv-accent)]"
              >
                Get started
              </Link>
              <Link
                href="/track-request"
                className="inline-flex min-h-12 items-center justify-center rounded-lg border-2 border-[var(--lv-primary)] bg-[var(--lv-surface)]/80 px-6 text-base font-semibold text-[var(--lv-primary)] backdrop-blur-sm transition-colors hover:bg-[var(--lv-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lv-accent)]"
              >
                Track a request
              </Link>
            </div>
          </div>

          <div className="relative order-1 mx-auto w-full max-w-lg lg:order-2 lg:max-w-none">
            <div className="relative mx-auto aspect-[4/3] w-full max-h-[min(56vh,380px)] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/5 sm:aspect-[5/4] sm:max-h-none sm:rounded-3xl lv-hover-lift">
              <Image
                src={homeMedia.heroPrimary.src}
                alt={homeMedia.heroPrimary.alt}
                fill
                priority
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 50vw"
                className="object-cover"
              />
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[var(--lv-primary)]/25 via-transparent to-transparent"
                aria-hidden
              />
            </div>
            <div
              className="absolute -bottom-5 -left-2 hidden w-[42%] max-w-[220px] overflow-hidden rounded-2xl border-4 border-[var(--lv-surface)] shadow-xl sm:block lg:-bottom-8 lg:-left-4"
              aria-hidden
            >
              <div className="relative aspect-[5/4] w-full">
                <Image src={homeMedia.heroAccent.src} alt="" fill sizes="280px" className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b border-[var(--lv-border)] bg-[var(--lv-surface)] py-10" aria-label="Service highlights">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center sm:text-left">
              <p className="text-3xl font-bold tabular-nums text-[var(--lv-primary)] sm:text-4xl lg:text-5xl">{s.value}</p>
              <p className="mt-2 text-sm font-medium leading-snug text-[var(--lv-ink-muted)]">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <SupportedStatesSection />

      {/* Visual pillars */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20" aria-labelledby="pillars-heading">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-primary)]">What you get</p>
          <h2 id="pillars-heading" className="mt-2 text-3xl font-bold tracking-tight text-[var(--lv-ink)] sm:text-4xl">
            Verification you can actually picture
          </h2>
          <p className="mt-4 text-lg text-[var(--lv-ink-muted)]">
            Strong reports start with what is on file, where the land sits, and how reviewers connect the dots.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {pillars.map((pillar) => (
            <article
              key={pillar.title}
              className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] shadow-sm transition-shadow hover:shadow-lg"
            >
              <div className="relative aspect-[16/11] max-h-52 w-full overflow-hidden sm:max-h-none">
                <Image
                  src={pillar.media.src}
                  alt={pillar.media.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
                <div
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent"
                  aria-hidden
                />
              </div>
              <div className="flex flex-1 flex-col p-6">
                <h3 className="text-lg font-bold text-[var(--lv-ink)]">{pillar.title}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--lv-ink-muted)]">{pillar.body}</p>
                <Link
                  href="/how-it-works"
                  className="mt-4 inline-flex text-sm font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline"
                >
                  See the process →
                </Link>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-[var(--lv-ink-faint)]">
          Images are AI-generated for illustration and do not depict a specific parcel or listing.
        </p>
      </section>

      {/* Problem / Solution — with imagery */}
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-10">
          <article className="overflow-hidden rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] shadow-sm lg:flex lg:min-h-[280px]">
            <div className="relative aspect-[16/10] max-h-48 w-full shrink-0 overflow-hidden sm:max-h-56 lg:aspect-auto lg:h-auto lg:max-h-none lg:min-h-[280px] lg:w-[44%]">
              <Image
                src={homeMedia.storyRisk.src}
                alt={homeMedia.storyRisk.alt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8">
              <h2 className="text-xl font-bold text-[var(--lv-ink)]">Why buyers worry</h2>
              <p className="mt-3 leading-relaxed text-[var(--lv-ink-muted)]">
                Competing claims, weak documentation, acquisition risk, and unclear history make land purchases
                stressful—especially when you are not on the ground every day.
              </p>
            </div>
          </article>

          <article className="overflow-hidden rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] shadow-sm ring-1 ring-[var(--lv-primary)]/10 lg:flex lg:min-h-[280px]">
            <div className="relative aspect-[16/10] max-h-48 w-full shrink-0 overflow-hidden sm:max-h-56 lg:order-2 lg:aspect-auto lg:h-auto lg:max-h-none lg:min-h-[280px] lg:w-[44%]">
              <Image
                src={homeMedia.storyClarity.src}
                alt={homeMedia.storyClarity.alt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:order-1">
              <h2 className="text-xl font-bold text-[var(--lv-ink)]">What LandVerify does</h2>
              <p className="mt-3 leading-relaxed text-[var(--lv-ink-muted)]">
                We produce structured, risk-based verification reports from document review, location context,
                checks where records exist, and professional judgment—so you can decide with clearer eyes.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* How it works preview */}
      <section className="border-y border-[var(--lv-border)] bg-[var(--lv-muted)]/50 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[var(--lv-ink)] sm:text-3xl">How it works</h2>
              <p className="mt-2 max-w-2xl text-[var(--lv-ink-muted)]">
                A simple path from payment to report. You can always see where things stand.
              </p>
            </div>
            <Link
              href="/how-it-works"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline"
            >
              Full walkthrough <span aria-hidden>→</span>
            </Link>
          </div>
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map(({ n, title, body }) => (
              <li
                key={n}
                className="relative rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-[var(--lv-primary)] text-sm font-bold text-white"
                  aria-hidden
                >
                  {n}
                </span>
                <h3 className="font-semibold text-[var(--lv-ink)]">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--lv-ink-muted)]">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Insights */}
      {insights.length > 0 ? (
        <section className="border-y border-[var(--lv-border)] bg-[var(--lv-surface)] py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[var(--lv-ink)] sm:text-3xl">Insights</h2>
                <p className="mt-2 max-w-2xl text-[var(--lv-ink-muted)]">
                  Plain-language notes on buyer challenges and how independent verification fits in—not legal advice,
                  but better questions before you pay.
                </p>
              </div>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline"
              >
                View all articles <span aria-hidden>→</span>
              </Link>
            </div>
            <ul className="mt-10 grid gap-4 md:grid-cols-3">
              {insights.map((post) => (
                <li key={post.slug}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="flex h-full flex-col rounded-xl border border-[var(--lv-border)] bg-[var(--lv-bg)]/80 p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--lv-primary)]/30 hover:shadow-md"
                  >
                    <span className="text-xs font-medium uppercase tracking-wide text-[var(--lv-ink-faint)]">
                      {formatBlogDate(post.date)}
                    </span>
                    <span className="mt-2 text-lg font-semibold text-[var(--lv-ink)]">{post.title}</span>
                    <span className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--lv-ink-muted)]">
                      {post.excerpt}
                    </span>
                    <span className="mt-4 text-sm font-semibold text-[var(--lv-primary)]">Read more</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* Pricing teaser */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:py-16">
        <h2 className="text-2xl font-bold text-[var(--lv-ink)] sm:text-3xl">Straightforward pricing</h2>
        <p className="mt-2 text-[var(--lv-ink-muted)]">All services require payment before we start verification.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { name: "Basic", price: "₦10,000", note: "3–5 business days" },
            { name: "Standard", price: "₦25,000", note: "5–7 business days", highlight: true },
            { name: "Premium", price: "₦50,000+", note: "7–10 business days" },
          ].map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-6 shadow-sm transition hover:shadow-md ${
                tier.highlight
                  ? "border-[var(--lv-primary)] bg-[var(--lv-surface)] ring-2 ring-[var(--lv-primary)]/20"
                  : "border-[var(--lv-border)] bg-[var(--lv-surface)]"
              }`}
            >
              <h3 className="text-lg font-semibold text-[var(--lv-ink)]">{tier.name}</h3>
              <p className="mt-2 text-2xl font-bold text-[var(--lv-primary)]">{tier.price}</p>
              <p className="mt-1 text-sm text-[var(--lv-ink-muted)]">{tier.note}</p>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--lv-primary)] px-5 text-sm font-semibold text-white shadow-md hover:opacity-95"
          >
            Compare plans
          </Link>
        </div>
      </section>

      {/* CTA band with background image */}
      <section className="relative isolate min-h-[18rem] overflow-hidden border-y border-[var(--lv-border)] sm:min-h-0">
        <div className="absolute inset-0 min-h-[18rem] sm:min-h-full" aria-hidden>
          <Image
            src={homeMedia.ctaBand.src}
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
          <div
            className="absolute inset-0 bg-gradient-to-r from-[var(--lv-primary)]/95 via-[var(--lv-primary)]/88 to-[var(--lv-primary)]/75"
            aria-hidden
          />
        </div>
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-14 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-16">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready before you wire money?</h2>
            <p className="mt-3 text-base leading-relaxed text-white/90">
              Start with the tier that fits your plot and timeline. If you already paid, track your request anytime.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href="/pricing"
              className="inline-flex min-h-12 min-w-[10rem] items-center justify-center rounded-lg bg-white px-6 text-sm font-bold text-[var(--lv-primary)] shadow-lg hover:bg-[var(--lv-muted)]"
            >
              View pricing
            </Link>
            <Link
              href="/track-request"
              className="inline-flex min-h-12 min-w-[10rem] items-center justify-center rounded-lg border-2 border-white/80 bg-transparent px-6 text-sm font-bold text-white hover:bg-white/10"
            >
              Track request
            </Link>
          </div>
        </div>
      </section>

      {/* Disclaimer strip */}
      <section
        className="border-t border-[var(--lv-border)] bg-[var(--lv-surface)] py-8"
        aria-labelledby="disclaimer-heading"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="disclaimer-heading" className="text-sm font-bold uppercase tracking-wide text-[var(--lv-ink-muted)]">
            Important
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--lv-ink-muted)]">
            LandVerify provides risk-based verification insights. It does not guarantee ownership, replace legal
            advice, or count as official government confirmation. Always complete your own legal diligence before
            you pay for land.
          </p>
        </div>
      </section>
    </div>
  );
}
