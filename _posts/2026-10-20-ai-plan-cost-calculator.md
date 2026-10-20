---
layout: post
title: "What should you spend on AI?"
date: 2026-10-20 00:00:00 -0700
tags: AI Tools Costs
permalink: /ai-cost-calculator/
calculator: true
hidden: true
sitemap: false
excerpt: "One expensive AI plan, two cheaper subscriptions, or pay by the token? An interactive calculator for finding the tradeoffs in your own usage."
---

It’s easy to collect AI subscriptions. It’s harder to know whether they’re earning their keep. Two $20 plans might cover your day better than one $100 plan. Or paying by the token might be cheaper than either.

This calculator puts those options side by side. Set a workload, choose the kinds of models you use, and see how the costs change. Prices are a static snapshot of public provider data; your inputs stay in this page.

{% include ai-cost-calculator.html %}

## What the numbers mean

**API estimates use published token prices.** Every task makes one main model call and one call per subagent. Input tokens include conversation history, instructions, retrieved context, and tool results sent on each call. The reasoning multiplier adds billable output tokens; it is your estimate, not a provider-specific measurement. For a multi-turn agent, include its total repeated token traffic in the per-task inputs. Each subagent is assumed to consume the same tokens as the main call.

**Subscriptions need a different model.** Providers do not promise a monthly bucket of interchangeable tokens. The capacity settings below are editable scenario assumptions: how many calls containing 8,000 input and 2,000 total output tokens you can complete per active day. Larger calls consume proportionally more capacity. The defaults, including upgrade ratios, are illustrative, not measured limits. Model choice, rolling windows, weekly caps, shared usage, and availability can change what actually fits. Start with your own usage history and adjust them.

When a subscription runs out of modeled capacity, the calculator sends the remainder to the cheapest eligible API route. This assumes you can switch tools and providers. A combination can spread tasks across its two apps; it cannot pool their actual rate limits or give both subscriptions the same request for free. Subscription scenarios assume supported app or coding-assistant use, and do not promise access to the exact API model displayed. Choose **API / custom agents** for workloads that need API credentials.

**Model mix is a routing choice, not a quality score.** Economy, balanced, and premium map to the named models in the source table. DeepSeek V4 Pro appears in both balanced and premium. These choices do not claim equal quality, latency, privacy, or reliability across providers. The recommendations mean lowest modeled cost under your constraints.

The comparison covers paid individual plans and text APIs. Free tiers, team plans, and enterprise contracts are outside its scope. All amounts are USD per month at monthly web subscription rates, before tax. API estimates include selected cache reads and writes, published long-prompt surcharges, and OpenRouter’s Standard credit purchase fee amortized over usage. DeepSeek uses peak prices. Taxes, minimum top-ups, unused prepaid balances, off-peak discounts, search, images, audio, storage, hosted tools, batch discounts, and regional pricing are excluded. A minimum-context requirement filters API models and removes app scenarios because app context limits are not verified by this dataset. Direct API context limits use OpenRouter’s catalog as a proxy and can differ by account or deployment.

Claude Max API credits are applied only when you opt in to having claimed them for an eligible app or custom agent. They reduce direct Anthropic API costs, including modeled spillover, and expire each billing cycle. They do not cover Claude Code or extra usage in Claude apps. Check eligibility and current plan availability in the linked sources before buying.

## Keeping the data current

The page embeds a JSON snapshot at build time. A daily GitHub Actions workflow fetches the public sources, validates the result, builds Jekyll, and deploys a static Pages artifact. No provider credentials or live pricing requests are needed in your browser. Each source keeps its own verification time. If a fetch or parser fails, the refresh retains that source’s saved prices and marks them stale instead of silently substituting zero.

<script id="ai-pricing-data" type="application/json">{{ site.data.ai_pricing | jsonify | replace: '</', '<\/' }}</script>
<script defer src="{{ '/assets/javascript/ai-cost-engine.js' | relative_url }}"></script>
<script defer src="{{ '/assets/javascript/ai-cost-ui.js' | relative_url }}"></script>
