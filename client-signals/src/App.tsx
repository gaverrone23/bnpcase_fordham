import React, { useEffect, useState } from "react";
import {
  INITIAL_CLIENTS,
  INITIAL_CRM_NOTES,
  INITIAL_MARKET_DEVELOPMENTS,
  INITIAL_OPPORTUNITIES,
} from "./data/fixtures";
import type {
  SignalOpportunity,
  MarketDevelopment,
  MarketIntelligenceReport,
} from "./types";
import { Header } from "./components/Header";
import { PriorityList, type FilterTab } from "./components/PriorityList";
import { EvidenceInspector } from "./components/EvidenceInspector";
import { DismissModal } from "./components/DismissModal";
import { PolicyModal } from "./components/PolicyModal";
import { AskClientSignalsDrawer } from "./components/AskClientSignalsDrawer";
import { MarketIntelligenceModal } from "./components/MarketIntelligenceModal";
import { MyPortfolio } from "./components/MyPortfolio";
import { ClientActionPlan } from "./components/ClientActionPlan";
import { applySignalEvidenceGate } from "./domain/signalEvidence";
import { DEMO_PERSONAS, canDemoPermission, scopeDemoClients, type DemoPersonaId } from "./domain/demoAccess";
import {
  opportunitiesForTab,
  simulateMarket,
  type Simulation,
} from "./domain/workflow";
import {
  restoreDecision,
  type InternalFollowUp,
} from "./domain/clientWorkflow";

const TASK_KEY = "client-signals-internal-follow-ups-v1";
function readTasks(): InternalFollowUp[] {
  try {
    const value = JSON.parse(localStorage.getItem(TASK_KEY) || "[]");
    return Array.isArray(value)
      ? value
          .filter(
            (t) =>
              t &&
              typeof t.id === "string" &&
              INITIAL_CLIENTS.some((c) => c.id === t.clientId) &&
              typeof t.text === "string" &&
              typeof t.completed === "boolean" &&
              typeof t.createdAt === "string",
          )
          .slice(-200)
      : [];
  } catch {
    return [];
  }
}

export default function App() {
  const [personaId, setPersonaId] = useState<DemoPersonaId>("rm-primary");
  const persona = DEMO_PERSONAS[personaId];
  const visibleClients = scopeDemoClients(personaId);
  const visibleIds = new Set(visibleClients.map(c => c.id));
  const canEdit = canDemoPermission(personaId, "edit");
  const canComment = canDemoPermission(personaId, "comment");
  const [events, setEvents] = useState<MarketDevelopment[]>(
    INITIAL_MARKET_DEVELOPMENTS,
  );
  const [opportunities, setOpportunities] = useState<SignalOpportunity[]>(
    () => simulateMarket("NONE", INITIAL_OPPORTUNITIES).opportunities,
  );
  const [primaryView, setPrimaryView] = useState<"PORTFOLIO" | "SIGNALS">(
    "SIGNALS",
  );
  const [portfolioClientId, setPortfolioClientId] = useState("atlas-mfg");
  const [selectedOpportunityId, setSelectedOpportunityId] =
    useState("OPP-001-ATLAS");
  const [activeTab, setActiveTab] = useState<FilterTab>("TOP_3_ACTIONABLE");
  const [activeSimulation, setActiveSimulation] = useState<Simulation>("NONE");
  const [resetVersion, setResetVersion] = useState(0);
  const [marketReport, setMarketReport] =
    useState<MarketIntelligenceReport | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [dismissModalOppId, setDismissModalOppId] = useState<string | null>(
    null,
  );
  const [notice, setNotice] = useState("");
  const [tasks, setTasks] = useState<InternalFollowUp[]>(readTasks);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    try {
      localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [tasks]);

  const visibleOpportunities = opportunities.filter(o => visibleIds.has(o.clientId));
  const validOpportunities = opportunitiesForTab(activeTab, visibleOpportunities);
  const signalOpportunity =
    validOpportunities.find((o) => o.id === selectedOpportunityId) ||
    validOpportunities[0];
  const selectedOpportunity =
    primaryView === "PORTFOLIO"
      ? visibleOpportunities.find((o) => o.clientId === portfolioClientId)
      : signalOpportunity;
  const selectedClient = primaryView === "PORTFOLIO"
    ? visibleClients.find(c => c.id === portfolioClientId) || visibleClients[0]
    : visibleClients.find(c => c.id === selectedOpportunity?.clientId);
  const countTop3 = opportunitiesForTab(
    "TOP_3_ACTIONABLE",
    visibleOpportunities,
  ).length;
  const countVerify = visibleOpportunities.filter(
    (o) => o.status === "VERIFY_FIRST",
  ).length;
  const countSuppressed = visibleOpportunities.filter(
    (o) => o.status === "SUPPRESSED",
  ).length;

  const changeTab = (tab: FilterTab) => {
    setActiveTab(tab);
    const valid = opportunitiesForTab(tab, visibleOpportunities);
    if (!valid.some((o) => o.id === selectedOpportunityId) && valid[0])
      setSelectedOpportunityId(valid[0].id);
  };
  const openSignals = (clientId: string) => {
    const opp = visibleOpportunities.find((o) => o.clientId === clientId);
    if (!opp) return;
    setSelectedOpportunityId(opp.id);
    setActiveTab(
      opp.status === "SUPPRESSED"
        ? "SUPPRESSED"
        : opp.status === "VERIFY_FIRST"
          ? "NEEDS_VERIFICATION"
          : "ALL_PORTFOLIO",
    );
    setPrimaryView("SIGNALS");
  };
  const openPortfolio = (clientId?: string) => {
    setPortfolioClientId(visibleIds.has(clientId || "") ? clientId! : selectedClient?.id || visibleClients[0]?.id || "atlas-mfg");
    setPrimaryView("PORTFOLIO");
  };
  const continuePriorities = () => {
    setPrimaryView("SIGNALS");
    setActiveTab("TOP_3_ACTIONABLE");
    const first = opportunitiesForTab("TOP_3_ACTIONABLE", visibleOpportunities)[0];
    if (first) setSelectedOpportunityId(first.id);
    setNotice("");
  };
  const recordDecision = (
    id: string,
    status: SignalOpportunity["status"],
    reason?: string,
  ) => {
    const opp = visibleOpportunities.find((o) => o.id === id);
    if (!canEdit || !opp || opp.status !== "SURFACED" || opp.priorityRank === 0) return;
    const client = INITIAL_CLIENTS.find((c) => c.id === opp.clientId)!;
    setOpportunities((prev) =>
      prev.map((o) =>
        o.id !== id
          ? o
          : {
              ...o,
              status,
              ...(status === "VERIFY_FIRST"
                ? { priorityTier: "Needs Verification" as const }
                : {}),
              ...(status === "REVIEWED"
                ? { reviewedTimestamp: new Date().toISOString() }
                : {}),
              ...(reason ? { dismissedReason: reason } : {}),
              auditTrail: [
                ...o.auditTrail,
                {
                  timestamp: new Date().toISOString(),
                  action: `BANKER_${status}`,
                  actor: "RM",
                  note:
                    reason ||
                    "Internal banker decision recorded. No message sent and no transaction executed.",
                },
              ],
            },
      ),
    );
    // Keep the just-completed client in view so the RM can prepare, add a task or undo.
    setSelectedOpportunityId(id);
    setActiveTab("ALL_PORTFOLIO");
    setNotice(
      `${client.name}: ${status === "REVIEWED" ? "review recorded. Add an internal follow-up, undo if accidental, or continue remaining priorities." : "decision recorded. You can undo this decision from the client action plan."}`,
    );
  };
  const undoDecision = (id: string) => {
    if (!canEdit || !visibleOpportunities.some(o => o.id === id)) return;
    setOpportunities((prev) =>
      applySignalEvidenceGate(
        prev.map((o) => (o.id === id ? restoreDecision(o) : o)),
        INITIAL_CRM_NOTES,
        events,
      ),
    );
    setNotice(
      "Banker decision undone. Existing evidence and simulation are retained; no message was sent.",
    );
  };
  const addTask = (clientId: string, text: string) => {
    if (!canComment || !visibleIds.has(clientId)) return;
    setTasks((prev) =>
      [
        ...prev,
        {
          id: crypto.randomUUID(),
          clientId,
          text,
          completed: false,
          createdAt: new Date().toISOString(),
        },
      ].slice(-200),
    );
  };
  const toggleTask = (id: string) => {
    if (!canEdit || !tasks.some(t => t.id === id && visibleIds.has(t.clientId))) return;
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  };
  const runSimulation = (scenario: Simulation) => {
    const next = scenario === activeSimulation ? "NONE" : scenario;
    const result = simulateMarket(next, opportunities);
    setOpportunities(result.opportunities);
    setEvents(
      result.event
        ? [result.event, ...INITIAL_MARKET_DEVELOPMENTS]
        : INITIAL_MARKET_DEVELOPMENTS,
    );
    setMarketReport(result.report);
    setActiveSimulation(next);
    setPrimaryView("SIGNALS");
    setActiveTab("TOP_3_ACTIONABLE");
    setSelectedOpportunityId(
      next === "FED_RATE_HIKE" ? "OPP-002-APEX" : "OPP-001-ATLAS",
    );
    setNotice(
      next === "NONE"
        ? "Simulation ended. Banker decisions and follow-ups retained."
        : "Synthetic scenario applied. No live feed; existing banker decisions and follow-ups retained.",
    );
  };
  const resetDemo = () => {
    setResetVersion((v) => v + 1);
    setEvents(INITIAL_MARKET_DEVELOPMENTS);
    setOpportunities(simulateMarket("NONE", INITIAL_OPPORTUNITIES).opportunities);
    setPrimaryView("SIGNALS");
    setPortfolioClientId(visibleClients[0]?.id || "atlas-mfg");
    setSelectedOpportunityId(visibleOpportunities[0]?.id || "");
    setActiveTab("TOP_3_ACTIONABLE");
    setActiveSimulation("NONE");
    setMarketReport(null);
    setDismissModalOppId(null);
    setIsChatOpen(false);
    setTasks([]);
    setNotice(
      "Demo restored to seeded records. Demo decisions and local follow-ups cleared.",
    );
  };
  const planProps = {
    tasks: tasks.filter((t) => t.clientId === selectedClient?.id),
    canEdit,
    canComment,
    onAddTask: addTask,
    onToggleTask: toggleTask,
    onUndo: undoDecision,
    onContinue: continuePriorities,
    onReview: (id: string) => recordDecision(id, "REVIEWED"),
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header
        onSimulateEvent={() => runSimulation("USTR_EXEMPTION")}
        onSimulateFedHike={() => runSimulation("FED_RATE_HIKE")}
        onSimulateQuietMarket={() => runSimulation("QUIET_MARKET")}
        onResetDemo={resetDemo}
        clientCount={visibleClients.length}
        isSimulatedEventActive={activeSimulation !== "NONE"}
        activeSimulation={activeSimulation}
        onOpenPolicyModal={() => setIsPolicyModalOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        reviewCounts={{
          pending: countTop3,
          verify: countVerify,
          muted: countSuppressed,
        }}
      />
      <div className="border-b border-slate-200 bg-white px-4 sm:px-6">
        <nav
          className="flex gap-6 max-w-[1600px] mx-auto"
          aria-label="Primary navigation"
        >
          <button
            aria-current={primaryView === "PORTFOLIO" ? "page" : undefined}
            onClick={() => openPortfolio()}
            className={`py-4 text-sm font-semibold border-b-2 ${primaryView === "PORTFOLIO" ? "border-emerald-700 text-emerald-900" : "border-transparent text-slate-500"}`}
          >
            My Portfolio
          </button>
          <button
            aria-current={primaryView === "SIGNALS" ? "page" : undefined}
            onClick={() => {
              if (primaryView === "PORTFOLIO") {
                const hasSignal = visibleOpportunities.some(o => o.clientId === portfolioClientId);
                if (hasSignal) openSignals(portfolioClientId);
                else {
                  const first = opportunitiesForTab("TOP_3_ACTIONABLE", visibleOpportunities)[0] || visibleOpportunities[0];
                  setSelectedOpportunityId(first?.id || "");
                  setActiveTab("ALL_PORTFOLIO");
                  setPrimaryView("SIGNALS");
                }
              } else setPrimaryView("SIGNALS");
            }}
            className={`py-4 text-sm font-semibold border-b-2 ${primaryView === "SIGNALS" ? "border-emerald-700 text-emerald-900" : "border-transparent text-slate-500"}`}
          >
            Signals &amp; Opportunities
          </button>
        </nav>
      </div>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white">
        <label className="text-xs font-semibold text-slate-700">Demo persona · simulated access
          <select aria-label="Select demo persona" value={personaId}
            onChange={e => {
              const id = e.target.value as DemoPersonaId;
              setPersonaId(id);
              const first = scopeDemoClients(id)[0];
              const visible = new Set(scopeDemoClients(id).map(c => c.id));
              setPortfolioClientId(first.id);
              setSelectedOpportunityId(opportunities.find(o => visible.has(o.clientId))?.id || "");
              setPrimaryView("PORTFOLIO");
              setActiveTab("ALL_PORTFOLIO");
              setIsChatOpen(false);
              setNotice("Demo persona switched. Client visibility and editable actions reflect the simulated role; this is not bank authentication.");
            }}
            className="ml-2 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm">
            {Object.entries(DEMO_PERSONAS).map(([id, value]) => (
              <option key={id} value={id}>{value.name} · {value.position} (Level {value.level})</option>
            ))}
          </select>
        </label>
        <span className="text-xs text-slate-600">{visibleClients.length} visible of 25 synthetic accounts · Permissions: {persona.permissions.join(" / ")}</span>
        <span className="text-xs font-medium text-amber-800">Illustrative entitlements, not secure login</span>
      </div>
      <div className="max-w-[1552px] mx-4 xl:mx-auto my-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 flex flex-wrap justify-between gap-2">
        <span><strong>Demo data:</strong> clients, CRM records, signals and research are synthetic. <strong>Ask AI:</strong> can retrieve public web research on demand; it does not automatically refresh rankings.</span>
        <button onClick={() => setIsPolicyModalOpen(true)} className="font-semibold underline text-emerald-900">Privacy &amp; governance details</button>
        <span>
          Decisions: this session · Follow-ups: this browser · No external
          actions
        </span>
      </div>
      {notice && (
        <div
          role="status"
          className="max-w-[1552px] mx-4 xl:mx-auto mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 flex items-start justify-between gap-4"
        >
          <span>{notice}</span>
          <button
            onClick={() => setNotice("")}
            aria-label="Dismiss notification"
            className="font-semibold"
          >
            ×
          </button>
        </div>
      )}
      {storageError && (
        <p role="alert" className="px-6 text-sm text-amber-800">
          Browser storage is unavailable. Follow-ups remain in this session
          only.
        </p>
      )}
      {activeSimulation !== "NONE" && (
        <div className="max-w-[1552px] mx-4 xl:mx-auto mb-4 flex gap-4 items-center text-sm text-amber-900">
          <span>
            Demo simulation active · {activeSimulation.replaceAll("_", " ")}
          </span>
          <button
            onClick={() => runSimulation("NONE")}
            className="font-semibold underline"
          >
            End simulation; keep my work
          </button>
        </div>
      )}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-8">
        {primaryView === "PORTFOLIO" ? (
          <MyPortfolio
            clients={visibleClients}
            notes={INITIAL_CRM_NOTES.filter(n => visibleIds.has(n.clientId))}
            opportunities={visibleOpportunities}
            clientId={portfolioClientId}
            onSelectClient={setPortfolioClientId}
            onOpenSignals={openSignals}
            {...planProps}
          />
        ) : (
          <>
            <div className="flex flex-wrap justify-between gap-3 mb-4">
              <div>
                <h1 className="text-xl font-bold">
                  Signals &amp; Opportunities
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Evidence rules determine Act, Verify, or Hold off. The banker decides whether to reach out.
                </p>
              </div>
              <button
                onClick={() => openPortfolio()}
                className="text-sm font-semibold text-emerald-900"
              >
                View {selectedClient ? selectedClient.name : "client"} in My
                Portfolio →
              </button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
              <div className="lg:col-span-4 min-h-[380px] lg:h-[calc(100vh-270px)] lg:min-h-[560px]">
                <PriorityList
                  opportunities={visibleOpportunities}
                  clients={visibleClients}
                  coveredClientsCount={visibleClients.length}
                  events={events}
                  selectedOpportunityId={signalOpportunity?.id || ""}
                  simulation={activeSimulation}
                  onSelectOpportunity={setSelectedOpportunityId}
                  activeTab={activeTab}
                  onTabChange={changeTab}
                />
              </div>
              <div className="lg:col-span-8 lg:h-[calc(100vh-270px)] lg:min-h-[560px] min-w-0 border-t lg:border-t-0 lg:border-l border-slate-200">
                {signalOpportunity ? (
                  <EvidenceInspector
                    key={`${resetVersion}-${signalOpportunity.id}`}
                    opportunity={signalOpportunity}
                    client={selectedClient}
                    event={events.find(
                      (e) => e.id === signalOpportunity.eventId,
                    )}
                    internalResearch={events.find(
                      (e) => e.id === signalOpportunity.internalResearchId,
                    )}
                    notes={INITIAL_CRM_NOTES.filter(n => visibleIds.has(n.clientId))}
                    canEdit={canEdit}
                    onMarkReviewed={(id) => recordDecision(id, "REVIEWED")}
                    onNeedsVerification={(id) =>
                      recordDecision(id, "VERIFY_FIRST")
                    }
                    onDefer={(id) => recordDecision(id, "DEFERRED")}
                    onOpenDismissModal={(id) => { if (canEdit) setDismissModalOppId(id); }}
                    actionPlan={
                      <ClientActionPlan
                        opportunity={signalOpportunity}
                        {...planProps}
                      />
                    }
                    onOpenPortfolio={() =>
                      openPortfolio(signalOpportunity.clientId)
                    }
                  />
                ) : (
                  <section
                    className="p-6 sm:p-10 space-y-5"
                    aria-label="Queue next steps"
                  >
                    <div className="text-3xl text-emerald-700">✓</div>
                    <h2 className="text-xl font-bold">
                      No recommendations in this queue
                    </h2>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Your next step is still in your control. Revisit reviewed
                      or deferred clients, prepare a follow-up, or resolve a
                      verification question.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button
                        onClick={() => changeTab("ALL_PORTFOLIO")}
                        className="p-4 rounded-lg border border-emerald-200 text-left font-semibold text-sm text-emerald-900"
                      >
                        Review decisions &amp; undo actions →
                      </button>
                      <button
                        onClick={() => changeTab("NEEDS_VERIFICATION")}
                        className="p-4 rounded-lg border border-amber-200 text-left font-semibold text-sm"
                      >
                        Open verification queue ({countVerify}) →
                      </button>
                      <button
                        onClick={() => openPortfolio()}
                        className="p-4 rounded-lg border border-slate-200 text-left font-semibold text-sm"
                      >
                        Browse My Portfolio &amp; follow-ups →
                      </button>
                      <button
                        onClick={() => setIsChatOpen(true)}
                        className="p-4 rounded-lg border border-slate-200 text-left font-semibold text-sm"
                      >
                        Ask AI about my portfolio →
                      </button>
                    </div>
                    {activeSimulation !== "NONE" && (
                      <button
                        onClick={() => runSimulation("NONE")}
                        className="text-sm underline font-semibold text-amber-900"
                      >
                        End simulation without clearing decisions or tasks
                      </button>
                    )}
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </main>
      <DismissModal
        isOpen={Boolean(dismissModalOppId)}
        onClose={() => setDismissModalOppId(null)}
        onConfirm={(reason) => {
          if (dismissModalOppId)
            recordDecision(dismissModalOppId, "DISMISSED", reason);
          setDismissModalOppId(null);
        }}
        clientName={
          INITIAL_CLIENTS.find(
            (c) =>
              c.id ===
              opportunities.find((o) => o.id === dismissModalOppId)?.clientId,
          )?.name || "Client"
        }
      />
      <PolicyModal
        isOpen={isPolicyModalOpen}
        onClose={() => setIsPolicyModalOpen(false)}
      />
      <MarketIntelligenceModal
        report={marketReport && { ...marketReport,
          clientsEvaluated: visibleOpportunities.length,
          clientsAffected: marketReport.clientsAffected.filter(x => visibleIds.has(x.clientId)),
          rankingRationale: personaId === "rm-secondary"
            ? "This demo report displays only client opportunities included in the selected persona's illustrative coverage. Ranking is qualitative and requires banker review."
            : marketReport.rankingRationale,
        }}
        isOpen={Boolean(marketReport)}
        onClose={() => setMarketReport(null)}
        onInspectClient={openSignals}
      />
      <AskClientSignalsDrawer
        key={personaId}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        selectedClient={selectedClient}
        selectedOpportunity={selectedOpportunity}
        clients={visibleClients}
        opportunities={visibleOpportunities}
        notes={INITIAL_CRM_NOTES.filter(n => visibleIds.has(n.clientId))}
        personaId={personaId}
        events={events}
        simulation={activeSimulation}
      />
    </div>
  );
}
