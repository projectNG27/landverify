import Image from "next/image";
import Link from "next/link";
import { PublicNavigation } from "@/components/layout/PublicNavigation";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--lv-border)] bg-[var(--lv-surface)]/95 backdrop-blur-md">
      <div className="relative mx-auto flex h-[var(--header-h)] w-full max-w-6xl items-center justify-between gap-2 px-4 sm:gap-3 sm:px-6">
        <Link
          href="/"
          className="flex min-w-0 max-w-[55%] shrink items-center rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lv-accent)] sm:max-w-none"
          aria-label="LandVerify home"
        >
          <Image
            src="/brand/logo2.png"
            alt=""
            width={180}
            height={52}
            className="h-8 w-auto max-h-10 object-contain object-left sm:h-9 sm:max-h-11 lg:h-10"
            priority
          />
        </Link>

        <PublicNavigation />
      </div>
    </header>
  );
}
