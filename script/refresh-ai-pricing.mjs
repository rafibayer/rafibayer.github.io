#!/usr/bin/env node
// Public pricing pages only. No credentials, model calls, or repository writes beyond the snapshot.
import { readFile, writeFile, rename, mkdir, appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
export const snapshotPath = path.join(root, '_data/ai_pricing.json');
export const sources = {
  openai: { label: 'OpenAI API pricing', url: 'https://developers.openai.com/api/docs/pricing', fetchUrl: 'https://developers.openai.com/api/docs/pricing.md' },
  chatgpt: { label: 'ChatGPT / Codex plans', url: 'https://learn.chatgpt.com/docs/pricing', fetchUrl: 'https://learn.chatgpt.com/docs/pricing.md' },
  anthropic: { label: 'Anthropic API pricing', url: 'https://platform.claude.com/docs/en/about-claude/pricing', fetchUrl: 'https://platform.claude.com/docs/en/about-claude/pricing.md' },
  claude: { label: 'Claude Pro pricing', url: 'https://claude.com/pricing' },
  max: { label: 'Claude Max pricing', url: 'https://support.claude.com/en/articles/11049741-what-is-the-max-plan' },
  credits: { label: 'Claude Max API credits', url: 'https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers', fetchUrl: 'https://platform.claude.com/docs/en/about-claude/api-credits-for-subscribers.md' },
  deepseek: { label: 'DeepSeek API pricing (peak rates)', url: 'https://api-docs.deepseek.com/quick_start/pricing/' },
  router: { label: 'OpenRouter model catalog & context limits', url: 'https://openrouter.ai/api/v1/models' },
  fees: { label: 'OpenRouter Standard credit purchase fee', url: 'https://openrouter.ai/pricing' }
};

// Curated routing choices, not a capability benchmark. Versions deliberately require review.
export const models = [
  { id: 'gpt-6-luna', name: 'GPT-6 Luna', family: 'openai', tiers: [0], routerId: 'openai/gpt-6-luna', source: 'openai' },
  { id: 'gpt-6.1-sol', name: 'GPT-6.1 Sol', family: 'openai', tiers: [1], routerId: 'openai/gpt-6.1-sol', source: 'openai' },
  { id: 'gpt-6-astra', name: 'GPT-6 Astra', family: 'openai', tiers: [2], routerId: 'openai/gpt-6-astra', source: 'openai' },
  { id: 'claude-haiku-5.5', name: 'Claude Haiku 5.5', family: 'anthropic', tiers: [0], routerId: 'anthropic/claude-haiku-5.5', source: 'anthropic' },
  { id: 'claude-sonnet-5.5', name: 'Claude Sonnet 5.5', family: 'anthropic', tiers: [1], routerId: 'anthropic/claude-sonnet-5.5', source: 'anthropic' },
  { id: 'claude-opus-5.5', name: 'Claude Opus 5.5', family: 'anthropic', tiers: [2], routerId: 'anthropic/claude-opus-5.5', source: 'anthropic' },
  { id: 'deepseek-flash', name: 'DeepSeek Flash', family: 'deepseek', tiers: [0], routerId: 'deepseek/deepseek-v4.1-flash', source: 'deepseek' },
  { id: 'deepseek-v4-pro', name: 'DeepSeek V4 Pro', family: 'deepseek', tiers: [1, 2], routerId: 'deepseek/deepseek-v4-pro', source: 'deepseek' },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', family: 'google', tiers: [0, 1], routerId: 'google/gemini-3.5-flash', source: null },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', family: 'google', tiers: [2], routerId: 'google/gemini-3.1-pro-preview', source: null }
];

export function plainText(html) {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/\s+/g, ' ').trim();
}
const money = cell => {
  const match = cell.match(/\$\s*([\d,]+(?:\.\d+)?)/);
  if (!match) throw new Error(`Missing USD price: ${cell.slice(0, 70)}`);
  return Number(match[1].replaceAll(',', ''));
};
function mdRows(text) {
  return text.split('\n').filter(line => line.trim().startsWith('|')).map(line => line.split('|').slice(1, -1).map(cell => cell.trim()));
}
function rowFor(rows, name) {
  const row = rows.find(row => row[0] === name);
  if (!row) throw new Error(`Pricing row missing: ${name}`);
  return row;
}
const plan = (id, name, family, monthly, capacity, source) => ({ id, name, family, monthly, capacity, source });

export function parseSource(id, raw) {
  const text = plainText(raw);
  if (id === 'openai') {
    const standard = raw.split('### Standard pricing data')[1]?.split('###')[0];
    if (!standard) throw new Error('Standard pricing table missing');
    return models.filter(m => m.source === id).map(model => {
      const row = rowFor(mdRows(standard), model.id);
      if (row.length !== 11) throw new Error('OpenAI pricing columns changed');
      return { id: model.id, rates: { input: money(row[1]), output: money(row[2]), cached: money(row[3]), write: money(row[4]) },
        longContext: { above: 272000, input: money(row[6]), output: money(row[7]), cached: money(row[8]), write: money(row[9]) } };
    });
  }
  if (id === 'anthropic') {
    const rows = mdRows(raw.split('### Prompt caching')[0]);
    return models.filter(m => m.source === id).map(model => {
      const row = model.tiers.includes(0) ? rowFor(rows, `${model.name} (for prompts up to 100,000 tokens)`) : rowFor(rows, model.name);
      if (row.length !== 6) throw new Error('Anthropic pricing columns changed');
      const rates = row => ({ input: money(row[1]), output: money(row[5]), cached: money(row[4]), write: money(row[2]) });
      const result = { id: model.id, rates: rates(row) };
      if (model.tiers.includes(0)) result.longContext = { above: 100000, ...rates(rowFor(rows, `${model.name} (for prompts over 100,000 tokens)`)) };
      return result;
    });
  }
  if (id === 'chatgpt') {
    const plus = raw.match(/<PricingCard\s+name="Plus"[\s\S]*?price="(\$[\d,.]+)"/);
    const pro = raw.match(/Plans at (\$[\d,.]+), (\$[\d,.]+), or (\$[\d,.]+) USD per month/);
    if (!plus || !pro) throw new Error('ChatGPT plan markup changed');
    return [plan('chatgpt-plus', 'ChatGPT Plus', 'openai', money(plus[1]), 24, id),
      ...[100, 200, 500].map((tier, i) => plan(`chatgpt-pro-${tier}`, `ChatGPT Pro ${tier}`, 'openai', money(pro[i + 1]), [120, 480, 1200][i], id))];
  }
  if (id === 'claude') {
    const pro = text.match(/(\$[\d,.]+) if billed monthly/);
    if (!pro) throw new Error('Claude monthly Pro price missing');
    return [plan('claude-pro', 'Claude Pro', 'anthropic', money(pro[1]), 24, id)];
  }
  if (id === 'max') {
    return [5, 20].map((multiple, index) => {
      const match = text.match(new RegExp(`Max ${multiple}x\\s*:\\s*(\\$[\\d,.]+) per month`));
      if (!match) throw new Error(`Claude Max ${multiple}x price missing`);
      return plan(`claude-max-${multiple}`, `Claude Max ${multiple}x`, 'anthropic', money(match[1]), [120, 480][index], id);
    });
  }
  if (id === 'credits') {
    const rows = mdRows(raw);
    return Object.fromEntries([5, 20].map(m => [`claude-max-${m}`, money(rowFor(rows, `Max ${m}x`)[1])]));
  }
  if (id === 'deepseek') {
    const table = raw.match(/<table\b[\s\S]*?<\/table>/i)?.[0];
    if (!table) throw new Error('DeepSeek table missing');
    const rows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(m => plainText(m[1]));
    const peak = rows.filter(row => /^PEAK\s+\$/.test(row));
    if (peak.length !== 3 || !/deepseek-flash/.test(table) || !/deepseek-v4-pro/.test(table)) throw new Error('DeepSeek peak-rate table changed');
    const prices = peak.map(row => [...row.matchAll(/\$([\d.]+)/g)].map(m => Number(m[1])));
    if (prices.some(row => row.length !== 2)) throw new Error('DeepSeek price columns changed');
    return ['deepseek-flash', 'deepseek-v4-pro'].map((id, i) => ({ id, rates: { input: prices[1][i], output: prices[2][i], cached: prices[0][i], write: prices[1][i] } }));
  }
  if (id === 'router') {
    const { data } = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('OpenRouter catalog missing');
    return models.map(model => {
      const entry = data.find(m => m.id === model.routerId);
      if (!entry) throw new Error(`Model missing from OpenRouter: ${model.routerId}`);
      const rate = (obj, key, fallback) => {
        const value = obj[key] ?? fallback;
        if (value === undefined || value === null || value === '' || !Number.isFinite(Number(value)) || Number(value) < 0) throw new Error(`Invalid ${key} price: ${model.routerId}`);
        return Number(value) * 1e6;
      };
      const rates = obj => ({ input: rate(obj, 'prompt'), output: rate(obj, 'completion'), cached: rate(obj, 'input_cache_read', obj.prompt), write: rate(obj, 'input_cache_write', obj.prompt) });
      return { id: model.id, context: entry.context_length, maxOutput: entry.top_provider?.max_completion_tokens,
        rates: rates(entry.pricing), overrides: (entry.pricing.overrides || []).map(o => ({ above: o.min_prompt_tokens, ...rates({ ...entry.pricing, ...o }) })) };
    });
  }
  if (id === 'fees') {
    const match = text.match(/fee is charged when you buy credits,\s*([\d.]+)% on Standard/i);
    if (!match) throw new Error('OpenRouter Standard purchase fee missing');
    return { percent: Number(match[1]) / 100 };
  }
  throw new Error(`Unknown source ${id}`);
}

export function validateSnapshot(data) {
  if (data.schemaVersion !== 1 || !data.sources || !data.models?.length || !data.plans?.length) throw new Error('Incomplete pricing snapshot');
  const finite = (value, label, min = 0) => { if (!Number.isFinite(value) || value < min) throw new Error(`Invalid ${label}`); };
  if (!Number.isFinite(Date.parse(data.updatedAt))) throw new Error('Invalid snapshot date');
  for (const [id, source] of Object.entries(data.sources)) {
    if (!Number.isFinite(Date.parse(source.updatedAt)) || !/^https:\/\//.test(source.url)) throw new Error(`Invalid source: ${id}`);
  }
  for (const model of data.models) {
    finite(model.context, 'context', 1); finite(model.maxOutput, 'max output', 1);
    for (const route of ['direct', 'router']) if (model[route]) {
      for (const rates of [model[route].rates, ...(model[route].overrides || [])]) {
        for (const key of ['input', 'output', 'cached', 'write']) finite(rates[key], `${model.id} ${key}`);
        if (rates.cached > rates.input) throw new Error('Cache hit exceeds input price');
      }
    }
  }
  for (const plan of data.plans) { finite(plan.monthly, 'plan price', 1); finite(plan.capacity, 'scenario capacity', 1); }
  finite(data.routerFee.percent, 'OpenRouter fee');
  if (data.routerFee.percent > 0.5) throw new Error('Implausible OpenRouter fee');
  return data;
}

export async function refresh({ previous, fetcher = fetch, now = new Date().toISOString() } = {}) {
  const parsed = {}, metadata = {}, failures = [];
  await Promise.all(Object.entries(sources).map(async ([id, source]) => {
    try {
      const response = await fetcher(source.fetchUrl || source.url, { signal: AbortSignal.timeout(30000), headers: { 'User-Agent': 'rafibayer-blog-pricing/1.0', Accept: 'text/markdown,text/html,application/json' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      parsed[id] = parseSource(id, await response.text());
      metadata[id] = { label: source.label, url: source.url, updatedAt: now, checkedAt: now, status: 'ok' };
    } catch (error) {
      if (!previous?.sources[id]) throw new Error(`No saved data for ${id}: ${error.message}`);
      failures.push(id);
      metadata[id] = { ...previous.sources[id], checkedAt: now, status: 'stale', error: error.message.slice(0, 160) };
    }
  }));
  const data = { schemaVersion: 1, updatedAt: now, currency: 'USD', sources: metadata,
    routerFee: parsed.fees || previous.routerFee,
    plans: ['chatgpt', 'claude', 'max'].flatMap(id => parsed[id] || previous.plans.filter(p => p.source === id)),
    models: models.map(model => {
      const old = previous?.models.find(m => m.id === model.id);
      const routed = parsed.router?.find(m => m.id === model.id);
      const direct = parsed[model.source]?.find(m => m.id === model.id);
      return { ...model, context: routed?.context ?? old?.context, maxOutput: routed?.maxOutput ?? old?.maxOutput,
        direct: model.source ? (direct ? { rates: direct.rates, overrides: direct.longContext ? [direct.longContext] : [] } : old?.direct) : null,
        router: routed ? { rates: routed.rates, overrides: routed.overrides } : old?.router };
    }) };
  const credits = parsed.credits || Object.fromEntries((previous?.plans || []).filter(p => p.apiCredit).map(p => [p.id, p.apiCredit]));
  data.plans.forEach(plan => { if (credits[plan.id]) plan.apiCredit = credits[plan.id]; });
  validateSnapshot(data);
  return { data, failures };
}

async function main() {
  let previous;
  try { previous = JSON.parse(await readFile(snapshotPath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const { data, failures } = await refresh({ previous });
  await mkdir(path.dirname(snapshotPath), { recursive: true });
  await writeFile(`${snapshotPath}.tmp`, `${JSON.stringify(data, null, 2)}\n`);
  await rename(`${snapshotPath}.tmp`, snapshotPath);
  console.log(`Pricing snapshot: ${data.updatedAt}; ${data.models.length} models, ${data.plans.length} plans; ${failures.length} stale sources.`);
  for (const id of failures) console.warn(`::warning::${id}: ${data.sources[id].error}; retaining prices from ${data.sources[id].updatedAt}`);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY,
    `## Pricing refresh\n\n${Object.keys(sources).length - failures.length}/${Object.keys(sources).length} sources refreshed.\n\n${Object.values(data.sources).map(s => `- ${s.label}: ${s.status}; prices verified ${s.updatedAt}`).join('\n')}\n`);
  if (failures.length && process.argv.includes('--strict')) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
