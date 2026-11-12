import type { CRMNote, MarketDevelopment, SignalOpportunity } from '../types';

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function sourceTimestamp(source: MarketDevelopment) {
  const value = source.publishedAt?.trim();
  if (!value || !isCalendarDate(value.slice(0, 10))) return undefined;
  const normalized = value.replace(' EST', '-05:00').replace(' CET', '+01:00').replace(' ', 'T');
  const zonedTime = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/;
  return zonedTime.test(normalized) && Number.isFinite(Date.parse(normalized)) ? value : undefined;
}

export function applySignalEvidenceGate(
  opportunities: SignalOpportunity[],
  notes: CRMNote[],
  sources: MarketDevelopment[],
) {
  return opportunities.map(opportunity => {
    if (opportunity.status !== 'SURFACED' || opportunity.priorityRank <= 0) return opportunity;

    const gaps: string[] = [];
    if (!notes.some(note => note.clientId === opportunity.clientId
      && opportunity.clientNoteIds?.includes(note.id)
      && !note.isSuperseded && !note.isConflicting
      && note.classification !== 'HYPOTHESIS_NEEDS_VERIFICATION'
      && isCalendarDate(note.date))) {
      gaps.push('A dated client note supporting this signal is needed.');
    }

    const linkedSources = [{ id: opportunity.eventId, label: 'market source' }];
    if (opportunity.internalResearchId) {
      linkedSources.push({ id: opportunity.internalResearchId, label: 'research source' });
    }
    for (const { id, label } of linkedSources) {
      const source = sources.find(record => record.id === id);
      if (!source) gaps.push(`The ${label} is missing.`);
      else {
        if (source.verification !== 'VERIFIED') gaps.push(`The ${label} is unverified.`);
        if (!sourceTimestamp(source)) gaps.push(`The ${label} needs a valid timestamp.`);
      }
    }

    return gaps.length ? {
      ...opportunity,
      status: 'VERIFY_FIRST' as const,
      priorityTier: 'Needs Verification' as const,
      priorityRank: 0,
      evidenceGap: gaps.join(' '),
    } : opportunity;
  });
}
