(function () {
  'use strict';
  const app = document.getElementById('ai-calculator');
  if (!app) return;
  const $ = id => document.getElementById(`aic-${id}`);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => n > 0 && n < 0.01 ? '<$0.01' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
  const compact = n => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  const integer = n => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n);
  const mixes = ['Economy', 'Balanced', 'Premium'];
  const colors = ['#63c9bd', '#efbe62', '#87b7f2', '#cba0e5', '#e9998c', '#abc96d'];
  const percent = n => `${Math.round(n * 100)}%`;
  const feePercent = n => `${Number((n * 100).toFixed(2))}%`;
  const rateMoney = n => `$${Number(n.toFixed(5))}`;
  const date = value => new Date(value).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';
  let data, engine;
  const presets = {
    casual: { tasks: 5, days: 18, input: 2000, output: 500, complexity: 0, reasoning: 1, agents: 0 },
    daily: {},
    agents: { tasks: 60, days: 22, input: 32000, output: 4000, complexity: 2, reasoning: 4, agents: 3, budget: 500 }
  };
  function state() {
    const values = {};
    for (const key of Object.keys(engine.bounds)) values[key] = Number($(key).value);
    return engine.normalize({ ...values, mode: $('mode').value, router: $('router').checked, credits: $('credits').checked,
      families: [...app.querySelectorAll('input[name="family"]:checked')].map(el => el.value),
      capacities: Object.fromEntries([...app.querySelectorAll('[data-capacity]')].map(el => [el.dataset.capacity, Number(el.value)])) });
  }
  function reset(preset = 'daily') {
    const values = { ...engine.defaults, ...presets[preset] };
    for (const key of Object.keys(engine.bounds)) $(key).value = values[key];
    $('mode').value = values.mode; $('router').checked = true; $('credits').checked = false;
    app.querySelectorAll('input[name="family"]').forEach(el => { el.checked = true; });
    app.querySelectorAll('[data-capacity]').forEach(el => { el.value = data.plans.find(p => p.id === el.dataset.capacity).capacity; });
    app.querySelectorAll('[data-preset]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.preset === preset)));
    render();
  }
  function description(c) {
    if (c.kind === 'api') return `Token pricing${c.fee ? ` + ${feePercent(data.routerFee.percent)} credit purchase fee` : ''}.`;
    const covered = `${percent(c.coverage)} covered by assumed app capacity`;
    return `${covered}${c.overflow ? `; remainder via ${c.overflow.label}` : ''}.${c.usedCredit ? ` ${money(c.usedCredit)} claimed API credits used.` : ''}`;
  }
  function card(c, label, empty) {
    if (!c) return `<div class="aic-recommendation"><span class="aic-eyebrow">${label}</span><h3 style="margin-top:12px">${escape(empty)}</h3></div>`;
    return `<div class="aic-recommendation"><span class="aic-eyebrow">${label}</span><div class="aic-price">${escape(money(c.cost))}<small>/ mo</small></div><h3>${escape(c.label)}</h3><p>${escape(description(c))}</p>${c.stale ? '<p>Includes stale pricing. Check sources below.</p>' : ''}</div>`;
  }
  function bars(result) {
    const selected = result.candidates.slice(0, 6);
    for (const c of [result.bestApp, result.bundle, result.candidates.find(c => c.id === 'chatgpt-pro-100'), result.candidates.find(c => c.id === 'claude-max-5')])
      if (c && !selected.some(s => s.id === c.id)) selected.push(c);
    selected.sort((a, b) => a.cost - b.cost);
    const max = Math.max(1, ...selected.map(c => c.cost));
    $('bars').innerHTML = selected.length ? selected.map(c => `<div class="aic-bar-row${c.overBudget ? ' is-over' : ''}"><div class="aic-bar-label"><span>${escape(c.label)}${c.overBudget ? ' <small>over budget</small>' : ''}</span><strong>${escape(money(c.cost))}</strong></div><div class="aic-bar-track" role="img" aria-label="${escape(`${c.label}: ${money(c.cost)} per month; ${money(c.fixed)} subscription and ${money(c.cost - c.fixed)} API`)}"><span class="aic-bar-segment" style="width:${c.fixed / max * 100}%"></span><span class="aic-bar-segment api" style="width:${(c.cost - c.fixed) / max * 100}%"></span></div></div>`).join('') : '<p class="aic-small">No options match these constraints. Include a provider or reduce the required context / token counts.</p>';
  }
  function bundle(result) {
    const b = result.bundle;
    $('bundle').hidden = !b;
    if (!b) return;
    const alternatives = result.candidates.filter(c => ['chatgpt-pro-100', 'claude-max-5'].includes(c.id));
    const upgrade = alternatives.sort((a, b) => a.cost - b.cost)[0];
    const delta = upgrade ? upgrade.cost - b.cost : 0;
    const headline = upgrade ? delta > 0.005 ? `Two plans save ${money(delta)} / month here.` : delta < -0.005 ? `One upgrade saves ${money(-delta)} / month here.` : 'Two plans or one upgrade? A cost tie here.' : 'The two-subscription scenario';
    $('bundle').innerHTML = `<h3>${escape(headline)}</h3><p>${escape(`${b.label}: ${money(b.fixed)} in subscriptions + ${money(b.variable)} API spillover = ${money(b.cost)} / month. ${upgrade ? `${upgrade.label} totals ${money(upgrade.cost)} with spillover.` : ''} The pair covers ${percent(b.coverage)} of your modeled workload in the apps, provided you can split tasks between them.`)}</p>`;
  }
  function curve(result) {
    const picked = [];
    function add(c) { if (c && !picked.some(p => p.id === c.id) && picked.length < 6) picked.push(c); }
    add(result.bestApi || result.candidates.find(c => c.kind === 'api'));
    add(result.bestApp || result.candidates.find(c => c.kind !== 'api'));
    add(result.bundle);
    add(result.candidates.find(c => c.id === 'chatgpt-pro-100'));
    add(result.candidates.find(c => c.id === 'claude-max-5'));
    add(result.candidates.find(c => c.kind === 'api' && c.route === 'direct' && c.family === 'openai'));
    if (!picked.length) { $('curve').innerHTML = ''; $('curve-legend').innerHTML = ''; return; }
    const width = 640, height = 260, left = 54, right = 15, top = 18, bottom = 42;
    const maxTasks = Math.min(250, Math.max(60, Math.ceil(result.state.tasks * 2 / 20) * 20));
    const points = Array.from({ length: 31 }, (_, i) => {
      const tasks = maxTasks * i / 30;
      const r = engine.evaluate(data, { ...result.state, tasks });
      return { tasks, values: picked.map(c => r.candidates.find(p => p.id === c.id)?.cost ?? 0) };
    });
    const high = Math.max(1, result.state.budget <= 500 ? result.state.budget : 0, ...points.flatMap(p => p.values));
    const maxCost = Math.ceil(high / (high < 10 ? 1 : high < 100 ? 10 : 50)) * (high < 10 ? 1 : high < 100 ? 10 : 50);
    const x = n => left + n / maxTasks * (width - left - right);
    const y = n => height - bottom - n / maxCost * (height - top - bottom);
    let svg = `<svg class="aic-curve" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="aic-curve-title aic-curve-desc"><title id="aic-curve-title">Monthly AI costs as daily usage increases</title><desc id="aic-curve-desc">${escape(picked.map(c => `${c.label}: ${money(c.cost)} at ${result.state.tasks} tasks per active day`).join('; '))}. All options at the current workload are in the cost table below.</desc>`;
    for (let i = 0; i <= 4; i++) {
      const value = maxCost * i / 4;
      svg += `<line class="aic-grid" x1="${left}" y1="${y(value)}" x2="${width - right}" y2="${y(value)}"/><text x="${left - 8}" y="${y(value) + 3}" text-anchor="end">$${compact(value)}</text>`;
    }
    for (let i = 0; i <= 4; i++) svg += `<text x="${x(maxTasks * i / 4)}" y="${height - 23}" text-anchor="middle">${integer(maxTasks * i / 4)}</text>`;
    svg += `<text x="${width / 2}" y="${height - 2}" text-anchor="middle">tasks / active day</text>`;
    if (result.state.budget <= maxCost) svg += `<line x1="${left}" y1="${y(result.state.budget)}" x2="${width - right}" y2="${y(result.state.budget)}" stroke="#c6b18a" stroke-dasharray="6 6"/><text x="${width - right}" y="${Math.max(10, y(result.state.budget) - 5)}" text-anchor="end">budget</text>`;
    picked.forEach((c, index) => {
      const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.tasks).toFixed(2)},${y(p.values[index]).toFixed(2)}`).join(' ');
      svg += `<path d="${path}" fill="none" stroke="${colors[index]}" stroke-width="2.3"${index > 2 ? ' stroke-dasharray="5 3"' : ''}><title>${escape(c.label)}</title></path>`;
    });
    svg += `<line class="aic-marker" x1="${x(result.state.tasks)}" y1="${top}" x2="${x(result.state.tasks)}" y2="${height - bottom}"/>`;
    picked.forEach((c, i) => { svg += `<circle cx="${x(result.state.tasks)}" cy="${y(c.cost)}" r="3.5" fill="${colors[i]}"><title>${escape(`${c.label}: ${money(c.cost)}`)}</title></circle>`; });
    $('curve').innerHTML = `${svg}</svg>`;
    $('curve-legend').innerHTML = picked.map((c, i) => `<span><i class="aic-dot" style="background:${colors[i]}"></i>${escape(c.label)}</span>`).join('');
  }
  function tables(result) {
    $('options').innerHTML = result.candidates.map(c => `<tr><td>${escape(c.label)}<small>${escape(c.kind === 'api' ? 'Pay per token' : 'Capacity scenario')}</small></td><td>${escape(money(c.fixed))}</td><td>${escape(money(c.cost - c.fixed))}</td><td><strong>${escape(money(c.cost))}</strong></td><td>${escape(description(c))}${c.overBudget ? ' Over budget.' : ''}${c.stale ? ' Stale source.' : ''}</td></tr>`).join('') || '<tr><td colspan="5">No eligible options.</td></tr>';
    // Show the full catalog, not only models matching the active complexity filter.
    const rows = [];
    for (const model of data.models) for (const route of ['direct', 'router']) {
      if (!model[route]) continue;
      let rates = model[route].rates;
      for (const o of [...model[route].overrides].sort((a, b) => a.above - b.above)) if (result.state.input > o.above) rates = o;
      rows.push(`<tr><td>${escape(model.name)}<small>${model.tiers.map(t => mixes[t]).join(' / ')}</small></td><td>${route === 'router' ? 'OpenRouter' : 'Direct'}${route === 'router' ? `<small>+ ${feePercent(data.routerFee.percent)} purchase fee</small>` : ''}</td><td>${escape(rateMoney(rates.input))}</td><td>${escape(rateMoney(rates.output))}</td><td>${escape(rateMoney(rates.cached))} / ${escape(rateMoney(rates.write))}</td><td>${compact(model.context)}${rates.above !== undefined ? `<small>Long-prompt rate: &gt;${compact(rates.above)} input</small>` : ''}</td></tr>`);
    }
    $('rates').innerHTML = rows.join('');
  }
  function render() {
    const s = state();
    // Cache-read and cache-write shares are disjoint portions of input.
    $('cache').value = s.cache;
    for (const key of ['tasks', 'days', 'input', 'output', 'complexity', 'reasoning', 'agents', 'budget', 'cache', 'writes']) {
      const value = key === 'complexity' ? mixes[s[key]] : key === 'reasoning' ? `${s[key]}×` : ['cache', 'writes'].includes(key) ? `${s[key]}%` : key === 'budget' ? money(s[key]) : integer(s[key]);
      $(`${key}-value`).textContent = value;
      $(key).setAttribute('aria-valuetext', value);
    }
    const result = engine.evaluate(data, s), w = result.workload;
    $('metrics').innerHTML = [[integer(w.calls), 'model calls / month'], [compact(w.input), 'input tokens / month'], [compact(w.output), 'output incl. reasoning / month']].map(([value, label]) => `<div class="aic-metric"><strong>${value}</strong><span>${label}</span></div>`).join('');
    $('recommendations').innerHTML = card(result.bestApi, 'LOWEST API ESTIMATE', 'No API route within budget') + card(result.bestApp, 'LOWEST APP SCENARIO', s.mode === 'api' ? 'API mode: app allowances excluded' : s.minContext > 0 ? 'Required context: API limits only' : 'No app setup within budget');
    bars(result); bundle(result); curve(result); tables(result);
  }
  try {
    engine = window.AICostEngine;
    data = JSON.parse(document.getElementById('ai-pricing-data').textContent);
    const stale = Object.values(data.sources).filter(source => source.status !== 'ok' || Date.now() - Date.parse(source.updatedAt) > 3 * 864e5);
    $('updated').textContent = `Checked ${date(data.updatedAt)}${stale.length ? ` · ${stale.length} stale sources` : ''}`;
    $('updated').classList.toggle('is-stale', stale.length > 0);
    if (stale.length) {
      $('error').textContent = 'Some prices are stale. Estimates retain the last verified rates; source dates are listed below.';
      $('error').hidden = false;
    }
    $('sources').innerHTML = Object.values(data.sources).map(source => `<li><a href="${escape(source.url)}">${escape(source.label)}</a> — verified ${escape(date(source.updatedAt))}${source.status !== 'ok' ? `; last check failed (${escape(date(source.checkedAt))})` : ''}</li>`).join('');
    $('capacities').innerHTML = data.plans.map(p => `<label for="aic-capacity-${p.id}">${escape(p.name)} <span><input form="aic-form" id="aic-capacity-${p.id}" data-capacity="${p.id}" type="number" min="0" max="10000" step="1" value="${p.capacity}" aria-label="${escape(p.name)} assumed 10K-token calls per active day"></span></label>`).join('');
    app.addEventListener('input', event => {
      if (!event.target.matches('input,select')) return;
      if (event.target.matches('[data-capacity]')) {
        const value = Number(event.target.value);
        event.target.value = Math.max(0, Math.min(10000, Number.isFinite(value) ? value : 0));
      }
      app.querySelectorAll('[data-preset]').forEach(el => el.setAttribute('aria-pressed', 'false'));
      render();
    });
    $('form').addEventListener('submit', event => event.preventDefault());
    app.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => reset(button.dataset.preset)));
    $('reset').addEventListener('click', () => reset());
    reset();
  } catch (error) {
    $('error').hidden = false;
    $('error').textContent = 'The calculator could not load its pricing snapshot. Please reload the page. Source links and methodology remain available below.';
    console.error('AI cost calculator:', error);
  }
}());
