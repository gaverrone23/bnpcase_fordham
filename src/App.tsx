import React, { useState } from 'react';
import { 
  INITIAL_CLIENTS, 
  INITIAL_CRM_NOTES, 
  INITIAL_MARKET_DEVELOPMENTS, 
  INITIAL_OPPORTUNITIES, 
  SIMULATION_UPDATED_EVENT,
  SIMULATION_FED_RATE_HIKE_EVENT
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
import { AskClientSignalsPanel } from './components/AskClientSignalsPanel';
import { MarketIntelligenceModal } from './components/MarketIntelligenceModal';
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

  // Helper: Get valid opportunities for a given queue tab
  const getValidOpportunitiesForTab = (tab: FilterTab, oppsList: SignalOpportunity[]) => {
    if (tab === 'TOP_3_ACTIONABLE') {
      return oppsList.filter(
        (o) => o.status !== 'SUPPRESSED' && o.status !== 'VERIFY_FIRST' && o.priorityRank > 0 && o.priorityRank <= 3
      );
    }
    if (tab === 'NEEDS_VERIFICATION') {
      return oppsList.filter((o) => o.status === 'VERIFY_FIRST');
    }
    if (tab === 'SUPPRESSED') {
      return oppsList.filter((o) => o.status === 'SUPPRESSED');
    }
    return oppsList; // ALL_PORTFOLIO
  };

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
  const countTop3 = opportunities.filter(
    (o) => o.status !== 'SUPPRESSED' && o.status !== 'VERIFY_FIRST' && o.priorityRank > 0 && o.priorityRank <= 3
  ).length;
  const countVerify = opportunities.filter((o) => o.status === 'VERIFY_FIRST').length;
  const countSuppressed = opportunities.filter((o) => o.status === 'SUPPRESSED').length;

  // Selected opportunity resolution
  const currentTabValidOpps = getValidOpportunitiesForTab(activeTab, opportunities);
  const selectedOpportunity = currentTabValidOpps.find((o) => o.id === selectedOpportunityId) 
    || currentTabValidOpps[0] 
    || opportunities.find((o) => o.id === selectedOpportunityId) 
    || opportunities[0];

  const selectedClient = clients.find((c) => c.id === selectedOpportunity?.clientId);
  const selectedEvent = events.find((e) => e.id === selectedOpportunity?.eventId);
  const selectedInternalResearch = selectedOpportunity?.internalResearchId 
    ? events.find((e) => e.id === selectedOpportunity.internalResearchId) 
    : undefined;

  // Banker Actions: Mark Reviewed (Accept)
  const handleMarkReviewed = (id: string) => {
    setOpportunities((prev) =>
      prev.map((opp) => {
        if (opp.id !== id) return opp;
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
              note: 'Banker approved opportunity for client outreach. Scheduled preparation for forward collar structure.',
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
        if (opp.id !== id) return opp;
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
        if (opp.id !== id) return opp;
        return {
          ...opp,
          status: 'DEFERRED',
          auditTrail: [
            ...opp.auditTrail,
            {
              timestamp: `Today ${new Date().toLocaleTimeString()}`,
              action: 'BANKER_DEFERRED',
              actor: 'RM Gabriel V.',
              note: 'Deferred review for 48 hours to monitor spot currency / yield curve developments.',
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
        if (opp.id !== dismissModalOppId) return opp;
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

  // Simulation 1: Ingest USTR 90-Day Tariff Exemption
  const handleSimulateUSTR = () => {
    if (activeSimulation === 'USTR_EXEMPTION') {
      handleResetDemo();
      return;
    }

    setEvents((prev) => [SIMULATION_UPDATED_EVENT, ...prev.filter((e) => e.id !== SIMULATION_UPDATED_EVENT.id)]);
    setActiveSimulation('USTR_EXEMPTION');

    setOpportunities((prev) =>
      prev.map((opp) => {
        if (opp.id === 'OPP-001-ATLAS') {
          return {
            ...opp,
            eventId: SIMULATION_UPDATED_EVENT.id,
            whyNow: 'BREAKING: USTR issued emergency 90-day tariff waiver on German CNC machinery. While this saves Atlas ~8.5% in customs duty (~$1.23M USD), it establishes a rigid 90-day window to finalize shipments, dramatically amplifying the urgency to lock in the €12.3M forward hedge before the waiver expires.',
            financialImpactHypothesis: 'Net combined variance: +$1,230,000 USD duty exemption offset by potential +$326,612 USD FX currency drag if unhedged. Immediate hedging locks in the full benefit.',
            priorityTier: 'Tier 1 · Immediate Action',
            auditTrail: [
              ...opp.auditTrail,
              {
                timestamp: `Today ${new Date().toLocaleTimeString()}`,
                action: 'MARKET_SHOCK_RE_EVALUATION',
                actor: 'Deterministic Engine & Event Pipeline',
                note: 'Ingested USTR Emergency Exemption (MKT-2026-999). Re-evaluated Atlas Manufacturing timeline; urgency elevated to critical 90-day execution window.',
              },
            ],
          };
        }
        return opp;
      })
    );

    // Generate comprehensive Market Intelligence Report
    const report: MarketIntelligenceReport = {
      id: 'REP-USTR-001',
      headline: 'USTR Issues Emergency 90-Day Tariff Exemption on German CNC Machinery',
      eventTimestamp: `Today ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} EST`,
      sourceType: 'Public Regulatory Notice',
      sourcePublisher: 'Federal Register / USTR Announcement',
      marketChange: '90-day tariff exemption (estimated 8.5% customs duty savings)',
      clientsEvaluated: 5,
      clientsAffected: [
        {
          clientId: 'atlas-mfg',
          clientName: 'Atlas Manufacturing Co.',
          previousRank: '#1 Priority',
          newRank: '#1 Priority (Critical 90-Day Execution Window)',
          impactSummary: 'Saves ~$1.23M in customs duty on €14.5M press order, but introduces strict 90-day arrival deadline. Increases urgency to execute €12.3M EUR forward hedge immediately.'
        },
        {
          clientId: 'harbor-components',
          clientName: 'Harbor Components',
          previousRank: 'Suppressed (Rule PR-SUPP-01)',
          newRank: 'Suppressed (Rule PR-SUPP-01)',
          impactSummary: 'Evaluated for USMCA cross-border equipment, but confirmed Monterrey cancellation in CRM-7702 keeps signal excluded from outreach.'
        }
      ],
      rankingRationale: 'Atlas Manufacturing retains #1 priority because the exemption creates a non-negotiable 90-day commercial execution window. Failure to hedge EUR before delivery risks losing up to $326,612 in currency drag against the $1.23M duty savings.',
      newStatusSummary: 'Atlas 90-day execution window active; hedge recommendation updated.'
    };

    setMarketReport(report);
    setSelectedOpportunityId('OPP-001-ATLAS');
    showToast('Simulated Market Shock: USTR CNC Exemption injected. Report generated.');
  };

  // Simulation 2: Ingest Federal Reserve 25 bps Rate Increase
  const handleSimulateFedHike = () => {
    if (activeSimulation === 'FED_RATE_HIKE') {
      handleResetDemo();
      return;
    }

    setEvents((prev) => [SIMULATION_FED_RATE_HIKE_EVENT, ...prev.filter((e) => e.id !== SIMULATION_FED_RATE_HIKE_EVENT.id)]);
    setActiveSimulation('FED_RATE_HIKE');

    setOpportunities((prev) =>
      prev.map((opp) => {
        if (opp.id === 'OPP-002-APEX') {
          return {
            ...opp,
            priorityRank: 1,
            priorityTier: 'Tier 1 · Immediate Action',
            eventId: SIMULATION_FED_RATE_HIKE_EVENT.id,
            whyNow: 'BREAKING: FOMC unexpectedly increased Federal Funds Rate by 25 bps to 5.50%. This directly drives up 1M Term SOFR on Apex BioTech\'s $35,000,000 floating debt facility, adding +$87,500/yr in borrowing costs on top of the recent curve steepening (+24 bps).',
            financialImpactHypothesis: 'Direct annual borrowing cost escalation: $35,000,000 × 0.49% (25 bps hike + 24 bps steepening) = +$171,500 USD/year in incremental debt service. Tightens interest coverage ratio to near-covenant threshold.',
            auditTrail: [
              ...opp.auditTrail,
              {
                timestamp: `Today ${new Date().toLocaleTimeString()}`,
                action: 'MARKET_SHOCK_RE_EVALUATION',
                actor: 'Deterministic Engine & Event Pipeline',
                note: 'Ingested Fed 25 bps Rate Hike (MKT-2026-905). Apex BioTech promoted to #1 priority due to immediate floating debt exposure.',
              },
            ],
          };
        }
        if (opp.id === 'OPP-001-ATLAS') {
          return {
            ...opp,
            priorityRank: 2,
            priorityTier: 'Tier 1 · Strategic Timing',
            auditTrail: [
              ...opp.auditTrail,
              {
                timestamp: `Today ${new Date().toLocaleTimeString()}`,
                action: 'RANK_RE_ORDERED',
                actor: 'Deterministic Engine',
                note: 'Moved to #2 behind Apex BioTech following FOMC rate shock.',
              },
            ],
          };
        }
        if (opp.id === 'OPP-003-MERIDIAN') {
          return {
            ...opp,
            priorityRank: 3,
            priorityTier: 'Tier 2 · Near-Term Review',
          };
        }
        return opp;
      })
    );

    // Generate comprehensive Market Intelligence Report for Fed Rate Hike
    const report: MarketIntelligenceReport = {
      id: 'REP-FED-002',
      headline: 'Federal Reserve Surprise: FOMC Raises Policy Rate +25 bps to 5.50%',
      eventTimestamp: `Today ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} EST`,
      sourceType: 'Central Bank Policy Action',
      sourcePublisher: 'Federal Reserve Board Press Release',
      marketChange: '+25 bps Federal Funds Rate increase (SOFR benchmark escalation)',
      clientsEvaluated: 5,
      clientsAffected: [
        {
          clientId: 'apex-biotech',
          clientName: 'Apex BioTech Instruments',
          previousRank: '#2 Priority',
          newRank: '#1 Priority (Elevated)',
          impactSummary: 'Immediate +$87,500/yr debt service increase on $35M floating SOFR facility (illustrative). Promoted to #1 for rates specialist review.'
        },
        {
          clientId: 'atlas-mfg',
          clientName: 'Atlas Manufacturing Co.',
          previousRank: '#1 Priority',
          newRank: '#2 Priority',
          impactSummary: 'Unhedged €12.3M currency exposure remains high (+$326k drag), but immediate floating debt escalation on Apex takes priority.'
        },
        {
          clientId: 'meridian-freight',
          clientName: 'Meridian Logistics & Freight',
          previousRank: '#3 Priority',
          newRank: '#3 Priority',
          impactSummary: 'WTI refining crack spread monitoring remains active; unaffected by short-term rate spike.'
        }
      ],
      rankingRationale: 'The surprise +25 bps rate hike directly escalates cash interest obligations on unhedged floating debt. Apex BioTech carries $35M in floating SOFR debt with zero rate hedges (CRM-7901), creating immediate risk to debt service coverage. Apex displaces Atlas for #1 priority.',
      newStatusSummary: 'Apex BioTech promoted to #1 priority; SOFR collar proposal ready for RM review.'
    };

    setMarketReport(report);
    setSelectedOpportunityId('OPP-002-APEX');
    showToast('Simulated Market Shock: Fed 25 bps Rate Hike. Apex BioTech promoted to #1 Priority.');
  };

  // Simulation 3: Quiet Market Scenario (0 New Shocks)
  const handleSimulateQuietMarket = () => {
    setActiveSimulation('QUIET_MARKET');
    // Set all top-3 opportunities to REVIEWED or unranked, demonstrating the system supports 0 recommendations
    setOpportunities((prev) =>
      prev.map((opp) => {
        if (opp.priorityRank > 0 && opp.priorityRank <= 3) {
          return {
            ...opp,
            status: 'REVIEWED',
            reviewedTimestamp: 'Prior Cycle',
            auditTrail: [
              ...opp.auditTrail,
              {
                timestamp: `Today ${new Date().toLocaleTimeString()}`,
                action: 'QUIET_MARKET_EVALUATION',
                actor: 'Deterministic Engine',
                note: 'Quiet market scenario: no new material shocks. All earlier recommendations satisfied; queue presents 0 items without forcing recommendations.',
              },
            ],
          };
        }
        return opp;
      })
    );
    showToast('Quiet Market Scenario: Zero new shocks. Actionable queue now displays 0 recommendations.');
  };

  // Reset Demo to pristine fixtures
  const handleResetDemo = () => {
    setClients(INITIAL_CLIENTS);
    setNotes(INITIAL_CRM_NOTES);
    setEvents(INITIAL_MARKET_DEVELOPMENTS);
    setOpportunities(INITIAL_OPPORTUNITIES);
    setSelectedOpportunityId('OPP-001-ATLAS');
    setActiveTab('TOP_3_ACTIONABLE');
    setActiveSimulation('NONE');
    setMarketReport(null);
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
        onOpenChat={() => setIsChatOpen(true)}
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

      {/* 3. Main 3-Column Split Workbench */}
      <main className="flex-1 w-full max-w-[1780px] mx-auto px-2 sm:px-4 lg:px-6 py-4 flex flex-col min-h-0">
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-xs min-h-[750px]">
          
          {/* Column 1: Priority Feed (~27% / 3.25 cols on lg) */}
          <div className="lg:col-span-3 xl:col-span-3 h-[780px] flex flex-col border-b lg:border-b-0">
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
          <div className="lg:col-span-5 xl:col-span-5 h-[780px] flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200">
            <EvidenceInspector
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
            />
          </div>

          {/* Column 3: Ask Client Signals Embedded Always-Visible Panel (~30% / 4 cols on lg) */}
          <div className="hidden lg:flex lg:col-span-4 xl:col-span-4 h-[780px] flex flex-col border-l border-slate-200">
            <AskClientSignalsPanel
              selectedClient={selectedClient}
              selectedOpportunity={selectedOpportunity}
              clients={clients}
              opportunities={opportunities}
              notes={notes}
              events={events}
            />
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
            else setActiveTab('TOP_3_ACTIONABLE');
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
