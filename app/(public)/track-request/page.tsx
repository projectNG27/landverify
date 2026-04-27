import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Track request",
};

export default function TrackRequestPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Track a request</h1>
      <p className="mt-4 text-foreground/80">
        Request code lookup and status will be implemented with Supabase.
      </p>
      <p className="mt-6">
        <Link href="/" className="underline-offset-4 hover:underline">
          Back to home
        </Link>
      </p>
    </main>
  );
}
