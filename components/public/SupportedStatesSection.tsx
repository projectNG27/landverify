import { SUPPORTED_STATES } from "@/lib/constants";

type Props = {
  /** Tighter layout for inner pages */
  variant?: "default" | "compact";
};

export function SupportedStatesSection({ variant = "default" }: Props) {
  const isCompact = variant === "compact";

  return (
    <section
      className={
        isCompact
          ? "rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm sm:p-8"
          : "border-y border-[var(--lv-border)] bg-[var(--lv-muted)]/40 py-12 sm:py-14"
      }
      aria-labelledby="supported-states-heading"
    >
      <div className={isCompact ? "" : "mx-auto max-w-6xl px-4 sm:px-6"}>
        <div className={isCompact ? "" : "max-w-2xl"}>
          <p className="text-sm font-semibold uppercase tracking-wide text-[var(--lv-primary)]">Coverage</p>
          <h2
            id="supported-states-heading"
            className={`mt-2 font-bold tracking-tight text-[var(--lv-ink)] ${isCompact ? "text-2xl" : "text-3xl sm:text-4xl"}`}
          >
            States we support right now
          </h2>
          <p className={`mt-3 text-[var(--lv-ink-muted)] ${isCompact ? "text-sm" : "text-base sm:text-lg"}`}>
            We currently accept verification requests for land in these states. More regions will be added as we
            expand.
          </p>
        </div>

        <ul className={`mt-8 grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-4 ${isCompact ? "" : "sm:mt-10"}`}>
          {SUPPORTED_STATES.map((state) => (
            <li
              key={state.code}
              className="flex items-center gap-3 rounded-xl border border-[var(--lv-border)] bg-[var(--lv-surface)] px-4 py-3 shadow-sm"
            >
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--lv-primary)]/10 text-sm font-bold text-[var(--lv-primary)]"
                aria-hidden
              >
                {state.code}
              </span>
              <span className="text-base font-semibold text-[var(--lv-ink)]">{state.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
