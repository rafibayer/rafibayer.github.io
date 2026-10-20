import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseSource, refresh, validateSnapshot, sources } from '../script/refresh-ai-pricing.mjs';
const saved = JSON.parse(await readFile(new URL('../_data/ai_pricing.json', import.meta.url), 'utf8'));

test('OpenAI parser selects standard short/long columns, never batch prices', () => {
  const raw = `### Standard pricing data\n| gpt-6-luna | $0.1 | $0.5 | $0.01 | $0.125 | $0.25 | $0.2 | $0.75 | $0.02 | $0.25 | $0.5 |\n| gpt-6.1-sol | $2 | $10 | $0.1 | $2.5 | $5 | $4 | $15 | $0.2 | $5 | $10 |\n| gpt-6-astra | $10 | $50 | $1 | $12.5 | $25 | $20 | $75 | $2 | $25 | $50 |\n### Flex pricing\n| gpt-6.1-sol | $1 | $5 |`;
  const parsed = parseSource('openai', raw);
  assert.equal(parsed.find(m => m.id === 'gpt-6.1-sol').rates.input, 2);
  assert.equal(parsed.find(m => m.id === 'gpt-6.1-sol').longContext.output, 15);
});
test('Anthropic parser keeps cache columns and tiered Haiku prices in order', () => {
  const raw = ['Claude Haiku 5.5 (for prompts up to 100,000 tokens)', 'Claude Haiku 5.5 (for prompts over 100,000 tokens)', 'Claude Sonnet 5.5', 'Claude Opus 5.5'].map(name => `| ${name} | $2 / MTok | $2.5 / MTok | $4 / MTok | $0.1 / MTok | $10 / MTok |`).join('\n');
  const parsed = parseSource('anthropic', raw);
  assert.equal(parsed[0].rates.write, 2.5); assert.equal(parsed[0].rates.cached, 0.1);
  assert.equal(parsed[0].longContext.above, 100000);
});
test('subscription parsers distinguish monthly prices from annual billing', () => {
  const claude = parseSource('claude', '<p>$17 per month with annual discount. $20 if billed monthly.</p>');
  assert.equal(claude[0].monthly, 20);
  const chatgpt = parseSource('chatgpt', '<PricingCard name="Plus" price="$20">\nPlans at $100, $200, or $500 USD per month');
  assert.deepEqual(chatgpt.map(p => p.monthly), [20, 100, 200, 500]);
  assert.deepEqual(parseSource('max', 'Max 5x: $100 per month Max 20x: $200 per month').map(p => p.monthly), [100, 200]);
  assert.equal(parseSource('fees', 'fee is charged when you buy credits, 5.5% on Standard').percent, 0.055);
});
test('DeepSeek parser selects peak columns and preserves model order', () => {
  const raw = '<table><tr><td>deepseek-flash</td><td>deepseek-v4-pro</td></tr><tr><td>OFF-PEAK $0.003 $0.022</td></tr><tr><td>PEAK $0.006 $0.044</td></tr><tr><td>PEAK $0.3 $1.32</td></tr><tr><td>PEAK $1.2 $3.96</td></tr></table>';
  const parsed = parseSource('deepseek', raw);
  assert.equal(parsed[0].rates.input, 0.3); assert.equal(parsed[1].rates.output, 3.96);
});
test('markup changes fail visibly instead of returning zero prices', () => {
  for (const id of Object.keys(sources)) assert.throws(() => parseSource(id, '<p>Temporarily unavailable</p>'));
});
test('failed refresh preserves prices and source verification timestamps', async () => {
  const now = '2026-10-21T13:23:00.000Z';
  const { data, failures } = await refresh({ previous: structuredClone(saved), now,
    fetcher: async () => ({ ok: false, status: 503 }) });
  assert.equal(failures.length, Object.keys(sources).length);
  assert.equal(data.updatedAt, now);
  assert.deepEqual(data.models, saved.models);
  assert.deepEqual(data.plans, saved.plans);
  for (const id of failures) {
    assert.equal(data.sources[id].status, 'stale');
    assert.equal(data.sources[id].updatedAt, saved.sources[id].updatedAt);
    assert.equal(data.sources[id].checkedAt, now);
  }
});
test('one successful source updates independently without misdating failed sources', async () => {
  const now = '2026-10-21T13:23:00.000Z';
  const { data } = await refresh({ previous: structuredClone(saved), now, fetcher: async url =>
    url === sources.fees.url ? { ok: true, text: async () => 'fee is charged when you buy credits, 6% on Standard' } : { ok: false, status: 503 } });
  assert.equal(data.routerFee.percent, 0.06);
  assert.equal(data.sources.fees.status, 'ok'); assert.equal(data.sources.fees.updatedAt, now);
  assert.equal(data.sources.openai.updatedAt, saved.sources.openai.updatedAt);
});
test('bootstrap failure has no fabricated fallback and invalid snapshots are rejected', async () => {
  await assert.rejects(refresh({ fetcher: async () => ({ ok: false, status: 503 }) }), /No saved data/);
  const invalid = structuredClone(saved); invalid.models[0].direct.rates.input = NaN;
  assert.throws(() => validateSnapshot(invalid), /Invalid/);
  invalid.models[0].direct.rates.input = -1;
  assert.throws(() => validateSnapshot(invalid), /Invalid/);
  assert.equal(validateSnapshot(saved), saved);
});
