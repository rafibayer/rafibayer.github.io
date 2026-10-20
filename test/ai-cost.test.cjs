const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const engine = require('../assets/javascript/ai-cost-engine.js');
const snapshot = JSON.parse(readFileSync(path.join(__dirname, '../_data/ai_pricing.json'), 'utf8'));
const model = { id: 'example', name: 'Example', family: 'openai', tiers: [0, 1, 2], context: 1000000, maxOutput: 128000,
  source: 'openai', direct: { rates: { input: 2, output: 10, cached: 0.2, write: 2.5 }, overrides: [] },
  router: { rates: { input: 2, output: 10, cached: 0.2, write: 2.5 }, overrides: [] } };
const source = { status: 'ok', updatedAt: new Date().toISOString() };
const data = { models: [model], plans: [], routerFee: { percent: 0.055 }, sources: { openai: source, router: source, fees: source, chatgpt: source, claude: source, max: source, credits: source } };
const usage = { tasks: 10, days: 20, agents: 0, input: 8000, output: 2000, reasoning: 1, cache: 0, writes: 0, budget: 5000 };
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);

test('monthly API bill uses input, output, active days and amortized credit fee', () => {
  const options = engine.apiOptions(data, usage);
  near(options.find(o => o.route === 'direct').cost, 7.2);
  near(options.find(o => o.route === 'router').cost, 7.2 * 1.055);
});
test('reasoning and subagents multiply the appropriate token traffic', () => {
  const w = engine.workload({ ...usage, agents: 2, reasoning: 4 });
  assert.equal(w.calls, 600); assert.equal(w.input, 4800000); assert.equal(w.output, 4800000);
});
test('cache reads and cache writes replace disjoint ordinary input tokens', () => {
  const options = engine.apiOptions(data, { ...usage, cache: 50, writes: 25 });
  near(options[0].cost, 1.6 * (2 * 0.25 + 0.2 * 0.5 + 2.5 * 0.25) + 4);
  assert.equal(engine.normalize({ cache: 100, writes: 40 }).cache, 60);
});
test('long-prompt prices apply only above the threshold', () => {
  const d = structuredClone(data); d.models[0].direct.overrides = [{ above: 8000, input: 4, output: 15, cached: 0.4, write: 5 }];
  near(engine.apiOptions(d, usage).find(c => c.route === 'direct').cost, 7.2);
  near(engine.apiOptions(d, { ...usage, input: 8500 }).find(c => c.route === 'direct').cost, 12.8);
});
test('context limits reserve both input and billable output; output cap is enforced', () => {
  const d = structuredClone(data); d.models[0].context = 10000;
  assert.equal(engine.apiOptions(d, usage).length, 2);
  assert.equal(engine.apiOptions(d, { ...usage, input: 8500 }).length, 0);
  assert.equal(engine.apiOptions(data, { ...usage, output: 32000, reasoning: 8 }).length, 0);
  assert.equal(engine.apiOptions(d, { ...usage, minContext: 128000 }).length, 0);
});
test('bundles pool assumed task capacity without duplicating workload or plan fees', () => {
  const d = structuredClone(data); d.plans = [
    { id: 'chatgpt-plus', name: 'ChatGPT Plus', family: 'openai', monthly: 20, capacity: 5, source: 'chatgpt' },
    { id: 'claude-pro', name: 'Claude Pro', family: 'anthropic', monthly: 20, capacity: 5, source: 'claude' }
  ];
  const r = engine.evaluate(d, usage);
  near(r.bundle.cost, 40); near(r.bundle.coverage, 1);
  near(r.candidates.find(c => c.id === 'chatgpt-plus').cost, 23.6);
  const larger = engine.evaluate(d, { ...usage, input: 18000 });
  near(larger.bundle.coverage, 0.5);
  near(larger.bundle.cost, 45.6);
});
test('API-only mode excludes app quotas; zero-capacity input produces full spillover', () => {
  const d = structuredClone(data); d.plans = [{ id: 'chatgpt-plus', family: 'openai', monthly: 20, capacity: 500, source: 'chatgpt' }];
  assert.equal(engine.evaluate(d, { ...usage, mode: 'api' }).candidates.length, 2);
  near(engine.evaluate(d, { ...usage, capacities: { 'chatgpt-plus': 0 } }).candidates.find(c => c.kind === 'subscription').cost, 27.2);
});
test('claimed credits discount eligible direct Anthropic calls and never OpenRouter', () => {
  const d = structuredClone(data); d.models[0].family = 'anthropic'; d.models[0].source = 'anthropic'; d.sources.anthropic = source;
  d.plans = [{ id: 'claude-max-5', name: 'Claude Max 5x', family: 'anthropic', monthly: 100, capacity: 120, apiCredit: 100, source: 'max' }];
  const r = engine.evaluate(d, { ...usage, mode: 'api', credits: true });
  const credited = r.candidates.find(c => c.kind === 'subscription');
  near(credited.cost, 100); near(credited.usedCredit, 7.2); assert.equal(credited.coverage, 0);
  assert.equal(engine.evaluate(d, { ...usage, mode: 'api', credits: false }).candidates.length, 2);
  d.models[0].direct = null;
  near(engine.evaluate(d, { ...usage, mode: 'api', credits: true }).candidates.find(c => c.kind === 'subscription').cost, 107.596);
});
test('budget, disabled providers, context requirement and zero usage stay coherent', () => {
  assert.equal(engine.evaluate(data, { ...usage, budget: 0 }).best, null);
  assert.equal(engine.evaluate(data, { ...usage, families: [] }).candidates.length, 0);
  assert.equal(engine.evaluate(data, { ...usage, router: false }).candidates.length, 1);
  near(engine.evaluate(data, { ...usage, tasks: 0 }).best.cost, 0);
  near(engine.evaluate(data, { ...usage, days: 0 }).best.cost, 0);
});
test('saved snapshot yields finite estimates for presets and extremes', () => {
  for (const mode of ['interactive', 'api']) for (const complexity of [0, 1, 2]) for (const tasks of [0, 24, 250]) {
    const r = engine.evaluate(snapshot, { ...usage, mode, complexity, tasks });
    assert.ok(r.candidates.length > 0);
    r.candidates.forEach(c => assert.ok(Number.isFinite(c.cost) && c.cost >= 0));
  }
  assert.equal(engine.evaluate(snapshot, { ...usage, minContext: 1000000 }).bestApp, null);
});
