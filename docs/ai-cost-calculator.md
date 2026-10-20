# AI cost calculator

The post is at `/ai-cost-calculator/`. It uses vanilla JavaScript, a scoped stylesheet,
and `_data/ai_pricing.json`, embedded by Jekyll. Visitors never call provider APIs.
No npm installation or provider credentials are required. Use Node 22+ for scripts.

The post starts unlisted (`hidden: true`, `sitemap: false`). It is excluded from the
homepage and Atom feed, and its HTML asks search engines not to index it. The direct
URL remains public; this is not access control. To list it later, remove those two
front matter settings. `feed.xml` uses the standard jekyll-feed 0.17 template with
an additional filter excluding hidden posts.

## Local use

```sh
node script/refresh-ai-pricing.mjs
node --test test/ai-cost.test.cjs test/ai-pricing-refresh.test.mjs
bundle exec jekyll build
node script/verify-ai-post.mjs
bundle exec jekyll serve
```

Open `http://127.0.0.1:4000/ai-cost-calculator/`.

The updater fetches official public pricing pages and OpenRouter's public catalog.
Each source is parsed independently and retains its last verified prices and timestamp
on failure. A failed source is explicitly marked stale; the page also flags prices
older than 72 hours. `--strict` returns a nonzero status if any source fails, after
saving a validated snapshot. The default allows deploying a partially stale snapshot
with visible warnings. Without an existing snapshot, every source must succeed.
Validation errors abort the write. The file is replaced atomically after validation.

## Daily GitHub Pages builds

`.github/workflows/refresh-ai-pricing.yml` runs daily at 13:23 UTC, on pushes to
`master`, and on manual dispatch. It refreshes the snapshot in the runner, tests,
builds Jekyll with the official Pages action, and deploys a Pages artifact. **It never
commits or pushes data to the repository.** The checked-in snapshot remains the
fallback for local builds and the first runner build. The workflow caches validated
snapshots between runs so a source failure retains its most recent successful
prices. Caches are scoped to the refresh script version; if evicted, the checked-in
snapshot is the fallback. Runner refreshes are included in the deployed HTML without
changing the checked-in JSON.

After reviewing and publishing these changes yourself:

1. In repository **Settings → Pages → Build and deployment**, set **Source** to
   **GitHub Actions**. This replaces the existing branch-based Pages build.
2. Ensure Actions and deployments to the `github-pages` environment are enabled.
3. Run **Refresh AI pricing and publish blog** once from the Actions tab.
4. Inspect its refresh summary and the source timestamps on the deployed post.

No secrets are needed. The workflow uses `contents: read`; only its deployment job
gets `pages: write` and `id-token: write`. GitHub may delay scheduled runs and can
disable schedules after prolonged repository inactivity; the page's age warning
still works independently. No repository settings are changed by the local work.

## Model and parser maintenance

`script/refresh-ai-pricing.mjs` contains the deliberately curated model/version list,
source URLs, parsers, and illustrative default app capacities. Add or retire model
versions explicitly rather than silently switching visitors to a different model.
Direct prices are fetched from OpenAI, Anthropic, and DeepSeek; OpenRouter supplies
routed prices, context windows, and output limits. A missing curated model fails
that source rather than introducing zero pricing. OpenRouter context limits are a
proxy for direct API limits and may differ by account or deployment.

Provider markup can change. When a source is stale, inspect the public page, update
its parser and corresponding fixture test, rerun the refresh and tests, and review
the snapshot diff. Long-context thresholds and source schema assumptions also need
periodic review. The calculator intentionally compares model routing choices, not
benchmark-adjusted quality or guaranteed application limits.

The engine is independent of the DOM. Tests cover token arithmetic, caching,
reasoning, subagents, bundles, credits, context filtering, constraints, refresh
failures, and source validation. Subscription capacity is never inferred from API
prices. Each capacity input is a hypothetical count of 8K-input / 2K-output calls
per active day; changing token sizes rescales the assumed workload.
