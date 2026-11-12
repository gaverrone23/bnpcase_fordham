import type { SignalOpportunity } from "../types";
import { INITIAL_OPPORTUNITIES } from "../data/fixtures";

export interface InternalFollowUp {
  id: string;
  clientId: string;
  text: string;
  completed: boolean;
  createdAt: string;
}

export function restoreDecision(
  opportunity: SignalOpportunity,
): SignalOpportunity {
  const seed = INITIAL_OPPORTUNITIES.find((o) => o.id === opportunity.id);
  if (
    !seed ||
    seed.status === "SUPPRESSED" ||
    seed.status === "VERIFY_FIRST" ||
    opportunity.status === "SURFACED"
  )
    return opportunity;
  return {
    ...opportunity,
    status: "SURFACED",
    dismissedReason: undefined,
    reviewedTimestamp: undefined,
    priorityTier:
      opportunity.priorityRank === 1
        ? "Tier 1 · Immediate Action"
        : opportunity.priorityRank === 2
          ? "Tier 1 · Strategic Timing"
          : "Tier 2 · Near-Term Review",
    auditTrail: [
      ...opportunity.auditTrail,
      {
        timestamp: new Date().toISOString(),
        action: "BANKER_UNDID_DECISION",
        actor: "RM",
        note: "Previous banker decision undone. Evidence and simulation retained; no client communication sent.",
      },
    ],
  };
}

export function canRestoreDecision(opportunity: SignalOpportunity) {
  const seed = INITIAL_OPPORTUNITIES.find((o) => o.id === opportunity.id);
  return seed?.status === "SURFACED" && opportunity.status !== "SURFACED";
}

// Summaries are extracted from the existing synthetic CRM fixtures, not transaction records.
export const portfolioBriefs: Record<
  string,
  {
    products: string[];
    obligations: string[];
    sources: string[];
    objective: string;
  }
> = {
  "atlas-mfg": {
    products: [
      "$40M multi-currency revolving facility; $12M drawn as reported in CRM-8420.",
      "$24M overnight cash reported in CRM-8420; not a live balance.",
      "€14.5M equipment purchase; 15% deposit paid, €12.325M unpaid and unhedged in CRM-8812.",
    ],
    obligations: [
      "Equipment milestone payment: CRM-8812 mentions approximately 45 days and late-December delivery. Confirm the exact due date and current hedge coverage.",
    ],
    sources: ["CRM-8420", "CRM-8812"],
    objective:
      "Establish whether the unpaid EUR milestone payment still exposes the equipment budget and agree whether an FX risk-management review is useful.",
  },
  "apex-biotech": {
    products: [
      "$35M term loan indexed to 1M Term SOFR +185 bps (CRM-7901). Current hedge coverage, floors and caps are not documented.",
    ],
    obligations: [
      "Facility matures at the end of Q1 2027. Confirm next reset date and refinancing timetable with Marcus Thorne.",
    ],
    sources: ["CRM-7901"],
    objective:
      "Confirm the next SOFR reset and refinancing timetable before estimating interest sensitivity or discussing risk-management alternatives.",
  },
  "meridian-freight": {
    products: [
      "€18M held across three Benelux lenders in CRM-8115; historical reported balance, not a live BNP account balance.",
      "Cash-pooling RFP is a service request, not an executed banking product.",
    ],
    obligations: [
      "Cash-management RFP decision date: November 30 in CRM-8115. Confirm current specifications and timing with Evelyn Zhao.",
    ],
    sources: ["CRM-8115"],
    objective:
      "Clarify the November 30 cash-pooling RFP requirements and whether a response should address the documented European liquidity structure.",
  },
  "northstar-logistics": {
    products: [
      "No current banking product or account balance is documented in these fixtures.",
      "Earlier $15M Asian expansion plan in CRM-6502 is reported context, not committed capital or an executed transaction.",
    ],
    obligations: [
      "No confirmed current Asian expansion obligation. CRM-7210 reports a board capex pause; verify current intent before any product outreach.",
    ],
    sources: ["CRM-6502", "CRM-7210"],
    objective:
      "Verify with Derek Kowalski whether the Asian capex pause remains in force and whether any earlier treasury requirement survives it. Do not pitch a solution before confirmation.",
  },
  "harbor-components": {
    products: [
      "No current banking product or account balance is documented in these fixtures.",
      "The exploratory $12M Mexico project in CRM-6910 was canceled in CRM-7702; it is not an active financing opportunity.",
    ],
    obligations: [
      "No active Mexico-expansion obligation is established. Keep that outreach thesis suppressed; review updated records only if a distinct current exposure is documented.",
    ],
    sources: ["CRM-6910", "CRM-7702"],
    objective:
      "Avoid outreach about the canceled Mexico expansion. Review account information only to establish whether a distinct, current issue warrants later verification.",
  },
};
