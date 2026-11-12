import React, { useState } from "react";
import type { SignalOpportunity } from "../types";
import { bankerAction } from "../domain/workflow";
import {
  canRestoreDecision,
  portfolioBriefs,
  type InternalFollowUp,
} from "../domain/clientWorkflow";

interface Props {
  opportunity: SignalOpportunity;
  tasks: InternalFollowUp[];
  onAddTask: (clientId: string, text: string) => void;
  onToggleTask: (id: string) => void;
  onUndo: (id: string) => void;
  onContinue: () => void;
  onReview: (id: string) => void;
}
export function ClientActionPlan({
  opportunity,
  tasks,
  onAddTask,
  onToggleTask,
  onUndo,
  onContinue,
  onReview,
}: Props) {
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const action = bankerAction(opportunity);
  const decisionLabel = {
    SURFACED: opportunity.priorityRank > 0 ? "Ready for review" : "Monitoring",
    REVIEWED: "Reviewed internally",
    DEFERRED: "Deferred 48 hours",
    DISMISSED: "Dismissed",
    VERIFY_FIRST: "Verification required",
    SUPPRESSED: "Excluded from outreach",
  }[opportunity.status];
  return (
    <section
      className="rounded-xl border border-emerald-200 bg-white p-5 space-y-4"
      aria-label="Client action plan"
    >
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Next Best Action
          </p>
          <h2 className="font-bold text-lg mt-1">{action.label}</h2>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
          Decision: {decisionLabel}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-slate-700">{action.detail}</p>
      <div className="flex flex-wrap gap-3">
        {opportunity.status === "SURFACED" && opportunity.priorityRank > 0 && (
          <button
            onClick={() => onReview(opportunity.id)}
            className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
          >
            Mark for Outreach Review
          </button>
        )}
        {canRestoreDecision(opportunity) && (
          <button
            onClick={() => onUndo(opportunity.id)}
            className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-900"
          >
            {opportunity.status === "REVIEWED"
              ? "Undo review"
              : "Undo banker decision"}
          </button>
        )}
        <button
          onClick={onContinue}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Continue remaining priorities
        </button>
      </div>
      <details
        key={opportunity.status}
        open={opportunity.status === "REVIEWED" || tasks.length > 0}
        className="border-t border-slate-100 pt-3"
      >
        <summary className="text-sm font-semibold text-emerald-900 cursor-pointer">
          Prepare conversation &amp; internal follow-up
          {tasks.length > 0 ? ` (${tasks.length})` : ""}
        </summary>
        <div className="space-y-4 mt-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <h3 className="text-sm font-semibold">Conversation objective</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {portfolioBriefs[opportunity.clientId]?.objective}
            </p>
          </div>
          <details>
            <summary className="text-sm font-semibold text-emerald-900 cursor-pointer">
              Suggested discovery questions
            </summary>
            <ul className="mt-3 list-disc pl-5 space-y-2 text-sm text-slate-700">
              {opportunity.recommendedQuestions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </details>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              onAddTask(opportunity.clientId, note.trim());
              setNote("");
              setSaved(true);
            }}
          >
            <label
              htmlFor={`follow-up-${opportunity.id}`}
              className="text-sm font-semibold block"
            >
              Internal follow-up note or task
            </label>
            <p className="mt-1 mb-2 text-xs text-slate-500">
              Saved in this browser only · Not synced to an external CRM · No
              message sent
            </p>
            <textarea
              id={`follow-up-${opportunity.id}`}
              value={note}
              maxLength={2000}
              onChange={(e) => {
                setNote(e.target.value);
                setSaved(false);
              }}
              placeholder="Record what to verify or prepare next…"
              rows={2}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm"
            />
            <div className="mt-2 flex items-center gap-3">
              <button
                disabled={!note.trim()}
                className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white"
              >
                Save internal follow-up
              </button>
              {saved && (
                <span role="status" className="text-sm text-emerald-800">
                  Follow-up saved
                </span>
              )}
            </div>
          </form>
          {tasks.length > 0 && (
            <ul className="space-y-2" aria-label="Saved follow-ups">
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex gap-3 rounded-lg border border-slate-200 p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => onToggleTask(task.id)}
                    aria-label={`Complete follow-up: ${task.text}`}
                  />
                  <div>
                    <span
                      className={
                        task.completed ? "line-through text-slate-500" : ""
                      }
                    >
                      {task.text}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      {task.completed ? "Completed" : "Open"} · Internal demo
                      task · {new Date(task.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </details>
    </section>
  );
}
