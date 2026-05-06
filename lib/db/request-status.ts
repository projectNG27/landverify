export const REQUEST_STATUSES = [
  "received",
  "assigned",
  "in_progress",
  "report_submitted",
  "pending_manager_review",
  "report_ready",
  "completed",
  "done",
  "closed",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const TRACK_TIMELINE: Array<{ status: RequestStatus; label: string; detail: string; index: number }> = [
  { status: "received", label: "Request received", detail: "We have your submission on file.", index: 0 },
  { status: "assigned", label: "Assigned", detail: "A verification agent has been assigned.", index: 1 },
  { status: "in_progress", label: "In progress", detail: "Verification work is currently in progress.", index: 2 },
  {
    status: "report_submitted",
    label: "In progress",
    detail: "Agent submitted findings. Pending manager review.",
    index: 2,
  },
  {
    status: "pending_manager_review",
    label: "In progress",
    detail: "Findings are under manager review.",
    index: 2,
  },
  { status: "report_ready", label: "Report ready", detail: "Your report is ready.", index: 3 },
  { status: "completed", label: "Completed", detail: "Report released to customer.", index: 4 },
  { status: "done", label: "Completed", detail: "Case closed by manager.", index: 4 },
  { status: "closed", label: "Completed", detail: "Request closed.", index: 4 },
];

export function timelineIndexFromStatus(status: RequestStatus): number {
  return TRACK_TIMELINE.find((s) => s.status === status)?.index ?? 0;
}

export function timelineDetailFromStatus(status: RequestStatus): string {
  return TRACK_TIMELINE.find((s) => s.status === status)?.detail ?? "Status available.";
}

export function timelineLabelFromStatus(status: RequestStatus): string {
  return TRACK_TIMELINE.find((s) => s.status === status)?.label ?? status.replace(/_/g, " ");
}

/** Labels for admin dropdowns */
export const REQUEST_STATUS_ADMIN_LABELS: Record<RequestStatus, string> = {
  received: "Received",
  assigned: "Assigned",
  in_progress: "In Progress",
  report_submitted: "Report Submitted",
  pending_manager_review: "Pending Manager Review",
  report_ready: "Report ready",
  completed: "Completed",
  done: "Done",
  closed: "Closed",
};

export function publicTrackLabelFromStatus(status: RequestStatus): "Received" | "Assigned" | "In Progress" | "Report Ready" | "Completed" {
  if (status === "received") return "Received";
  if (status === "assigned") return "Assigned";
  if (status === "in_progress" || status === "report_submitted" || status === "pending_manager_review") {
    return "In Progress";
  }
  if (status === "report_ready") return "Report Ready";
  return "Completed";
}

