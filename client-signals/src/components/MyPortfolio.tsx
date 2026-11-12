import React from "react";
import type { ClientProfile, CRMNote, SignalOpportunity } from "../types";
import { portfolioBriefs } from "../domain/clientWorkflow";
import { ClientActionPlan } from "./ClientActionPlan";

type PlanProps = Omit<
  React.ComponentProps<typeof ClientActionPlan>,
  "opportunity"
>;
interface Props extends PlanProps {
  clients: ClientProfile[];
  notes: CRMNote[];
  opportunities: SignalOpportunity[];
  clientId: string;
  onSelectClient: (id: string) => void;
  onOpenSignals: (id: string) => void;
}
export function MyPortfolio({
  clients,
  notes,
  opportunities,
  clientId,
  onSelectClient,
  onOpenSignals,
  ...plan
}: Props) {
  const client = clients.find((c) => c.id === clientId)!;
  const opportunity = opportunities.find((o) => o.clientId === clientId)!;
  const brief = portfolioBriefs[clientId];
  return (
    <div className="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-6">
      <aside className="space-y-2" aria-label="Portfolio clients">
        <div className="mb-4">
          <h2 className="font-bold text-lg">My relationships</h2>
          <p className="text-sm text-slate-500 mt-1">
            5 synthetic corporate clients
          </p>
        </div>
        {clients.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelectClient(c.id)}
            aria-pressed={c.id === clientId}
            aria-label={`Open portfolio: ${c.name}`}
            className={`w-full text-left rounded-xl border p-4 ${c.id === clientId ? "bg-emerald-50 border-emerald-600" : "bg-white border-slate-200 hover:border-emerald-400"}`}
          >
            <span className="block font-semibold text-sm">{c.name}</span>
            <span className="block text-xs text-slate-500 mt-1">
              {c.sector}
            </span>
          </button>
        ))}
      </aside>
      <section className="space-y-5 min-w-0" aria-label="Client portfolio">
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Client relationship · Synthetic records
          </p>
          <h1 className="text-2xl font-bold mt-2">{client.name}</h1>
          <p className="mt-2 text-sm text-slate-600">
            {client.headquarters} · {client.coverageGroup} ·{" "}
            {client.relationshipTier}
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mt-5 text-sm">
            <div>
              <p className="text-xs text-slate-500">Relationship manager</p>
              <p className="font-semibold mt-1">{client.rmName}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Key contact</p>
              <p className="font-semibold mt-1">
                {client.treasuryContact.name} · {client.treasuryContact.title}
              </p>
              <p className="text-slate-500 mt-1 break-all">
                {client.treasuryContact.email} · Demo contact only
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenSignals(clientId)}
            className="mt-5 rounded-lg bg-emerald-800 text-white px-4 py-2 font-semibold text-sm"
          >
            View client signals &amp; evidence →
          </button>
        </div>
        <div className="grid xl:grid-cols-2 gap-5">
          {[
            ["Documented products & exposures", brief.products],
            ["Upcoming obligations & checks", brief.obligations],
          ].map(([title, items]) => (
            <section
              key={title as string}
              className="rounded-xl bg-white border border-slate-200 p-5"
            >
              <h2 className="font-bold">{title}</h2>
              <ul className="mt-3 space-y-3 text-sm text-slate-700 leading-relaxed">
                {(items as string[]).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-slate-500">
                Source records: {brief.sources.join(", ")} · Historical demo
                records; confirm current terms
              </p>
            </section>
          ))}
        </div>
        <ClientActionPlan key={clientId} opportunity={opportunity} {...plan} />
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold text-lg">Historical CRM interactions</h2>
          <p className="text-xs text-slate-500 mt-1">
            Synthetic relationship notes · Not a transaction ledger
          </p>
          <div className="mt-4 space-y-4">
            {notes
              .filter((n) => n.clientId === clientId)
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((n) => (
                <article
                  key={n.id}
                  className={`border-l-2 pl-4 ${n.isSuperseded ? "border-slate-300" : "border-emerald-600"}`}
                >
                  <p className="text-xs font-semibold text-slate-500">
                    {n.date} · {n.id} · {n.authorName}
                  </p>
                  <h3 className="font-semibold text-sm mt-1">{n.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">
                    {n.fullText}
                  </p>
                  {n.isSuperseded && (
                    <p className="text-xs text-amber-800 mt-2">
                      Superseded by {n.supersededByNoteId}; do not treat as
                      current intent.
                    </p>
                  )}
                  {n.isConflicting && (
                    <p className="text-xs text-amber-800 mt-2">
                      Conflicting guidance · Current intent needs verification
                    </p>
                  )}
                </article>
              ))}
          </div>
        </section>
      </section>
    </div>
  );
}
