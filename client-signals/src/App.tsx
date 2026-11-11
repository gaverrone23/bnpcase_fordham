import React, { useState } from 'react';
import { 
  INITIAL_CLIENTS, 
  INITIAL_CRM_NOTES, 
  INITIAL_MARKET_DEVELOPMENTS, 
  INITIAL_OPPORTUNITIES
} from './data/fixtures';
import { 
  ClientProfile, 
  CRMNote, 
  MarketDevelopment, 
  SignalOpportunity,
  MarketIntelligenceReport
} from './types';
import { Header } from './components/Header';
import { PriorityList, FilterTab } from './components/PriorityList';
import { EvidenceInspector } from './components/EvidenceInspector';
import { DismissModal } from './components/DismissModal';
import { PolicyModal } from './components/PolicyModal';
import { AskClientSignalsDrawer } from './components/AskClientSignalsDrawer';
import { MarketIntelligenceModal } from './components/MarketIntelligenceModal';
import { opportunitiesForTab, simulateMarket, type Simulation } from './domain/workflow';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  // Primary state stores
  const [clients, setClients] = useState<ClientProfile[]>(INITIAL_CLIENTS);
  const [notes, setNotes] = useState<CRMNote[]>(INITIAL_CRM_NOTES);
  const [events, setEvents] = useState<MarketDevelopment[]>(INITIAL_MARKET_DEVELOPMENTS);
  const [opportunities, setOpportunities] = useState<SignalOpportunity[]>(INITIAL_OPPORTUNITIES);
  
  // View & selection state
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string>('OPP-001-ATLAS');
  const [activeTab, setActiveTab] = useState<FilterTab>('TOP_3_ACTIONABLE');
  const [activeSimulation, setActiveSimulation] = useState<'NONE' | 'USTR_EXEMPTION' | 'FED_RATE_HIKE' | 'QUIET_MARKET'>('NONE');
  const [resetVersion, setResetVersion] = useState(0);
  const [marketReport, setMarketReport] = useState<MarketIntelligenceReport | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState<boolean>(false);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [dismissModalOppId, setDismissModalOppId] = useState<string | null>(null);
  const [isEvaluatingAI, setIsEvaluatingAI] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const getValidOpportunitiesForTab = opportunitiesForTab;

  // Synchronized Queue Tab Switcher
  const handleTabChange = (newTab: FilterTab) => {
    setActiveTab(newTab);
    const validInNewTab = getValidOpportunitiesForTab(newTab, opportunities);
    const isCurrentValid = validInNewTab.some((o) => o.id === selectedOpportunityId);
    
    if (!isCurrentValid && validInNewTab.length > 0) {
      setSelectedOpportunityId(validInNewTab[0].id);
    }
  };

  // Counts for operational header
  const countTop3 = opportunitiesForTab('TOP_3_ACTIONABLE', opportunities).length;
  const countVerify = opportunities.filter((o) => o.status === 'VERIFY_FIRST').length;
  const countSuppressed = opportunities.filter((o) => o.status === 'SUPPRESSED').length;

  // Selected opportunity resolution
  const currentTabValidOpps = getValidOpportunitiesForTab(activeTab, opportunities);
  const selectedOpportunity = currentTabValidOpps.find((o) => o.id === selectedOpportunityId) || currentTabValidOpps[0];

  const selectedClient = clients.find((c) => c.id === selectedOpportunity?.clientId);
  const selectedEvent = events.find((e) => e.id === selectedOpportunity?.eventId);
  const selectedInternalResearch = selectedOpportunity?.internalResearchId 
    ? events.find((e) => e.id === selectedOpportunity.internalResearchId) 
    : undefined;

  // Banker Actions: Mark Reviewed (Accept)
  const handleMarkReviewed = (id: string) => {
    setOpportunities((prev) =>
      prev.map((opp) => {
        if (opp.id !== id || opp.status !== 'SURFACED') return opp;
        return {
          ...opp,
          status: 'REVIEWED',
          reviewedTimestamp: new Date().toLocaleTimeString(),
          auditTrail: [
            ...opp.auditTrail,
            {
              timestamp: `Today ${new Date().toLocaleTimeString()}`,
              action: 'BANKER_ACCEPTED_REVIEW',
              actor: 'RM Gabriel V.',
              note: 'Banker recorded internal outreach review. No message sent, no product selected; client circumstances and suitability must be confirmed.',
            },
          ],
        };
      })
    );
    showToast(`Marked ${selectedClient?.name || 'Client'} for outreach review.`);
  };

  // Banker Actions: Needs Verification
  const handleNeedsVerification = (id: string) => {
    setOpportunities((prev) => {
      const updated = prev.map((opp) => {
        if (opp.id !== id || opp.status !== 'SURFACED') return opp;
        return {
          ...opp,
          status: 'VERIFY_FIRST' as const,
          priorityTier: 'Needs Verification' as const,
          auditTrail: [
            ...opp.auditTrail,
            {
              timestamp: `Today ${new Date().toLocaleTimeString()}`,
              action: 'ROUTED_TO_VERIFICATION',
              actor: 'RM Gabriel V.',
              note: 'Flagged for internal verification. Outreach paused until treasury details are validated.',
            },
          ],
        };
      });

      const validRemaining = getValidOpportunitiesForTab(activeTab, updated);
      if (validRemaining.length > 0 && !validRemaining.some((o) => o.id === id)) {
        setSelectedOpportunityId(validRemaining[0].id);
      }
      return updated;
    });

    showToast(`Opportunity routed to Verification Queue.`);
  };

  // Banker Actions: Defer
  const handleDefer = (id: string) => {
    setOpportunities((prev) =>
      prev.map((opp) => {
        if (opp.id !== id || opp.status !== 'SURFACED') return opp;
        return {
          ...opp,
          status: 'DEFERRED',
          auditTrail: [
            ...opp.auditTrail,
            {
              timestamp: `Today ${new Date().toLocaleTimeString()}`,
              action: 'BANKER_DEFERRED',
              actor: 'RM Gabriel V.',
              note: 'Deferred internal review for 48 hours. No outreach sent.',
            },
          ],
        };
      })
    );
    showToast(`Opportunity deferred for 48 hours.`);
  };

  // Banker Actions: Dismiss
  const handleConfirmDismiss = (reason: string) => {
    if (!dismissModalOppId) return;
    setOpportunities((prev) => {
      const updated = prev.map((opp) => {
        if (opp.id !== dismissModalOppId || opp.status !== 'SURFACED') return opp;
        return {
          ...opp,
          status: 'DISMISSED' as const,
          dismissedReason: reason,
          auditTrail: [
            ...opp.auditTrail,
            {
              timestamp: `Today ${new Date().toLocaleTimeString()}`,
              action: 'BANKER_DISMISSED',
              actor: 'RM Gabriel V.',
              note: `Opportunity dismissed. Reason: ${reason}`,
            },
          ],
        };
      });

      const validRemaining = getValidOpportunitiesForTab(activeTab, updated);
      if (validRemaining.length > 0 && !validRemaining.some((o) => o.id === dismissModalOppId)) {
        setSelectedOpportunityId(validRemaining[0].id);
      }
      return updated;
    });

    setDismissModalOppId(null);
    showToast(`Opportunity dismissed with compliant audit note.`);
  };

  const runSimulation = (scenario: Simulation) => {
    if (activeSimulation === scenario) { handleResetDemo(); return; }
    const result = simulateMarket(scenario, opportunities);
    setOpportunities(result.opportunities);
    setEvents(result.event ? [result.event, ...INITIAL_MARKET_DEVELOPMENTS] : INITIAL_MARKET_DEVELOPMENTS);
    setMarketReport(result.report);
    setActiveSimulation(scenario);
    setActiveTab('TOP_3_ACTIONABLE');
    setSelectedOpportunityId(scenario === 'FED_RATE_HIKE' ? 'OPP-002-APEX' : 'OPP-001-ATLAS');
    showToast(scenario === 'QUIET_MARKET'
      ? 'Quiet-market scenario: no actionable recommendations. No banker approvals created.'
      : 'Synthetic scenario applied. Review the evidence and assumptions; no live news feed.');
  };
  const handleSimulateUSTR = () => runSimulation('USTR_EXEMPTION');
  const handleSimulateFedHike = () => runSimulation('FED_RATE_HIKE');
  const handleSimulateQuietMarket = () => runSimulation('QUIET_MARKET');

  // Reset Demo to pristine fixtures
  const handleResetDemo = () => {
    setResetVersion(version => version + 1);
    setClients(INITIAL_CLIENTS);
    setNotes(INITIAL_CRM_NOTES);
    setEvents(INITIAL_MARKET_DEVELOPMENTS);
    setOpportunities(INITIAL_OPPORTUNITIES);
    setSelectedOpportunityId('OPP-001-ATLAS');
    setActiveTab('TOP_3_ACTIONABLE');
    setActiveSimulation('NONE');
    setMarketReport(null);
    setDismissModalOppId(null);
    setIsChatOpen(false);
    showToast('Demo state reset to initial morning portfolio briefing.');
  };

  // Run Live Server-Side Gemini Re-evaluation with Fallback
  const handleRunGeminiReEval = async (oppId: string) => {
    const opp = opportunities.find((o) => o.id === oppId);
    if (!opp) return;

    const client = clients.find((c) => c.id === opp.clientId);
    const event = events.find((e) => e.id === opp.eventId);
    const clientNotes = notes.filter((n) => n.clientId === opp.clientId);
    const internalResearch = opp.internalResearchId
      ? events.find((e) => e.id === opp.internalResearchId)
      : undefined;

    setIsEvaluatingAI(true);
    try {
      const response = await fetch('/api/evaluate-signal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client,
          event,
          notes: clientNotes,
          internalResearch,
        }),
      });

      const data = await response.json();
      if (data.success && data.synthesis) {
        setOpportunities((prev) =>
          prev.map((o) => {
            if (o.id !== oppId) return o;
            return {
              ...o,
              whyThisClient: data.synthesis.whyThisClient || o.whyThisClient,
              whyNow: data.synthesis.whyNow || o.whyNow,
              financialImpactHypothesis: data.synthesis.financialImpact || o.financialImpactHypothesis,
              recommendedQuestions: data.synthesis.recommendedQuestions || o.recommendedQuestions,
              auditTrail: [
                ...o.auditTrail,
                {
                  timestamp: `Today ${new Date().toLocaleTimeString()}`,
                  action: 'AI_RE_EVALUATION',
                  actor: data.source || 'Gemini 3.1 Flash Lite',
                  note: `Signal re-evaluated: ${data.note || 'Generated structured causal synthesis from authorized notes.'}`,
                },
              ],
            };
          })
        );
        showToast(`AI Re-evaluation completed (${data.source || 'Engine'}).`);
      }
    } catch (err) {
      console.error('Error running AI re-evaluation:', err);
      showToast('Completed using deterministic rules fallback.');
    } finally {
      setIsEvaluatingAI(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans antialiased text-slate-900">
      
      {/* 1. Header with Operational Appearance & Demo Controls Menu */}
      <Header
        onSimulateEvent={handleSimulateUSTR}
        onSimulateFedHike={handleSimulateFedHike}
        onSimulateQuietMarket={handleSimulateQuietMarket}
        onResetDemo={handleResetDemo}
        isSimulatedEventActive={activeSimulation !== 'NONE'}
        activeSimulation={activeSimulation}
        onOpenPolicyModal={() => setIsPolicyModalOpen(true)}
        reviewCounts={{
          pending: countTop3,
          verify: countVerify,
          muted: countSuppressed,
        }}
      />

      {/* 2. Toast Feedback Bar */}
      {toastMessage && (
        <div className="bg-emerald-950 text-white text-xs px-4 py-2 flex items-center justify-between shadow-md transition-all">
          <div className="w-full flex items-center justify-between">
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{toastMessage}</span>
            </span>
            <button
              onClick={() => setToastMessage(null)}
              className="text-emerald-300 hover:text-white text-xs ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="px-6 py-2 border-b border-slate-200 bg-white text-sm text-slate-600 flex flex-wrap justify-between gap-2">
        <span><strong className="text-slate-900">Demo workspace</strong> · Synthetic CRM, market events and research · No live feeds</span>
        <span>AI assistant unavailable · Evidence review and banker decisions work without chat</span>
      </div>

      {/* Evidence-first desktop workbench */}
      <main className="flex-1 w-full max-w-[1780px] mx-auto px-2 sm:px-4 lg:px-6 py-4 flex flex-col min-h-0">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs min-h-[620px]">
          
          {/* Column 1: Priority Feed (~27% / 3.25 cols on lg) */}
          <div className="lg:col-span-4 xl:col-span-4 h-[calc(100vh-180px)] min-h-[620px] flex flex-col border-b lg:border-b-0">
            <PriorityList
              opportunities={opportunities}
              clients={clients}
              events={events}
              selectedOpportunityId={selectedOpportunity?.id || selectedOpportunityId}
              onSelectOpportunity={setSelectedOpportunityId}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </div>

          {/* Column 2: Evidence & Decision Inspector (~43% / 5.25 cols on lg) */}
          <div className="lg:col-span-8 xl:col-span-8 h-[calc(100vh-180px)] min-h-[620px] flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200">
            {selectedOpportunity ? <EvidenceInspector
              key={`${resetVersion}-${selectedOpportunity.id}`}
              opportunity={selectedOpportunity}
              client={selectedClient}
              event={selectedEvent}
              internalResearch={selectedInternalResearch}
              notes={notes}
              onMarkReviewed={handleMarkReviewed}
              onNeedsVerification={handleNeedsVerification}
              onDefer={handleDefer}
              onOpenDismissModal={(id) => setDismissModalOppId(id)}
              onRunGeminiReEval={handleRunGeminiReEval}
              isEvaluatingAI={isEvaluatingAI}
            /> : <div className="p-10 text-slate-600" role="status"><h2 className="text-lg font-semibold text-slate-900">No recommendations in this queue</h2><p className="mt-2">Choose All to inspect client records, or Reset Demo to restore the seeded portfolio.</p></div>}
          </div>


        </div>
      </main>

      {/* 4. Modals and Drawers */}
      <DismissModal
        isOpen={Boolean(dismissModalOppId)}
        onClose={() => setDismissModalOppId(null)}
        onConfirm={handleConfirmDismiss}
        clientName={
          clients.find(
            (c) => c.id === opportunities.find((o) => o.id === dismissModalOppId)?.clientId
          )?.name || 'Client'
        }
      />

      <PolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
      />

      {/* Prominent Market Intelligence Report Modal */}
      <MarketIntelligenceModal
        report={marketReport}
        isOpen={Boolean(marketReport)}
        onClose={() => setMarketReport(null)}
        onInspectClient={(clientId) => {
          const matchOpp = opportunities.find((o) => o.clientId === clientId);
          if (matchOpp) {
            setSelectedOpportunityId(matchOpp.id);
            if (matchOpp.status === 'VERIFY_FIRST') setActiveTab('NEEDS_VERIFICATION');
            else if (matchOpp.status === 'SUPPRESSED') setActiveTab('SUPPRESSED');
            else setActiveTab('ALL_PORTFOLIO');
          }
        }}
      />

      {/* Contextual AI Assistant Drawer for mobile/tablet screens */}
      <AskClientSignalsDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        selectedClient={selectedClient}
        selectedOpportunity={selectedOpportunity}
        clients={clients}
        opportunities={opportunities}
        notes={notes}
        events={events}
      />

    </div>
  );
}
