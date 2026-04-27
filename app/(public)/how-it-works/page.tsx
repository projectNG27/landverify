import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How it works",
};

export default function HowItWorksPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">How it works</h1>
      <p className="mt-4 text-foreground/80">
        Step-by-step flow for verification, payments, and reports will go here.
      </p>
      <p className="mt-6">
        <Link href="/" className="underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}
