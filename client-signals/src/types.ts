export type EvidenceClassification = 
  | 'CONFIRMED_FACT' 
  | 'EXTRACTED_CONTEXT' 
  | 'HYPOTHESIS_NEEDS_VERIFICATION';

export type OpportunityStatus = 
  | 'SURFACED' 
  | 'VERIFY_FIRST' 
  | 'SUPPRESSED' 
  | 'REVIEWED' 
  | 'DEFERRED' 
  | 'DISMISSED';

export type PriorityTier = 
  | 'Tier 1 · Immediate Action' 
  | 'Tier 1 · Strategic Timing' 
  | 'Tier 2 · Near-Term Review' 
  | 'Needs Verification' 
  | 'Suppressed';

export interface ClientProfile {
  id: string;
  name: string;
  ticker?: string;
  sector: string;
  subSector: string;
  annualRevenue: string;
  headquarters: string;
  rmName: string;
  coverageGroup: string;
  relationshipTier: string;
  treasuryContact: {
    name: string;
    title: string;
    email: string;
  };
  keySensitivities: string[];
  monitorReason?: string;
}

export interface CRMNote {
  id: string;
  clientId: string;
  authorName: string;
  authorRole: string;
  date: string;
  title: string;
  excerpt: string;
  fullText: string;
  category: 'CAPEX' | 'TREASURY' | 'FX_POLICY' | 'M&A' | 'CREDIT_FACILITY' | 'EXPANSION';
  classification: EvidenceClassification;
  isSuperseded?: boolean;
  supersededByNoteId?: string;
  isConflicting?: boolean;
}

export interface MarketDevelopment {
  id: string;
  title: string;
  publishedAt?: string;
  publisher: string;
  sourceType: 'PUBLIC_MARKET_EVENT' | 'INTERNAL_BANK_RESEARCH';
  provenance: 'SYNTHETIC' | 'EXTERNAL';
  verification: 'VERIFIED' | 'UNVERIFIED';
  summary: string;
  fullText: string;
  affectedAssetClasses: string[];
  marketShockMetric?: string;
  internalAuthor?: string;
  complianceNote?: string;
}

export interface SignalOpportunity {
  id: string;
  clientId: string;
  eventId: string;
  internalResearchId?: string;
  clientNoteIds?: string[];
  evidenceGap?: string;
  status: OpportunityStatus;
  priorityRank: number; // 1, 2, 3 for Top 3; or 0 if unranked/suppressed
  priorityTier: PriorityTier;
  whyThisClient: string;
  whyNow: string;
  financialImpactHypothesis: string;
  recommendedQuestions: string[];
  suggestedSpecialist?: {
    desk: string;
    specialistName: string;
    focus: string;
  };
  factors: {
    timingUrgency: 'High' | 'Medium' | 'Low';
    clientExposureDepth: 'High' | 'Medium' | 'Low';
    marketShockMagnitude: 'High' | 'Medium' | 'Low';
    evidenceFreshness: 'Current' | 'Stale' | 'Conflicting';
  };
  suppressionAuditReason?: string;
  dismissedReason?: string;
  reviewedTimestamp?: string;
  auditTrail: Array<{
    timestamp: string;
    action: string;
    actor: string;
    note: string;
  }>;
}

export interface PolicyRule {
  ruleId: string;
  title: string;
  version: string;
  lastReviewed: string;
  ruleType: 'ACCESS_GATE' | 'INFORMATION_BARRIER' | 'SUITABILITY_CHECK' | 'BANKER_CONTROL';
  status: 'ACTIVE' | 'ENFORCED';
  description: string;
}

export interface MarketIntelligenceReport {
  id: string;
  headline: string;
  eventTimestamp: string;
  sourceType: string;
  sourcePublisher: string;
  marketChange: string;
  clientsEvaluated: number;
  clientsAffected: Array<{
    clientId: string;
    clientName: string;
    previousRank: number | string;
    newRank: number | string;
    impactSummary: string;
    statusChange?: string;
  }>;
  rankingRationale: string;
  newStatusSummary: string;
}
