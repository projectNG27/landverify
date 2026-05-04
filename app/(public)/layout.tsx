import { PublicFooter } from "@/components/layout/PublicFooter";
import { PublicHeader } from "@/components/layout/PublicHeader";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <PublicHeader />
      <main id="main-content" className="min-w-0 flex-1 overflow-x-hidden">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
