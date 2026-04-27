import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-black/5 dark:border-white/10">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold" aria-label="LandVerify home">
            <Image
              src="/brand/logo.png"
              alt=""
              width={120}
              height={36}
              className="h-8 w-auto"
              priority
            />
          </Link>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-3 text-sm sm:gap-4">
            <Link className="underline-offset-4 hover:underline" href="/how-it-works">
              How it works
            </Link>
            <Link className="underline-offset-4 hover:underline" href="/pricing">
              Pricing
            </Link>
            <Link className="underline-offset-4 hover:underline" href="/track-request">
              Track request
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="max-w-2xl space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Land verification you can track from payment to report
          </h1>
          <p className="text-base text-foreground/80 sm:text-lg">
            LandVerify helps you submit documents, follow status updates, and download your
            verification report when it is ready. Built for customers, agents, and managers.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          <li className="rounded-lg border border-black/5 p-4 dark:border-white/10">
            <h2 className="text-lg font-medium">Choose a product</h2>
            <p className="mt-1 text-sm text-foreground/80">
              Pick the verification level that matches your risk and timeline.
            </p>
          </li>
          <li className="rounded-lg border border-black/5 p-4 dark:border-white/10">
            <h2 className="text-lg font-medium">Submit and track</h2>
            <p className="mt-1 text-sm text-foreground/80">
              Payment proof, documents, and status in one place—with email updates.
            </p>
          </li>
        </ul>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-foreground px-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            View pricing
          </Link>
          <Link
            href="/track-request"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-black/10 px-5 text-sm font-medium dark:border-white/20"
          >
            Track a request
          </Link>
        </div>
      </main>

      <footer className="border-t border-black/5 py-6 text-center text-sm text-foreground/70 dark:border-white/10">
        <p>LandVerify — a product of Axiomate Limited</p>
      </footer>
    </div>
  );
}
