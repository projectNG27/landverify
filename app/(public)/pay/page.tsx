import type { Metadata } from "next";
import Link from "next/link";
import { PayRequestForm } from "@/components/public/PayRequestForm";

export const metadata: Metadata = {
  title: "Pay for your request",
  description: "Complete payment for your LandVerify case with Paystack. Amount is based on the tier you selected.",
};

export default async function PayPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const sp = await searchParams;
  const code = typeof sp.code === "string" ? sp.code : "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-xl text-center">
        <p className="text-sm font-semibold text-[var(--lv-primary)]">Payment</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--lv-ink)] sm:text-4xl">Pay for your request</h1>
        <p className="mt-4 text-[var(--lv-ink-muted)]">
          Secure checkout via Paystack. You will be charged the fee for your selected service tier (Basic, Standard, or
          Premium).
        </p>
      </div>

      <div className="mt-10">
        <PayRequestForm defaultRequestId={code.trim()} />
      </div>

      <p className="mx-auto mt-10 max-w-lg text-center text-sm text-[var(--lv-ink-muted)]">
        <Link href="/track-request" className="font-semibold text-[var(--lv-primary)] underline-offset-2 hover:underline">
          Track your request
        </Link>{" "}
        after paying to print or email your receipt.
      </p>
    </div>
  );
}
