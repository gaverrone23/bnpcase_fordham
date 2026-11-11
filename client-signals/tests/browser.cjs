// Uses Playwright and Chromium supplied by the cloud browser-testing environment.
// Run with the development server on port 3000: node tests/browser.cjs
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const output = process.env.SCREENSHOT_DIR || '/tmp/client-signals-screenshots';
fs.mkdirSync(output, {recursive: true});
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
    page.setDefaultTimeout(10000);
    const errors = [], apiRequests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', r => { if (/\/api\/(chat|evaluate-signal)/.test(r.url())) apiRequests.push(r.url()); });
    const inspector = () => page.getByTestId('evidence-inspector');
    const queue = () => page.getByRole('button', {name: /^Select /});
    const choose = async name => { await page.getByRole('button', {name: `Select ${name}`, exact: true}).click(); await inspector().getByRole('heading', {level: 1, name}).waitFor(); };
    const scenario = async name => { await page.getByRole('button', {name: 'Demo Controls', exact: true}).click(); await page.getByRole('button', {name, exact: false}).click(); };
    const reset = async () => { await scenario('Reset Demo State'); await page.getByRole('button',{name: 'Top 3 (3)', exact: true}).waitFor(); };
    const screenshot = async name => { await page.screenshot({path: `${output}/${name}.png`, fullPage: true}); };
    const snapshot = async () => ({ queue: await queue().allTextContents(), evidence: await inspector().innerText() });
    const evidenceOnly = async client => {
      const ids = await inspector().getByTestId('crm-note').evaluateAll(nodes => nodes.map(n => n.dataset.clientId));
      assert.ok(ids.length); assert.ok(ids.every(id => id === client));
    };
    await page.goto('http://127.0.0.1:3000');
    await inspector().getByRole('heading', {name: 'Atlas Manufacturing Co.', exact: true}).waitFor();
    const baseline = await snapshot();
    assert.match(baseline.evidence, /2\.45%/); assert.match(baseline.evidence, /326,612\.50/);
    assert.ok(!baseline.evidence.includes('1.82%')); await evidenceOnly('atlas-mfg');
    await screenshot('atlas-act');
    await inspector().getByRole('button', {name: /Client Profile/}).click();
    await page.getByRole('button', {name: 'Verify (1)', exact: true}).click();
    await inspector().getByText('Why this client?', {exact: true}).waitFor(); // Evidence tab resets on selection.
    assert.match(await inspector().innerText(), /Derek Kowalski/);
    for (const id of ['CRM-6502', 'CRM-7210']) assert.match(await inspector().innerText(), new RegExp(id));
    assert.ok(!await inspector().getByRole('button', {name: 'Mark for Outreach Review', exact: true}).isEnabled());
    await evidenceOnly('northstar-logistics'); await screenshot('northstar-verify');
    await page.getByRole('button', {name: 'Muted (1)', exact: true}).click();
    assert.match(await inspector().innerText(), /CRM-7702/);
    assert.match(await inspector().innerText(), /not a claim of zero tariff exposure/);
    assert.ok(!await inspector().getByRole('button', {name: 'Mark for Outreach Review', exact: true}).isEnabled());
    await evidenceOnly('harbor-components'); await screenshot('harbor-suppress');
    // Exercise selecting each client directly, not only automatic tab selection.
    await page.getByRole('button', {name: 'All (5)', exact: true}).click();
    for (const [name,id] of [['Atlas Manufacturing Co.','atlas-mfg'],['Northstar Regional Distribution','northstar-logistics'],['Harbor Automotive Components','harbor-components']]) { await choose(name); await evidenceOnly(id); }
    console.log('PASS Atlas ACT, Northstar VERIFY, Harbor SUPPRESS, tab/direct navigation and evidence isolation');
    await reset();
    const unchangedBefore = {};
    await page.getByRole('button', {name: 'All (5)', exact: true}).click();
    for (const name of ['Meridian Logistics & Freight','Northstar Regional Distribution','Harbor Automotive Components']) { await choose(name); unchangedBefore[name] = await inspector().innerText(); }
    await reset(); await scenario('Simulate Event: Fed 25 bps Rate Hike');
    const dialog = page.getByRole('dialog', {name: 'Simulated market update'});
    await dialog.waitFor(); assert.match(await dialog.innerText(), /MKT-2026-980-FED/);
    assert.match(await dialog.innerText(), /87,500/); assert.ok(!(await dialog.innerText()).includes('171,500'));
    assert.equal(await dialog.getByRole('button', {name: 'Inspect Evidence', exact:true}).count(), 5);
    await screenshot('fed-simulation');
    await dialog.getByRole('button', {name: 'Inspect Evidence', exact: true}).first().click(); // Atlas row uses real ID.
    await inspector().getByRole('heading', {name: 'Atlas Manufacturing Co.', exact: true}).waitFor();
    await page.getByRole('button', {name: 'Top 3 (3)', exact: true}).click();
    assert.deepEqual(await queue().evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label'))), ['Select Apex BioTech Instruments', 'Select Atlas Manufacturing Co.', 'Select Meridian Logistics & Freight']);
    await choose('Apex BioTech Instruments');
    assert.match(await inspector().innerText(), /Conditional sensitivity/); assert.match(await inspector().innerText(), /87,500/);
    await screenshot('apex-after-fed');
    await page.getByRole('button', {name: 'All (5)', exact: true}).click();
    for (const name of Object.keys(unchangedBefore)) { await choose(name); assert.equal(await inspector().innerText(), unchangedBefore[name]); }
    await reset(); assert.deepEqual(await snapshot(), baseline);
    console.log('PASS Fed event, conditional math, rank order, report links, unchanged clients and exact Reset Demo');
    // Scenarios cannot leak an earlier scenario’s event/narrative into another.
    await scenario('Simulate Event: USTR 90-Day Exemption');
    await page.getByRole('button', {name: 'Acknowledge & Return to Workbench', exact: true}).click();
    await scenario('Simulate Event: Fed 25 bps Rate Hike');
    await page.getByRole('button', {name: 'Acknowledge & Return to Workbench', exact: true}).click();
    await choose('Atlas Manufacturing Co.'); assert.ok(!(await inspector().innerText()).includes('MKT-2026-999-EMERGENCY'));
    await scenario('Quiet Market Scenario'); await page.getByRole('button', {name: 'Top 3 (0)', exact: true}).waitFor();
    assert.equal(await inspector().count(), 0); await page.getByRole('heading', {name:'No recommendations in this queue'}).waitFor();
    await page.getByRole('button', {name:'All (5)', exact:true}).click(); await choose('Atlas Manufacturing Co.');
    assert.match(await inspector().innerText(), /ACT · Review for outreach/); // No fabricated prior approvals.
    await reset();
    await inspector().getByRole('button', {name:'Mark for Outreach Review',exact:true}).first().click();
    await page.getByRole('button', {name:'Top 3 (2)',exact:true}).waitFor();
    await page.getByRole('button', {name:'All (5)',exact:true}).click(); await choose('Atlas Manufacturing Co.');
    assert.match(await inspector().innerText(), /REVIEW RECORDED · Nothing sent/);
    await reset(); await inspector().getByRole('button',{name:'Defer',exact:true}).click();
    await page.getByRole('button', {name:'Top 3 (2)',exact:true}).waitFor();
    await reset(); await inspector().getByRole('button',{name:'Dismiss',exact:true}).click();
    await page.getByRole('button',{name:'Confirm Dismissal',exact:true}).click();
    await page.getByRole('button', {name:'Top 3 (2)',exact:true}).waitFor();
    await scenario('Simulate Event: Fed 25 bps Rate Hike');
    await page.getByRole('button', {name:'Acknowledge & Return to Workbench',exact:true}).click();
    assert.equal(await page.getByRole('button', {name:'Select Atlas Manufacturing Co.',exact:true}).count(), 0);
    await reset(); await inspector().getByRole('button',{name:'Verify First',exact:true}).click();
    await page.getByRole('button', {name:'Verify (2)',exact:true}).click(); await choose('Atlas Manufacturing Co.');
    assert.ok(!(await inspector().innerText()).includes('Alan Miller'));
    await reset(); assert.deepEqual(await snapshot(),baseline);
    await inspector().getByRole('button', {name: /Client Profile/}).click();
    await reset(); assert.deepEqual(await snapshot(), baseline);
    console.log('PASS scenario switching, zero-item queue, internal review/defer/dismiss/verify, decision preservation and reset');
    for (const [index, name] of ['Atlas Manufacturing Co.', 'Apex BioTech Instruments', 'Meridian Logistics & Freight', 'Northstar Regional Distribution', 'Harbor Automotive Components'].entries()) {
      await reset(); await scenario('Simulate Event: Fed 25 bps Rate Hike');
      await page.getByRole('dialog', {name:'Simulated market update'}).getByRole('button', {name:'Inspect Evidence',exact:true}).nth(index).click();
      await inspector().getByRole('heading', {level:1,name,exact:true}).waitFor();
    }
    await reset(); assert.deepEqual(await snapshot(), baseline);
    console.log('PASS all five simulation-report evidence links select their named clients');
    assert.deepEqual(apiRequests, []); assert.deepEqual(errors, []);
    console.log('PASS no fake AI requests, no browser runtime errors; screenshots:', output);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
