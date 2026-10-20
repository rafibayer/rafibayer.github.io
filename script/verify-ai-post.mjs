#!/usr/bin/env node
// Run after Jekyll to catch accidental publication of the unlisted post.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const read = relative => readFile(new URL(relative, root), 'utf8');
const [source, page, home, feed, snapshot] = await Promise.all([
  read('_posts/2026-10-20-ai-plan-cost-calculator.md'),
  read('_site/ai-cost-calculator/index.html'), read('_site/index.html'),
  read('_site/feed.xml'), read('_data/ai_pricing.json')
]);
const embedded = page.match(/<script id="ai-pricing-data" type="application\/json">([\s\S]*?)<\/script>/);
assert.ok(embedded, 'Calculator must embed the static pricing snapshot');
assert.deepEqual(JSON.parse(embedded[1]), JSON.parse(snapshot), 'Published prices must match this build’s snapshot');
if (/^hidden:\s*true\s*$/m.test(source.split('---')[1])) {
  assert.ok(!home.includes('/ai-cost-calculator/'), 'Hidden post must not appear on the homepage');
  assert.ok(!feed.includes('/ai-cost-calculator/'), 'Hidden post must not appear in the feed');
  assert.match(page, /<meta name="robots" content="noindex, nofollow">/, 'Hidden post must ask search engines not to index it');
}
console.log('Built calculator verified: embedded data, direct page, and unlisted-post rules.');
