import React from 'react';
import { X, Zap, ArrowRight, ShieldCheck, CheckCircle2, TrendingUp, AlertTriangle } from 'lucide-react';
import { MarketIntelligenceReport } from '../types';

interface MarketIntelligenceModalProps {
  report: MarketIntelligenceReport | null;
  isOpen: boolean;
  onClose: () => void;
  onInspectClient: (clientId: string) => void;
}

export const MarketIntelligenceModal: React.FC<MarketIntelligenceModalProps> = ({
  report,
  isOpen,
  onClose,
  onInspectClient,
}) => {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-wider text-amber-400 uppercase">
                  Market Intelligence Update
                </span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs text-slate-300 font-mono">
                  {report.eventTimestamp}
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight mt-0.5">
                {report.headline}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Source &amp; Ingestion</span>
              <span className="font-semibold text-slate-900">{report.sourcePublisher}</span>
              <span className="text-[10px] text-slate-500 block italic">({report.sourceType})</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Coverage Scope</span>
              <span className="font-semibold text-slate-900">{report.clientsEvaluated} Accounts Evaluated</span>
              <span className="text-[10px] text-slate-500 block">Portfolio-wide scan</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Material Shock</span>
              <span className="font-semibold text-emerald-800">{report.marketChange}</span>
            </div>
          </div>

          {/* Affected Clients & Shift in Positions */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-700" />
              Clients Evaluated &amp; Priority Shift Analysis
            </h3>

            <div className="space-y-2.5">
              {report.clientsAffected.map((affected) => (
                <div
                  key={affected.clientId}
                  className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-emerald-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {affected.clientName}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 font-mono">
                        Prior: <strong className="text-slate-700 font-semibold">{affected.previousRank}</strong>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        Updated: <strong className="text-emerald-800 font-bold">{affected.newRank}</strong>
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {affected.impactSummary}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onInspectClient(affected.clientId);
                      onClose();
                    }}
                    className="self-start sm:self-center px-3 py-1.5 rounded bg-emerald-800 hover:bg-emerald-900 text-white font-semibold text-xs whitespace-nowrap transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Inspect Evidence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking Rationale & Explanation */}
          <div className="p-4 rounded-lg bg-emerald-50/60 border border-emerald-200/80 text-emerald-950 space-y-1.5">
            <span className="font-bold text-xs uppercase tracking-wider text-emerald-900 block">
              Prioritization Rationale
            </span>
            <p className="text-xs text-slate-700 leading-relaxed">
              {report.rankingRationale}
            </p>
          </div>

          {/* Newly Actionable / Suppressed Status */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Status: {report.newStatusSummary}</span>
            </span>
            <span className="text-[11px] text-slate-400 italic">
              Simulated scenario · Authorized records unchanged
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Banker review required before client contact.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
          >
            Acknowledge &amp; Return to Workbench
          </button>
        </div>

      </div>
    </div>
  );
};
