import React from 'react';
import { SignalOpportunity, ClientProfile, MarketDevelopment } from '../types';
import { Clock, AlertTriangle, EyeOff, CheckCircle2, ChevronRight, Sparkles } from 'lucide-react';

export type FilterTab = 'TOP_3_ACTIONABLE' | 'NEEDS_VERIFICATION' | 'SUPPRESSED' | 'ALL_PORTFOLIO';

interface PriorityListProps {
  opportunities: SignalOpportunity[];
  clients: ClientProfile[];
  events: MarketDevelopment[];
  selectedOpportunityId: string;
  onSelectOpportunity: (id: string) => void;
  activeTab: FilterTab;
  onTabChange: (tab: FilterTab) => void;
}

export const PriorityList: React.FC<PriorityListProps> = ({
  opportunities,
  clients,
  events,
  selectedOpportunityId,
  onSelectOpportunity,
  activeTab,
  onTabChange,
}) => {
  const getClient = (clientId: string) => clients.find((c) => c.id === clientId);
  const getEvent = (eventId: string) => events.find((e) => e.id === eventId);

  // Filter based on active tab
  const filteredOpportunities = opportunities.filter((opp) => {
    if (activeTab === 'TOP_3_ACTIONABLE') {
      return (
        opp.status !== 'SUPPRESSED' && 
        opp.status !== 'VERIFY_FIRST' && 
        opp.priorityRank > 0 && 
        opp.priorityRank <= 3
      );
    }
    if (activeTab === 'NEEDS_VERIFICATION') {
      return opp.status === 'VERIFY_FIRST';
    }
    if (activeTab === 'SUPPRESSED') {
      return opp.status === 'SUPPRESSED';
    }
    return true; // ALL_PORTFOLIO
  });

  // Tab counts
  const countTop3 = opportunities.filter(
    (o) => o.status !== 'SUPPRESSED' && o.status !== 'VERIFY_FIRST' && o.priorityRank > 0 && o.priorityRank <= 3
  ).length;
  const countVerify = opportunities.filter((o) => o.status === 'VERIFY_FIRST').length;
  const countSuppressed = opportunities.filter((o) => o.status === 'SUPPRESSED').length;
  const countAll = opportunities.length;

  return (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      
      {/* Header & Filter Tabs */}
      <div className="p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              {activeTab === 'TOP_3_ACTIONABLE'
                ? "Today's Client Priorities"
                : activeTab === 'NEEDS_VERIFICATION'
                ? 'Verification Required'
                : activeTab === 'SUPPRESSED'
                ? 'Suppressed Signals (Deterministic)'
                : 'All Portfolio Accounts'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'TOP_3_ACTIONABLE'
                ? 'Ranked by timing urgency and documented client exposure'
                : activeTab === 'NEEDS_VERIFICATION'
                ? 'Conflicting or stale notes withheld from active outreach'
                : activeTab === 'SUPPRESSED'
                ? 'Candidate matches excluded due to documented thesis invalidation'
                : 'Complete corporate coverage portfolio'}
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg text-xs font-medium">
          <button
            onClick={() => onTabChange('TOP_3_ACTIONABLE')}
            className={`py-1.5 px-2 rounded text-center transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'TOP_3_ACTIONABLE'
                ? 'bg-white text-emerald-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Top 3 ({countTop3})
          </button>

          <button
            onClick={() => onTabChange('NEEDS_VERIFICATION')}
            className={`py-1.5 px-2 rounded text-center transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'NEEDS_VERIFICATION'
                ? 'bg-white text-amber-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Verify ({countVerify})
          </button>

          <button
            onClick={() => onTabChange('SUPPRESSED')}
            className={`py-1.5 px-2 rounded text-center transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'SUPPRESSED'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Muted ({countSuppressed})
          </button>

          <button
            onClick={() => onTabChange('ALL_PORTFOLIO')}
            className={`py-1.5 px-2 rounded text-center transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ALL_PORTFOLIO'
                ? 'bg-white text-slate-900 font-semibold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({countAll})
          </button>
        </div>
      </div>

      {/* List Feed */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredOpportunities.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No opportunities in this queue.
          </div>
        ) : (
          filteredOpportunities.map((opp) => {
            const client = getClient(opp.clientId);
            const event = getEvent(opp.eventId);
            const isSelected = opp.id === selectedOpportunityId;

            return (
              <div
                key={opp.id}
                onClick={() => onSelectOpportunity(opp.id)}
                className={`p-4 transition-all cursor-pointer text-left relative ${
                  isSelected
                    ? 'bg-emerald-50/60 border-l-4 border-emerald-700'
                    : 'hover:bg-slate-50 border-l-4 border-transparent'
                }`}
              >
                {/* Top Row: Rank/Tier & Status */}
                <div className="flex items-center justify-between gap-2 mb-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    {opp.priorityRank > 0 && (
                      <span className="font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.5 rounded text-[11px] font-mono">
                        #{opp.priorityRank} Priority
                      </span>
                    )}
                    <span className="font-semibold text-slate-800">
                      {opp.priorityTier}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  <div>
                    {opp.status === 'REVIEWED' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" />
                        Review Scheduled
                      </span>
                    )}
                    {opp.status === 'DEFERRED' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        <Clock className="w-3 h-3" />
                        Deferred (48h)
                      </span>
                    )}
                    {opp.status === 'DISMISSED' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        Dismissed
                      </span>
                    )}
                    {opp.status === 'VERIFY_FIRST' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" />
                        Verify First
                      </span>
                    )}
                    {opp.status === 'SUPPRESSED' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded">
                        <EyeOff className="w-3 h-3" />
                        Suppressed
                      </span>
                    )}
                    {opp.status === 'SURFACED' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-100/50 px-2 py-0.5 rounded">
                        Action Required
                      </span>
                    )}
                  </div>
                </div>

                {/* Client Name & Sector */}
                <div className="mb-1">
                  <span className="font-bold text-slate-900 text-sm hover:text-emerald-800 transition-colors">
                    {client?.name}
                  </span>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span>{client?.sector}</span>
                    <span aria-hidden="true">·</span>
                    <span>Rev: {client?.annualRevenue}</span>
                  </div>
                </div>

                {/* Event Headline */}
                <div className="text-xs text-slate-700 font-medium line-clamp-1 mb-2">
                  <span className="text-slate-400 font-normal">Market Shock: </span>
                  {event?.title}
                </div>

                {/* "Why Now" Kicker */}
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-white/70 p-2 rounded border border-slate-100 mb-2">
                  <strong className="text-slate-800 font-semibold">Why Now: </strong>
                  {opp.whyNow}
                </p>

                {/* Explainable Factor Pills (No black-box scores) */}
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-slate-500 pt-1 border-t border-slate-100/80">
                  <span>Urgency: <strong className="text-slate-700 font-medium">{opp.factors.timingUrgency}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Exposure: <strong className="text-slate-700 font-medium">{opp.factors.clientExposureDepth}</strong></span>
                  <span aria-hidden="true">·</span>
                  <span>Evidence: <strong className="text-slate-700 font-medium">{opp.factors.evidenceFreshness}</strong></span>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100" />
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-emerald-700" />
          Deterministic gate active
        </span>
        <span className="font-mono tabular-nums">5 Clients Evaluated</span>
      </div>

    </div>
  );
};
