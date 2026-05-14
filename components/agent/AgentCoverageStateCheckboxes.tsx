import { REQUEST_INTAKE_STATE_VALUES } from "@/lib/validations/request-intake";

const checkClass =
  "mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--lv-border)] text-[var(--lv-primary)] focus:ring-[var(--lv-primary)]";

type Props = {
  legend: string;
  description?: string;
};

export function AgentCoverageStateCheckboxes({ legend, description }: Props) {
  return (
    <fieldset className="rounded-xl border border-[var(--lv-border)] bg-[var(--lv-muted)]/20 px-4 py-4">
      <legend className="text-sm font-semibold text-[var(--lv-ink)]">{legend}</legend>
      {description ? <p className="mt-1 text-xs leading-relaxed text-[var(--lv-ink-muted)]">{description}</p> : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {REQUEST_INTAKE_STATE_VALUES.map((state) => (
          <label key={state} className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-transparent px-1 py-1 hover:border-[var(--lv-border)]">
            <input type="checkbox" name="coverage_states" value={state} className={checkClass} />
            <span className="text-sm text-[var(--lv-ink)]">{state}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
