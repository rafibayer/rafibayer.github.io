(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AICostEngine = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const defaults = Object.freeze({ tasks: 24, days: 22, input: 8000, output: 2000, complexity: 1,
    reasoning: 2, agents: 1, cache: 0, writes: 0, budget: 100, minContext: 0,
    mode: 'interactive', router: true, credits: false, families: ['openai', 'anthropic', 'deepseek', 'google'], capacities: {} });
  const bounds = { tasks: [0, 250], days: [0, 31], input: [500, 1000000], output: [100, 32000],
    complexity: [0, 2], reasoning: [1, 8], agents: [0, 8], cache: [0, 100], writes: [0, 100], budget: [0, 5000], minContext: [0, 1000000] };
  function normalize(input = {}) {
    const s = { ...defaults, ...input };
    for (const [key, [min, max]] of Object.entries(bounds)) s[key] = Math.max(min, Math.min(max, Number.isFinite(Number(s[key])) ? Number(s[key]) : defaults[key]));
    s.complexity = Math.round(s.complexity); s.agents = Math.round(s.agents);
    s.families = Array.isArray(s.families) ? s.families.filter(f => defaults.families.includes(f)) : [...defaults.families];
    s.capacities = s.capacities && typeof s.capacities === 'object' ? s.capacities : {};
    s.mode = s.mode === 'api' ? 'api' : 'interactive';
    s.cache = Math.min(s.cache, 100 - s.writes);
    return s;
  }
  function workload(input) {
    const s = normalize(input), calls = s.tasks * s.days * (1 + s.agents);
    const perCallOutput = s.output * s.reasoning;
    return { calls, input: calls * s.input, output: calls * perCallOutput, perCallOutput,
      units: calls * (s.input + perCallOutput) / 10000, dailyUnits: s.tasks * (1 + s.agents) * (s.input + perCallOutput) / 10000 };
  }
  function apiOptions(data, input) {
    const s = normalize(input), w = workload(s), result = [];
    for (const model of data.models) {
      if (!model.tiers.includes(s.complexity) || !s.families.includes(model.family) ||
          model.context < Math.max(s.minContext, s.input + w.perCallOutput) || model.maxOutput < w.perCallOutput) continue;
      for (const route of ['direct', 'router']) {
        if (!model[route] || (route === 'router' && !s.router)) continue;
        let rates = model[route].rates;
        for (const override of [...model[route].overrides].sort((a, b) => a.above - b.above)) if (s.input > override.above) rates = override;
        const hit = s.cache / 100, write = s.writes / 100;
        const inputCost = w.input / 1e6 * (rates.input * (1 - hit - write) + rates.cached * hit + rates.write * write);
        const outputCost = w.output / 1e6 * rates.output;
        const fee = route === 'router' ? (inputCost + outputCost) * data.routerFee.percent : 0;
        result.push({ id: `${route}-${model.id}`, label: `${model.name}${route === 'router' ? ' · OpenRouter' : ' · direct'}`,
          family: model.family, kind: 'api', route, cost: inputCost + outputCost + fee,
          fixed: 0, variable: inputCost + outputCost, fee, inputCost, outputCost, rates, model, sources: route === 'router' ? ['router', 'fees'] : [model.source, 'router'] });
      }
    }
    return result.sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));
  }
  function evaluate(data, input = {}) {
    const s = normalize(input), w = workload(s), apis = apiOptions(data, s);
    const candidates = [...apis];
    const plans = data.plans.filter(p => s.families.includes(p.family) &&
      !(p.id === 'chatgpt-plus' && s.complexity === 2));
    const setups = plans.map(p => [p]);
    for (const openai of plans.filter(p => p.family === 'openai'))
      for (const claude of plans.filter(p => p.family === 'anthropic')) setups.push([openai, claude]);
    for (const setup of setups) {
      // Explicit context requirements are only verified against the API catalog, never app limits.
      if (s.minContext > 0 || (s.mode === 'api' && (!s.credits || !setup.some(p => p.apiCredit)))) continue;
      if (s.mode === 'api' && setup.some(p => !p.apiCredit)) continue;
      const fixed = setup.reduce((sum, p) => sum + p.monthly, 0);
      const capacity = s.mode === 'api' ? 0 : setup.reduce((sum, p) => {
        const custom = Number(s.capacities[p.id]);
        return sum + (Number.isFinite(custom) && custom >= 0 ? custom : p.capacity) * s.days;
      }, 0);
      const covered = Math.min(w.units, capacity);
      const remaining = w.units === 0 ? 0 : 1 - covered / w.units;
      const apiCredit = s.credits ? setup.reduce((sum, p) => sum + (p.apiCredit || 0), 0) : 0;
      // Credits apply only to eligible direct Anthropic API work, never router or app usage.
      const overflow = apis.map(api => {
        const credit = api.route === 'direct' && api.family === 'anthropic' ? apiCredit : 0;
        const gross = api.cost * remaining;
        return { api, cost: Math.max(0, gross - credit), usedCredit: Math.min(gross, credit) };
      }).sort((a, b) => a.cost - b.cost || a.api.id.localeCompare(b.api.id))[0];
      if (remaining > 1e-9 && !overflow) continue;
      const sourceIds = [...setup.map(p => p.source), ...(remaining > 0 ? overflow.api.sources : []), ...(apiCredit ? ['credits'] : [])];
      candidates.push({ id: setup.map(p => p.id).join('+'), label: setup.map(p => p.name).join(' + '), kind: setup.length > 1 ? 'bundle' : 'subscription',
        fixed, variable: overflow?.cost || 0, fee: 0, cost: fixed + (overflow?.cost || 0),
        capacity, coverage: w.units === 0 ? 1 : covered / w.units, remaining, setup,
        overflow: remaining > 0 ? overflow?.api : null, usedCredit: overflow?.usedCredit || 0, sources: [...new Set(sourceIds)] });
    }
    candidates.forEach(c => {
      c.overBudget = c.cost > s.budget + 1e-9;
      c.stale = c.sources.some(id => {
        const source = data.sources[id];
        return !source || source.status !== 'ok' || Date.now() - Date.parse(source.updatedAt) > 3 * 864e5;
      });
    });
    candidates.sort((a, b) => a.cost - b.cost || a.id.localeCompare(b.id));
    const withinBudget = candidates.filter(c => !c.overBudget);
    return { state: s, workload: w, candidates, best: withinBudget[0] || null,
      bestApi: withinBudget.find(c => c.kind === 'api') || null,
      bestApp: withinBudget.find(c => c.kind !== 'api') || null,
      bundle: candidates.find(c => c.id === 'chatgpt-plus+claude-pro') || null };
  }
  return { defaults, bounds, normalize, workload, apiOptions, evaluate };
}));
