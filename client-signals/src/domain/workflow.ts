import { INITIAL_CLIENTS, INITIAL_OPPORTUNITIES, SIMULATION_FED_RATE_HIKE_EVENT, SIMULATION_UPDATED_EVENT } from '../data/fixtures';
import type { SignalOpportunity, MarketIntelligenceReport } from '../types';

export type FilterTab = 'TOP_3_ACTIONABLE' | 'NEEDS_VERIFICATION' | 'SUPPRESSED' | 'ALL_PORTFOLIO';
export type Simulation = 'NONE' | 'FED_RATE_HIKE' | 'USTR_EXEMPTION' | 'QUIET_MARKET';

export const atlasExposure = {
  purchaseEUR: 14_500_000,
  depositShare: 0.15,
  referenceRate: 1.0820,
  scenarioRate: 1.1085,
};
export const atlasUnpaidEUR = atlasExposure.purchaseEUR * (1 - atlasExposure.depositShare);
export const atlasRateChangePercent = (atlasExposure.scenarioRate / atlasExposure.referenceRate - 1) * 100;
export const atlasIncrementalUSD = atlasUnpaidEUR * (atlasExposure.scenarioRate - atlasExposure.referenceRate);
export const apexAnnualSensitivityUSD = 35_000_000 * 0.0025;

export function opportunitiesForTab(tab: FilterTab, opportunities: SignalOpportunity[]) {
  return opportunities.filter(o => {
    if (tab === 'TOP_3_ACTIONABLE') return o.status === 'SURFACED' && o.priorityRank > 0 && o.priorityRank <= 3;
    if (tab === 'NEEDS_VERIFICATION') return o.status === 'VERIFY_FIRST';
    if (tab === 'SUPPRESSED') return o.status === 'SUPPRESSED';
    return true;
  }).sort((a, b) => (a.priorityRank || Infinity) - (b.priorityRank || Infinity));
}

export function bankerAction(opportunity: SignalOpportunity) {
  if (opportunity.status === 'SURFACED' && opportunity.priorityRank === 0) return { label: 'MONITOR · No active market signal', detail: 'No new actionable shock in this scenario. Review relationship records or prepare routine follow-ups; end the simulation to return to baseline signals without clearing your work.' };
  if (opportunity.status === 'SUPPRESSED') return { label: 'SUPPRESS · No outreach on canceled expansion', detail: 'CRM-7702 supersedes CRM-6910. Review updated account information only if a distinct current exposure is documented; no new opportunity is established.' };
  if (opportunity.status === 'VERIFY_FIRST') return {
    label: 'VERIFY · Confirm current intent before outreach',
    detail: opportunity.clientId === 'northstar-logistics'
      ? 'Ask Derek Kowalski whether the Asian capex pause in CRM-7210 still applies, whether it is temporary or permanent, and whether any treasury need from CRM-6502 remains active. Record confirmation before proposing solutions.'
      : 'Confirm the client’s current exposure, payment or reset terms, and decision timing with treasury before proposing solutions.',
  };
  if (opportunity.status === 'REVIEWED') return { label: 'REVIEW RECORDED · Nothing sent', detail: 'Prepare the conversation objective and discovery questions below, then record the internal follow-up you will take. Confirm current circumstances and suitability before outreach; nothing has been sent.' };
  if (opportunity.status === 'DEFERRED') return { label: 'DEFERRED · Revisit in 48 hours', detail: 'Removed from the actionable queue. Review updated evidence before resuming outreach.' };
  if (opportunity.status === 'DISMISSED') return { label: 'DISMISSED · No outreach', detail: opportunity.dismissedReason || 'Banker dismissed this suggestion.' };
  return { label: 'ACT · Review for outreach', detail: opportunity.clientId === 'atlas-mfg'
    ? 'Confirm the unpaid €12.325M balance, current hedge coverage and delivery date with Claire Vance; discuss FX risk management if the exposure remains open.'
    : opportunity.clientId === 'apex-biotech'
      ? 'Review the $35M facility with Marcus Thorne: confirm reset date, SOFR index, floor/cap and hedges before estimating borrowing costs.'
      : 'Review the November 30 cash-management RFP with Evelyn Zhao and confirm the applicable requirements before proposing a response.' };
}

// Each scenario replaces market-derived state, while preserving banker decisions.
// This prevents prior scenario events or narratives leaking into the next scenario.
export function simulateMarket(scenario: Simulation, previous: SignalOpportunity[]) {
  const baseline = INITIAL_OPPORTUNITIES.map(seed => {
    const current = previous.find(o => o.id === seed.id) || seed;
    return { ...current, ...seed, status: current.status,
      ...(current.status === 'VERIFY_FIRST' ? { priorityTier: 'Needs Verification' as const } : {}), auditTrail: current.auditTrail.filter(a => !['MARKET_SCENARIO', 'QUIET_MARKET_EVALUATION'].includes(a.action)) };
  });
  if (scenario === 'NONE') return { opportunities: baseline, report: null, event: null };
  const opportunities: SignalOpportunity[] = baseline.map(opp => {
    if (scenario === 'QUIET_MARKET') return { ...opp, priorityRank: 0 }; // No invented banker approval.
    if (scenario === 'FED_RATE_HIKE') {
      if (opp.clientId === 'apex-biotech') return {
        ...opp, priorityRank: 1, priorityTier: opp.status === 'VERIFY_FIRST' ? 'Needs Verification' : 'Tier 1 · Immediate Action', eventId: SIMULATION_FED_RATE_HIKE_EVENT.id,
        whyNow: 'Hypothetical Fed +25 bps scenario: Apex’s $35M facility is indexed to 1M Term SOFR (CRM-7901). In this demo, its potential next-reset sensitivity moves Apex ahead of Atlas for RM review. A policy-rate change does not establish an identical SOFR move.',
        financialImpactHypothesis: 'Conditional sensitivity: $35,000,000 × 0.0025 = $87,500 additional interest per year, only if the full 25 bps passes through for a full year at constant principal with no offsetting hedges, floors or caps. Confirm reset terms. Do not add the separate 24 bps Treasury-yield move; it is not a measured SOFR change.',
        auditTrail: [...opp.auditTrail, { timestamp: SIMULATION_FED_RATE_HIKE_EVENT.publishedAt, action: 'MARKET_SCENARIO', actor: 'Demo scenario rules', note: 'MKT-2026-980-FED: potential floating-rate reset prompts higher review priority; pass-through remains conditional.' }],
      };
      if (opp.clientId === 'atlas-mfg') return { ...opp, priorityRank: 2, priorityTier: opp.status === 'VERIFY_FIRST' ? 'Needs Verification' : 'Tier 1 · Strategic Timing' };
    }
    if (scenario === 'USTR_EXEMPTION' && opp.clientId === 'atlas-mfg') return {
      ...opp, eventId: SIMULATION_UPDATED_EVENT.id,
      whyNow: 'Hypothetical 90-day tariff waiver on German CNC equipment: confirm customs eligibility and shipment timing. Atlas’s documented payment window and unhedged EUR balance remain relevant; the waiver does not remove FX risk.',
      financialImpactHypothesis: 'FX sensitivity remains $326,612.50 versus the 1.0820 reference. Any duty saving depends on customs valuation and eligibility; no dollar duty saving is confirmed.',
    };
    return opp;
  });
  const event = scenario === 'FED_RATE_HIKE' ? SIMULATION_FED_RATE_HIKE_EVENT : SIMULATION_UPDATED_EVENT;
  const rankLabel = (opp: SignalOpportunity) => opp.status === 'SURFACED' && opp.priorityRank > 0 ? `#${opp.priorityRank} Priority` : opp.status.replaceAll('_', ' ');
  const report: MarketIntelligenceReport | null = scenario === 'QUIET_MARKET' ? null : {
    id: `REP-${scenario}`, headline: `SIMULATED · ${event.title}`, eventTimestamp: event.publishedAt,
    sourceType: 'Synthetic event fixture', sourcePublisher: `Demo source ${event.id} · No live feed`,
    marketChange: event.marketShockMetric || '', clientsEvaluated: opportunities.length,
    clientsAffected: opportunities.map(opp => ({
      clientId: opp.clientId, clientName: INITIAL_CLIENTS.find(c => c.id === opp.clientId)!.name,
      previousRank: rankLabel(previous.find(p => p.id === opp.id) || opp), newRank: rankLabel(opp),
      impactSummary: scenario === 'FED_RATE_HIKE'
        ? opp.clientId === 'apex-biotech' ? 'Direct review relevance: $35M SOFR-linked facility (CRM-7901). Conditional +$87,500/year sensitivity, not a confirmed cost. Existing banker decisions remain in force.'
          : opp.clientId === 'atlas-mfg' ? 'Relative rank moves to #2. FX exposure, evidence and payment assumptions are unchanged; no Fed-driven FX move is assumed.'
          : opp.clientId === 'meridian-freight' ? 'Unchanged: November 30 cash-pooling RFP (CRM-8115); no documented direct link to this rate scenario.'
          : opp.clientId === 'northstar-logistics' ? 'Unchanged: conflicting Asian expansion records still require verification; no new exposure established.'
          : 'Unchanged: canceled Mexico expansion remains suppressed under CRM-7702.'
        : opp.clientId === 'atlas-mfg' ? 'Tariff-waiver eligibility needs confirmation; unpaid EUR balance still exposed. Atlas retains #1 review priority.' : 'No documented client-specific change from this scenario; eligibility and evidence remain unchanged.',
    })),
    rankingRationale: scenario === 'FED_RATE_HIKE'
      ? 'Demo ranking rule: potential near-term SOFR reset sensitivity places Apex before Atlas’s equipment-payment FX review. This is a qualitative scenario assumption, not a live forecast or a confirmed borrowing-rate change. Meridian, Northstar and Harbor remain unchanged.'
      : 'Atlas retains #1 review priority: the hypothetical waiver adds a customs eligibility check without removing its documented FX exposure. No new opportunity is inferred for other clients.',
    newStatusSummary: 'Scenario applied; existing banker decisions preserved. No outreach sent.',
  };
  return { opportunities, report, event: scenario === 'QUIET_MARKET' ? null : event };
}
