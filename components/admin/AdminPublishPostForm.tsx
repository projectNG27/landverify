"use client";

import { useActionState } from "react";
import { adminPublishPostAction, type AdminPublishState } from "@/app/actions/admin-blog";

const initialState: AdminPublishState = { ok: false };

const inputClass =
  "mt-1 w-full rounded-lg border border-[var(--lv-border)] bg-[var(--lv-surface)] px-3 py-3 text-[var(--lv-ink)] shadow-inner outline-none ring-[var(--lv-accent)] placeholder:text-[var(--lv-ink-faint)] focus:border-[var(--lv-primary)] focus:ring-2";

export function AdminPublishPostForm() {
  const [state, action, pending] = useActionState(adminPublishPostAction, initialState);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-[var(--lv-border)] bg-[var(--lv-surface)] p-6 shadow-sm">
      <div>
        <label htmlFor="post-title" className="text-sm font-medium text-[var(--lv-ink)]">
          Title
        </label>
        <input id="post-title" name="title" className={inputClass} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="post-date" className="text-sm font-medium text-[var(--lv-ink)]">
            Publish date
          </label>
          <input id="post-date" type="date" name="date" defaultValue={today} className={inputClass} required />
        </div>
        <div>
          <label htmlFor="post-challenge" className="text-sm font-medium text-[var(--lv-ink)]">
            Challenge label (optional)
          </label>
          <input id="post-challenge" name="challenge" className={inputClass} placeholder="e.g. Incomplete document trail" />
        </div>
      </div>

      <div>
        <label htmlFor="post-solution" className="text-sm font-medium text-[var(--lv-ink)]">
          Solution label (optional)
        </label>
        <input id="post-solution" name="solution" className={inputClass} placeholder="e.g. Structured independent review" />
      </div>

      <div>
        <label htmlFor="post-excerpt" className="text-sm font-medium text-[var(--lv-ink)]">
          Excerpt
        </label>
        <textarea id="post-excerpt" name="excerpt" rows={3} className={inputClass} required />
      </div>

      <div>
        <label htmlFor="post-content" className="text-sm font-medium text-[var(--lv-ink)]">
          Article body (Markdown)
        </label>
        <textarea id="post-content" name="content" rows={14} className={`${inputClass} font-mono text-sm`} required />
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>
      )}
      {state.ok && state.success && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.success} Live URL: <span className="font-mono">/blog/{state.slug}</span>
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--lv-primary)] px-4 py-3 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
      >
        {pending ? "Publishing..." : "Publish post"}
      </button>
    </form>
  );
}

