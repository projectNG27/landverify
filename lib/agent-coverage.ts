import { REQUEST_INTAKE_STATE_VALUES } from "@/lib/validations/request-intake";

const ALLOWED_NAMES = new Set<string>(REQUEST_INTAKE_STATE_VALUES);

/** Parse repeated `coverage_states` fields; only supported state names are kept. */
export function parseCoverageStatesFromForm(formData: FormData): string[] {
  const raw = formData.getAll("coverage_states").map((x) => String(x).trim()).filter(Boolean);
  return [...new Set(raw)].filter((n) => ALLOWED_NAMES.has(n)).sort();
}

export function formatCoverageStatesList(states: string[] | null | undefined): string {
  if (!states?.length) return "—";
  return states.join(", ");
}

export function agentCoversRequestState(coverage: string[] | null | undefined, requestState: string): boolean {
  const arr = coverage ?? [];
  return arr.length > 0 && arr.includes(requestState);
}
