import test from 'node:test';
import assert from 'node:assert/strict';
import { INITIAL_OPPORTUNITIES, INITIAL_CLIENTS, INITIAL_MARKET_DEVELOPMENTS } from '../src/data/fixtures';
import { atlasUnpaidEUR, atlasRateChangePercent, atlasIncrementalUSD, apexAnnualSensitivityUSD, opportunitiesForTab, simulateMarket } from '../src/domain/workflow';

const byClient = (opps: typeof INITIAL_OPPORTUNITIES, id: string) => opps.find(o => o.clientId === id)!;

test('FX reference calculation and conditional 25 bps interest sensitivity', () => {
  assert.equal(atlasUnpaidEUR, 12_325_000);
  assert.equal(atlasRateChangePercent.toFixed(2), '2.45');
  assert.ok(Math.abs(atlasIncrementalUSD - 326_612.50) < 0.001);
  assert.equal(apexAnnualSensitivityUSD, 87_500);
});

test('Fed reorders eligible clients, preserves unrelated evidence and hard gates', () => {
  const initial = structuredClone(INITIAL_OPPORTUNITIES);
  const result = simulateMarket('FED_RATE_HIKE', INITIAL_OPPORTUNITIES);
  assert.deepEqual(opportunitiesForTab('TOP_3_ACTIONABLE', result.opportunities).map(o => o.clientId), ['apex-biotech', 'atlas-mfg', 'meridian-freight']);
  for (const client of ['meridian-freight', 'northstar-logistics', 'harbor-components']) {
    assert.deepEqual(byClient(result.opportunities, client), byClient(initial, client));
  }
  const atlas = byClient(result.opportunities, 'atlas-mfg');
  const { priorityRank, priorityTier, ...rest } = atlas;
  const { priorityRank: _, priorityTier: __, ...original } = byClient(initial, 'atlas-mfg');
  assert.deepEqual(rest, original);
  assert.equal(result.event!.id, 'MKT-2026-980-FED');
  assert.match(byClient(result.opportunities, 'apex-biotech').financialImpactHypothesis, /\$87,500/);
  assert.doesNotMatch(byClient(result.opportunities, 'apex-biotech').financialImpactHypothesis, /171,500|covenant threshold/);
  assert.deepEqual(INITIAL_OPPORTUNITIES, initial);
});

test('report evidence links use real client IDs and accurately report prior ranks', () => {
  const fed = simulateMarket('FED_RATE_HIKE', INITIAL_OPPORTUNITIES);
  assert.equal(fed.report!.clientsAffected.length, 5);
  for (const row of fed.report!.clientsAffected) assert.ok(INITIAL_CLIENTS.some(c => c.id === row.clientId && c.name === row.clientName));
  assert.equal(fed.report!.clientsAffected.find(c => c.clientId === 'apex-biotech')!.previousRank, '#2 Priority');
  const waiver = simulateMarket('USTR_EXEMPTION', fed.opportunities);
  assert.equal(waiver.report!.clientsAffected.find(c => c.clientId === 'apex-biotech')!.previousRank, '#1 Priority');
});

test('scenario switching removes stale narrative and never overwrites banker decisions', () => {
  const fed = simulateMarket('FED_RATE_HIKE', INITIAL_OPPORTUNITIES);
  const waiver = simulateMarket('USTR_EXEMPTION', fed.opportunities);
  assert.equal(byClient(waiver.opportunities, 'apex-biotech').eventId, 'MKT-2026-908');
  const fedAgain = simulateMarket('FED_RATE_HIKE', waiver.opportunities);
  assert.equal(byClient(fedAgain.opportunities, 'atlas-mfg').eventId, 'MKT-2026-904');
  const decided = INITIAL_OPPORTUNITIES.map(o => o.clientId === 'apex-biotech' ? { ...o, status: 'DISMISSED' as const, dismissedReason: 'Treasury confirmed hedged' } : o);
  const updated = simulateMarket('FED_RATE_HIKE', decided);
  assert.equal(byClient(updated.opportunities, 'apex-biotech').status, 'DISMISSED');
  assert.equal(byClient(updated.opportunities, 'apex-biotech').dismissedReason, 'Treasury confirmed hedged');
  assert.ok(!opportunitiesForTab('TOP_3_ACTIONABLE', updated.opportunities).some(o => o.clientId === 'apex-biotech'));
});

test('reviewed, deferred, dismissed and quiet-market signals do not fill the actionable queue', () => {
  for (const status of ['REVIEWED', 'DEFERRED', 'DISMISSED'] as const) {
    const decided = INITIAL_OPPORTUNITIES.map(o => o.clientId === 'atlas-mfg' ? { ...o, status } : o);
    assert.equal(opportunitiesForTab('TOP_3_ACTIONABLE', decided).length, 2);
  }
  const quiet = simulateMarket('QUIET_MARKET', INITIAL_OPPORTUNITIES);
  assert.equal(opportunitiesForTab('TOP_3_ACTIONABLE', quiet.opportunities).length, 0);
  assert.deepEqual(quiet.opportunities.map(o => o.status), INITIAL_OPPORTUNITIES.map(o => o.status));
  assert.equal(quiet.event, null);
  assert.equal(quiet.report, null);
});

test('Northstar has relevant synthetic Singapore exposure but remains VERIFY, Harbor SUPPRESS', () => {
  const northstar = byClient(INITIAL_OPPORTUNITIES, 'northstar-logistics');
  const harbor = byClient(INITIAL_OPPORTUNITIES, 'harbor-components');
  const linked = INITIAL_MARKET_DEVELOPMENTS.find(e => e.id === northstar.eventId);
  assert.equal(northstar.eventId, 'MKT-2026-925');
  assert.match(linked!.title, /Singapore/i);
  assert.match(northstar.whyNow, /conflicting notes/i);
  assert.equal(northstar.status, 'VERIFY_FIRST');
  assert.equal(harbor.status, 'SUPPRESSED');
  assert.equal(opportunitiesForTab('TOP_3_ACTIONABLE', INITIAL_OPPORTUNITIES).length, 3);
  assert.equal(INITIAL_OPPORTUNITIES.find(o => o.clientId === 'apex-biotech')?.priorityRank, 2);
});
test('fictional sources are marked synthetic and demo information barrier is not a compliance claim', () => {
  for (const source of INITIAL_MARKET_DEVELOPMENTS) {
    assert.match(source.publisher, /Synthetic|Simulated/i);
    assert.doesNotMatch(source.publisher, /Bloomberg|Reuters|Wall Street Journal|Financial Times|BNP Paribas/i);
  }
  const atlas = byClient(INITIAL_OPPORTUNITIES, 'atlas-mfg');
  assert.match(atlas.auditTrail[0].note, /hypothetical restricted note/);
  assert.match(atlas.auditTrail[0].note, /No real bank document/i);
  assert.doesNotMatch(atlas.suggestedSpecialist?.specialistName || '', /Antoine Laurent/);
});
test('every seeded source reference resolves', () => {
  for (const o of INITIAL_OPPORTUNITIES) {
    assert.ok(INITIAL_CLIENTS.some(c => c.id === o.clientId));
    assert.ok(INITIAL_MARKET_DEVELOPMENTS.some(e => e.id === o.eventId));
    if (o.internalResearchId) assert.ok(INITIAL_MARKET_DEVELOPMENTS.some(e => e.id === o.internalResearchId));
  }
});
