import React, { useState } from 'react';
import { bankerAction, atlasUnpaidEUR, atlasRateChangePercent, atlasIncrementalUSD } from '../domain/workflow';
import { 
  SignalOpportunity, 
  ClientProfile, 
  CRMNote, 
  MarketDevelopment 
} from '../types';
import { 
  Building2, 
  Calendar, 
  FileText, 
  Globe2, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  HelpCircle, 
  Sparkles, 
  UserCheck, 
  Mail, 
  ArrowRight,
  AlertOctagon,
  FileSearch,
  BadgeAlert,
  Calculator,
  Compass,
  TrendingUp,
  Info
} from 'lucide-react';

interface EvidenceInspectorProps {
  opportunity: SignalOpportunity;
  client?: ClientProfile;
  event?: MarketDevelopment;
  internalResearch?: MarketDevelopment;
  notes: CRMNote[];
  onMarkReviewed: (id: string) => void;
  onNeedsVerification: (id: string) => void;
  onDefer: (id: string) => void;
  onOpenDismissModal: (id: string) => void;
  onRunGeminiReEval: (id: string) => void;
  isEvaluatingAI: boolean;
}

export const EvidenceInspector: React.FC<EvidenceInspectorProps> = ({
  opportunity,
  client,
  event,
  internalResearch,
  notes,
  onMarkReviewed,
  onNeedsVerification,
  onDefer,
  onOpenDismissModal,
  onRunGeminiReEval,
  isEvaluatingAI,
}) => {
  const [activeTab, setActiveTab] = useState<'EVIDENCE' | 'CLIENT_PROFILE' | 'AUDIT_LOG'>('EVIDENCE');

  if (!client || !event) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400 text-sm">
        Select a client opportunity from the priority queue to inspect evidence.
      </div>
    );
  }

  // Filter notes relevant to this client
  const clientNotes = notes.filter((n) => n.clientId === client.id);

  const action = bankerAction(opportunity);
  const canAct = opportunity.status === 'SURFACED';

  return (
    <div data-testid="evidence-inspector" className="flex-1 flex flex-col h-full bg-slate-50/50 overflow-y-auto">
      
      {/* Top Banner: Client Header & Current Status */}
      <div className="bg-white border-b border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded">
                {client.sector}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500 font-mono">
                {client.headquarters}
              </span>
              <span className="text-slate-300">·</span>
              <span className="text-xs text-slate-500">
                Turnover: {client.annualRevenue}
              </span>
            </div>

            <h1 aria-label={client.name} className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <span>{client.name}</span>
              {client.ticker && (
                <span className="text-xs font-mono font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  {client.ticker}
                </span>
              )}
            </h1>

            <p className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
              <span>RM: <strong className="text-slate-800">{client.rmName}</strong></span>
              <span className="text-slate-300">·</span>
              <span>Treasury Lead: <strong className="text-slate-800">{client.treasuryContact.name}</strong> ({client.treasuryContact.title})</span>
            </p>
          </div>

          {/* Right Status Block */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="text-right sm:border-r sm:border-slate-200 sm:pr-4">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                Review status
              </span>
              <span className="text-xs font-semibold text-slate-800">
                {opportunity.status === 'SURFACED' && 'Pending RM Review'}
                {opportunity.status === 'REVIEWED' && 'Internal Review Recorded'}
                {opportunity.status === 'VERIFY_FIRST' && 'Verification Flagged'}
                {opportunity.status === 'DEFERRED' && 'Deferred (48h)'}
                {opportunity.status === 'DISMISSED' && 'Dismissed with Reason'}
                {opportunity.status === 'SUPPRESSED' && 'Excluded · Canceled plan'}
              </span>
            </div>

            <span className="text-xs text-slate-500">Evidence-based demo · AI refresh unavailable</span>
          </div>
        </div>

        <div className={`mt-4 p-4 rounded-lg border ${opportunity.status === 'VERIFY_FIRST' ? 'bg-amber-50 border-amber-200' : opportunity.status === 'SUPPRESSED' ? 'bg-slate-100 border-slate-300' : 'bg-emerald-50 border-emerald-200'}`} role="status">
          <h2 className="text-base font-bold">{action.label}</h2>
          <p className="text-sm leading-relaxed mt-1">{action.detail}</p>
          {canAct && <button onClick={() => onMarkReviewed(opportunity.id)} className="mt-3 px-4 py-2 rounded bg-emerald-800 text-white text-sm font-semibold hover:bg-emerald-900">Mark for Outreach Review</button>}
          <p className="text-xs text-slate-500 mt-2">Internal banker decision only · No message or transaction is sent</p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-6 mt-5 border-b border-slate-200 text-xs font-medium">
          <button
            onClick={() => setActiveTab('EVIDENCE')}
            className={`pb-2.5 transition-colors cursor-pointer relative ${
              activeTab === 'EVIDENCE'
                ? 'text-emerald-900 font-bold border-b-2 border-emerald-800'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Evidence &amp; Analysis
          </button>
          <button
            onClick={() => setActiveTab('CLIENT_PROFILE')}
            className={`pb-2.5 transition-colors cursor-pointer relative ${
              activeTab === 'CLIENT_PROFILE'
                ? 'text-emerald-900 font-bold border-b-2 border-emerald-800'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Client Profile &amp; Sensitivities
          </button>
          <button
            onClick={() => setActiveTab('AUDIT_LOG')}
            className={`pb-2.5 transition-colors cursor-pointer relative ${
              activeTab === 'AUDIT_LOG'
                ? 'text-emerald-900 font-bold border-b-2 border-emerald-800'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Policy &amp; Audit Trail ({opportunity.auditTrail.length})
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="p-5 space-y-5">

        {/* CASE: SUPPRESSED SIGNAL / EXCLUDED OPPORTUNITY */}
        {opportunity.status === 'SUPPRESSED' && (
          <div className="p-4 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                <BadgeAlert className="w-4 h-4 text-slate-600" />
                <span>SUPPRESS · Canceled Mexico-expansion thesis (CRM-7702)</span>
              </div>
              <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                Specific thesis excluded
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-900 block text-xs">
                  Market Trigger:
                </span>
                <p className="text-slate-600">
                  {event.title} ({event.publisher})
                </p>
              </div>

              <div className="p-3 bg-white rounded border border-slate-200 space-y-1">
                <span className="font-semibold text-slate-900 block text-xs">
                  Why this was excluded:
                </span>
                <p className="text-slate-700 font-medium">
                  {opportunity.suppressionAuditReason}
                </p>
              </div>
            </div>

            {/* Conditional Banker Guidance for Harbor */}
            <div className="p-3.5 bg-emerald-50/70 rounded-lg border border-emerald-200/80 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950">
                <Compass className="w-4 h-4 text-emerald-700" />
                <span>Conditional next step · No new opportunity assumed</span>
              </div>
              <p className="text-sm leading-relaxed">CRM-7702 (November 14, 2025) records the board’s cancellation of Project Nearshore and supersedes exploratory CRM-6910 (September 15, 2025). This supports suppressing that specific outreach thesis, not a claim of zero tariff exposure across Harbor’s business today. Check updated account records only if a distinct current exposure is documented.</p>
            </div>
          </div>
        )}

        {/* CASE: NEEDS VERIFICATION CALLOUT */}
        {opportunity.status === 'VERIFY_FIRST' && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800">
              <AlertOctagon className="w-4 h-4 text-amber-700" />
              <span>{client.id === 'northstar-logistics' ? 'Conflicting client guidance · Verify current intent' : 'Banker verification required'}</span>
            </div>
            <p className="text-sm leading-relaxed text-amber-950">
              {client.id === 'northstar-logistics'
                ? 'CRM-6502 (June 12, 2026): former VP Alan Miller described Southeast Asian expansion and treasury needs. CRM-7210 (September 28, 2026): Finance Director Derek Kowalski reported a board pause on Asian capex. It is not established that the earlier plans remain active, whether the pause is temporary or permanent, or whether a treasury need survives it. The Mexico tariff event does not establish a direct connection to these Asian plans.'
                : 'The banker has requested confirmation of this client’s current exposure and terms. This suggestion stays outside the actionable queue until verification; no outreach is approved.'}
            </p>
          </div>
        )}

        {activeTab === 'EVIDENCE' && (
          <>
            {/* 1. Core Synthesis: Why this client & Why Now */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <FileSearch className="w-4 h-4 text-emerald-800" />
                  Client connection &amp; timing
                </span>
                <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded font-mono">
                  {opportunity.priorityTier}
                </span>
              </div>

              {/* 16-18px semibold headings for Why this client? and Why now? */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <h3 className="text-[17px] font-semibold text-slate-900 mb-2 leading-snug">
                    Why this client?
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {opportunity.whyThisClient}
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-200/70">
                  <h3 className="text-[17px] font-semibold text-emerald-950 mb-2 leading-snug">
                    Why now?
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {opportunity.whyNow}
                  </p>
                </div>
              </div>

              {/* Explicit Financial Breakdown for Atlas Manufacturing */}
              {client.id === 'atlas-mfg' && (
                <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200 text-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-blue-200/80 pb-1.5">
                    <span className="font-bold text-blue-950 flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-blue-800" />
                      Atlas FX sensitivity · Synthetic scenario
                    </span>
                    <span className="font-mono text-[11px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded">
                      Estimated incremental cost: +$326,612.50
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
                    <div className="p-2 bg-white rounded border border-blue-200">
                      <span className="text-[10px] text-slate-500 uppercase block">Purchase Order</span>
                      <span className="font-bold font-mono text-slate-900 text-xs">€14,500,000</span>
                      <span className="text-[9px] text-slate-400 block">Precision robotic presses</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-blue-200">
                      <span className="text-[10px] text-slate-500 uppercase block">15% Deposit Paid</span>
                      <span className="font-bold font-mono text-emerald-700 text-xs">€2,175,000</span>
                      <span className="text-[9px] text-slate-400 block">Paid deposit; not a hedge</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-blue-200">
                      <span className="text-[10px] text-slate-500 uppercase block">85% Unhedged Balance</span>
                      <span className="font-bold font-mono text-amber-700 text-xs">€{atlasUnpaidEUR.toLocaleString('en-US')}</span>
                      <span className="text-[9px] text-slate-400 block">Confirm exact payment date</span>
                    </div>
                    <div className="p-2 bg-white rounded border border-blue-200">
                      <span className="text-[10px] text-slate-500 uppercase block">Rate Shock (+265 pips)</span>
                      <span className="font-bold font-mono text-rose-700 text-xs">1.0820 ➔ 1.1085</span>
                      <span className="text-[9px] text-slate-400 block">+{atlasRateChangePercent.toFixed(2)}% versus reference</span>
                    </div>
                  </div>

                  <div className="p-2.5 bg-white rounded border border-blue-200 text-slate-700 space-y-1">
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span>Variance Formula:</span>
                      <span className="font-bold text-slate-900">€12,325,000 × (1.1085 − 1.0820) = +${atlasIncrementalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px] text-rose-800">
                      <span>Hypothetical stress case (1.1150 / +330 pips):</span>
                      <span className="font-bold">€12,325,000 × (1.1150 - 1.0820) = +$406,725.00 USD</span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500">Figures are scenario sensitivities, not realized losses or executable prices. Confirm current balances, hedge coverage and timing before client contact.</p>

              {/* Estimated Exposure (Replaced Financial Exposure Hypothesis) */}
              <div className="p-3.5 rounded bg-amber-50/50 border border-amber-200 text-xs">
                <span className="font-bold text-amber-950 block mb-0.5">
                  Estimated exposure:
                </span>
                <p className="text-slate-800 leading-relaxed">
                  {opportunity.financialImpactHypothesis}
                </p>
              </div>

              {/* Recommended Questions & Specialist Hint */}
              {opportunity.recommendedQuestions.length > 0 && (
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <span className="text-xs font-bold text-slate-900 block">
                    Recommended Discovery Questions for the RM:
                  </span>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {opportunity.recommendedQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>

                  {opportunity.suggestedSpecialist && (
                    <div className="mt-3 p-3 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="text-slate-500 font-medium block">
                          Suggested Product Specialist to Invite:
                        </span>
                        <span className="font-semibold text-slate-900">
                          {opportunity.suggestedSpecialist.specialistName}
                        </span>
                        <span className="text-slate-500 ml-1">
                          · {opportunity.suggestedSpecialist.desk}
                        </span>
                      </div>
                      <span className="text-[11px] text-emerald-800 bg-emerald-100/70 px-2 py-1 rounded font-medium">
                        Focus: {opportunity.suggestedSpecialist.focus}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. Source Documents: Market Shock & Internal Bank Research */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <Globe2 className="w-4 h-4 text-emerald-800" />
                Source records · Synthetic market events &amp; research
              </span>

              {/* Public Market Event */}
              <div className="p-3.5 rounded bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <Globe2 className="w-3.5 h-3.5 text-slate-500" />
                    Synthetic market record · {event.id}
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {event.publishedAt}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{event.publisher} · Fictional scenario, not a verified publication</p>
                <h4 className="text-sm font-bold text-slate-900">
                  {event.title}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {event.summary}
                </p>
                {event.marketShockMetric && (
                  <div className="text-xs font-mono font-medium text-emerald-800 bg-emerald-100/50 px-2 py-1 rounded inline-block">
                    Market Metric: {event.marketShockMetric}
                  </div>
                )}
              </div>

              {/* Internal Research Brief (If present) */}
              {internalResearch && (
                <div className="p-3.5 rounded bg-emerald-50/40 border border-emerald-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-950 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                      Simulated research · {internalResearch.id}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      {internalResearch.publishedAt}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {internalResearch.title}
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {internalResearch.fullText}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-emerald-100">
                    <span>Desk: <strong>{internalResearch.internalAuthor}</strong></span>
                    <span className="italic text-emerald-900 font-medium">
                      {internalResearch.complianceNote}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Chronological Dated CRM Notes */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <FileText className="w-4 h-4 text-emerald-800" />
                Dated CRM evidence · Synthetic client records
              </span>

              <div className="space-y-3">
                {clientNotes.map((note) => (
                  <div
                    key={note.id}
                    data-testid="crm-note" data-client-id={note.clientId}
                    className={`p-3.5 rounded border text-sm space-y-1.5 ${
                      note.isSuperseded
                        ? 'bg-slate-100/70 border-slate-300 opacity-70'
                        : note.isConflicting
                        ? 'bg-amber-50/60 border-amber-200'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-700">
                          {note.id}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-500 font-medium">
                          {note.authorName} ({note.authorRole})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-400">
                          {note.date}
                        </span>
                        {/* Evidence Classification Tag */}
                        {note.classification === 'CONFIRMED_FACT' && (
                          <span className="font-semibold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded text-[10px]">
                            Documented in demo CRM
                          </span>
                        )}
                        {note.classification === 'EXTRACTED_CONTEXT' && (
                          <span className="font-medium text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded text-[10px]">
                            Earlier reported context
                          </span>
                        )}
                        {note.classification === 'HYPOTHESIS_NEEDS_VERIFICATION' && (
                          <span className="font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                            Needs Verification
                          </span>
                        )}
                      </div>
                    </div>

                    <h5 className="font-bold text-slate-900 text-xs">
                      {note.title}
                    </h5>

                    <p className="text-slate-700 leading-relaxed font-sans">
                      "{note.fullText}"
                    </p>

                    {note.isSuperseded && (
                      <div className="text-[11px] text-slate-500 font-medium pt-1 border-t border-slate-200 italic">
                        Note: Superseded by {note.supersededByNoteId} (Project cancellation confirmed by Board).
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'CLIENT_PROFILE' && (
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4 text-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-900 block border-b border-slate-100 pb-2">
              Corporate Account Dossier
            </span>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-400 block mb-0.5">Corporate Legal Name</span>
                <span className="font-semibold text-slate-900">{client.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Headquarters &amp; Jurisdiction</span>
                <span className="font-semibold text-slate-900">{client.headquarters}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Industry Sector</span>
                <span className="font-semibold text-slate-900">{client.sector} ({client.subSector})</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Annual Turnover</span>
                <span className="font-semibold text-slate-900">{client.annualRevenue}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Coverage Group</span>
                <span className="font-semibold text-slate-900">{client.coverageGroup}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Relationship Tier</span>
                <span className="font-semibold text-slate-900">{client.relationshipTier}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-slate-400 block mb-1">Key Operating Sensitivities</span>
              <div className="flex flex-wrap gap-2">
                {client.keySensitivities.map((s, idx) => (
                  <span key={idx} className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded font-medium">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100">
              <span className="text-slate-400 block mb-1">Key Day-to-Day Treasury Contact</span>
              <div className="p-3 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900">{client.treasuryContact.name}</span>
                  <span className="text-slate-500 ml-1">· {client.treasuryContact.title}</span>
                </div>
                <span className="font-mono text-slate-500 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {client.treasuryContact.email}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'AUDIT_LOG' && (
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Traceable Audit Trail &amp; Policy Decisions
              </span>
              <span className="text-[11px] text-slate-500">
                Simulated policy checks | Demo ruleset v1
              </span>
            </div>

            <div className="space-y-2.5">
              {opportunity.auditTrail.map((entry, idx) => (
                <div key={idx} className="p-3 rounded bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                    <span>{entry.timestamp}</span>
                    <span className="font-semibold text-emerald-800">{entry.action}</span>
                  </div>
                  <p className="text-slate-700 font-sans">
                    <strong>{entry.actor}:</strong> {entry.note}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Sticky Banker Decision Bar (Banker in Control) */}
      <div className="sticky bottom-0 bg-white border-t border-slate-200 p-4 shadow-lg z-20">
        <div className="max-w-4xl mx-auto flex flex-col items-start gap-3">
          
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <UserCheck className="w-4 h-4 text-emerald-800 shrink-0" />
            <span>
              <strong>Banker in Control:</strong> Review and decide client outreach. No messages are sent autonomously.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full">
            {/* Mark for Outreach Review (Accept) */}
            <button
              onClick={() => onMarkReviewed(opportunity.id)}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              disabled={!canAct}
              title={canAct ? "Record internal review; no outreach sent" : "Unavailable: verify evidence or retain suppression before outreach"}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark for Outreach Review</span>
            </button>

            {/* Needs Verification */}
            <button
              onClick={() => onNeedsVerification(opportunity.id)}
              className="px-3 py-2 text-xs font-medium text-amber-900 bg-amber-100 hover:bg-amber-200 rounded transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
              disabled={!canAct}
              title="Flag questions or request clarification before outreach"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-800" />
              <span>Verify First</span>
            </button>

            {/* Defer */}
            <button
              onClick={() => onDefer(opportunity.id)}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
              disabled={!canAct}
              title="Postpone triage for 48 hours"
            >
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Defer</span>
            </button>

            {/* Dismiss with Reason */}
            <button
              onClick={() => onOpenDismissModal(opportunity.id)}
              className="px-3 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
              disabled={!canAct}
              title="Dismiss recommendation and record audit reason"
            >
              <XCircle className="w-3.5 h-3.5 text-rose-600" />
              <span>Dismiss</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
};
