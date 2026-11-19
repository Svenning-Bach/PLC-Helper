/* PLC Notation – opslagsapp. Alt indhold ligger i data/notation.json */
(() => {
  'use strict';

  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // localStorage kan fejle (privat tilstand) – appen skal virke alligevel
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignorer */ } }
  };

  const state = {
    data: null,
    vendor: store.get('vendor', 'all'),
    favs: new Set(store.get('favs', [])),
    query: ''
  };

  const view = $('#view');
  const title = $('#pageTitle');
  const backBtn = $('#backBtn');
  const search = $('#search');

  // ---------- Tema ----------
  const applyTheme = t => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
  applyTheme(store.get('theme', null));
  $('#themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    applyTheme(next); store.set('theme', next);
  });

  // ---------- Leverandørfilter ----------
  function syncVendorChips() {
    $$('.vendor-filter .chip').forEach(b => b.classList.toggle('active', b.dataset.vendor === state.vendor));
  }
  $$('.vendor-filter .chip').forEach(b => b.addEventListener('click', () => {
    state.vendor = b.dataset.vendor; store.set('vendor', state.vendor);
    syncVendorChips(); render();
  }));

  // ---------- Søgning ----------
  const norm = s => String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  function searchEntries(q) {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return state.data.entries
      .map(e => {
        const vendorText = Object.values(e.vendors).map(v => `${v.type} ${v.prefix} ${v.note}`).join(' ');
        const hay = norm([e.prefix, e.title, e.meaning, e.example, (e.tags || []).join(' '), vendorText].join(' '));
        if (!words.every(w => hay.includes(w))) return null;
        // simpel rangering: præfiks/titel-match først
        let score = 0;
        const head = norm(e.prefix + ' ' + e.title);
        words.forEach(w => { if (head.startsWith(w)) score += 3; else if (head.includes(w)) score += 2; });
        return { e, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .map(x => x.e);
  }
  let searchTimer;
  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.query = search.value.trim();
      if (state.query && !location.hash.startsWith('#/search')) history.replaceState(null, '', '#/search');
      if (!state.query && location.hash.startsWith('#/search')) history.replaceState(null, '', '#/');
      render();
    }, 120);
  });

  // ---------- Navigation ----------
  $$('.tab').forEach(t => t.addEventListener('click', () => {
    search.value = ''; state.query = '';
    location.hash = t.dataset.tab === 'home' ? '#/' : `#/${t.dataset.tab}`;
  }));
  backBtn.addEventListener('click', () => {
    if (history.length > 1) history.back(); else location.hash = '#/';
  });
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });

  // ---------- Hjælpere til visning ----------
  const catById = id => state.data.categories.find(c => c.id === id);
  const entryById = id => state.data.entries.find(e => e.id === id);

  function subtitleFor(e) {
    if (e.valueRange && state.vendor === 'all') return `${e.valueRange.min}  …  ${e.valueRange.max}`;
    if (state.vendor !== 'all' && e.vendors[state.vendor]) {
      const v = e.vendors[state.vendor];
      return [v.type, v.note].filter(Boolean).join(' · ') || e.meaning;
    }
    return e.meaning;
  }

  function rowList(entries) {
    if (!entries.length) return '<p class="empty">Ingen resultater.</p>';
    return `<div class="list">${entries.map(e => `
      <button class="row" data-go="#/e/${esc(e.id)}">
        <span class="prefix">${esc(e.prefix)}</span>
        <span class="txt"><strong>${state.favs.has(e.id) ? '★ ' : ''}${esc(e.title)}</strong><span>${esc(subtitleFor(e))}</span></span>
        <span class="chev">›</span>
      </button>`).join('')}</div>`;
  }

  function setChrome(text, showBack, tab) {
    title.textContent = text;
    backBtn.hidden = !showBack;
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    document.title = text === 'PLC Notation' ? text : `${text} · PLC Notation`;
  }

  // ---------- Sider ----------
  function renderHome() {
    setChrome('PLC Notation', false, 'home');
    const cats = state.data.categories.map(c => {
      const n = state.data.entries.filter(e => e.category === c.id).length;
      return `<button class="card" data-go="#/cat/${esc(c.id)}">
        <span class="badge">${esc(c.icon)}</span>
        <span><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p></span>
        <span class="count">${n}</span>
      </button>`;
    }).join('');
    view.innerHTML = `<div class="section-title">Kategorier</div><div class="grid">${cats}</div>`;
  }

  function renderCategory(id) {
    const c = catById(id);
    if (!c) return renderHome();
    setChrome(c.name, true, 'home');
    const entries = state.data.entries.filter(e => e.category === id);
    view.innerHTML = `<div class="section-title">${esc(c.description)}</div>${rowList(entries)}`;
  }

  function renderEntry(id) {
    const e = entryById(id);
    if (!e) return renderHome();
    const c = catById(e.category);
    setChrome(e.title, true, 'home');
    const vendors = Object.entries(e.vendors)
      .filter(([k]) => state.vendor === 'all' || k === state.vendor)
      .map(([k, v]) => {
        const name = state.data.vendors[k]?.name || k;
        const rows = [
          v.type ? `<dt>Type</dt><dd>${esc(v.type)}</dd>` : '',
          v.prefix ? `<dt>Præfiks</dt><dd>${esc(v.prefix)}</dd>` : ''
        ].join('');
        return `<section class="vendor ${esc(k)}">
          <h4>${esc(name)}</h4>
          ${rows ? `<dl>${rows}</dl>` : ''}
          ${v.note ? `<p class="note">${esc(v.note)}</p>` : ''}
        </section>`;
      }).join('');
    const isFav = state.favs.has(e.id);
    view.innerHTML = `
      <div class="detail-head">
        <div class="big">${esc(e.prefix)}</div>
        <h2>${esc(e.title)}</h2>
        <p>${esc(e.meaning)}</p>
        <div class="meta">
          <span class="pill">${esc(c?.name)}</span>
          ${e.status ? `<span class="pill ${esc(e.status)}">${esc(state.data.status[e.status] || e.status)}</span>` : ''}
          ${e.size ? `<span class="pill">Størrelse: ${esc(e.size)}</span>` : ''}
          ${e.range ? `<span class="pill">Område: ${esc(e.range)}</span>` : ''}
        </div>
        <button class="fav-btn ${isFav ? 'on' : ''}" id="favToggle">${isFav ? '★ Gemt som favorit' : '☆ Gem som favorit'}</button>
      </div>
      ${rangeBox(e)}
      ${e.example ? `<div class="section-title">Eksempel</div><pre class="code">${esc(e.example)}</pre>` : ''}
      <div class="section-title">Pr. leverandør</div>
      <div class="vendors">${vendors}</div>`;
    $('#favToggle').addEventListener('click', () => {
      state.favs.has(e.id) ? state.favs.delete(e.id) : state.favs.add(e.id);
      store.set('favs', [...state.favs]);
      renderEntry(id);
    });
  }

  function rangeBox(e) {
    const r = e.valueRange;
    if (!r) return '';
    const pair = (min, max) => `
      <div class="range-pair">
        <div><span class="range-label">Min</span><span class="range-val">${esc(min)}</span></div>
        <div><span class="range-label">Max</span><span class="range-val">${esc(max)}</span></div>
      </div>`;
    return `<div class="section-title">Værdiområde</div>
      <div class="range-box">
        ${pair(r.min, r.max)}
        ${r.alt ? `<div class="range-alt">${esc(r.alt.label)}</div>${pair(r.alt.min, r.alt.max)}` : ''}
        ${r.hex ? `<p class="range-note">Hex: <code>${esc(r.hex)}</code></p>` : ''}
        ${r.note ? `<p class="range-note">${esc(r.note)}</p>` : ''}
      </div>`;
  }

  function renderSearch() {
    setChrome('Søgning', true, 'home');
    const res = searchEntries(state.query);
    view.innerHTML = `<div class="section-title">${res.length} resultat${res.length === 1 ? '' : 'er'} for “${esc(state.query)}”</div>${rowList(res)}`;
  }

  function renderFavs() {
    setChrome('Favoritter', false, 'favs');
    const entries = state.data.entries.filter(e => state.favs.has(e.id));
    view.innerHTML = entries.length
      ? `<div class="section-title">Dine gemte opslag</div>${rowList(entries)}`
      : '<p class="empty">Ingen favoritter endnu.<br>Tryk ☆ på et opslag for at gemme det her.</p>';
  }

  // ---------- Navnebygger ----------
  const TYPES = state => state.data.entries.filter(e => e.category === 'types');
  const SCOPES = [
    { id: 'local', label: 'Lokal (VAR)', prefix: '', desc: '' },
    { id: 'in', label: 'Input (VAR_INPUT)', prefix: 'i', desc: 'input' },
    { id: 'out', label: 'Output (VAR_OUTPUT)', prefix: 'q', desc: 'output' },
    { id: 'inout', label: 'In/Out (VAR_IN_OUT)', prefix: 'io', desc: 'in/out' },
    { id: 'global', label: 'Global', prefix: 'g', desc: 'global' },
    { id: 'const', label: 'Konstant', prefix: 'c', desc: 'konstant' }
  ];
  const CASES = [
    { id: 'camel', label: 'camelCase', ex: 'startButton' },
    { id: 'pascal', label: 'PascalCase', ex: 'StartButton' },
    { id: 'snake', label: 'snake_case', ex: 'start_button' },
    { id: 'pascalsnake', label: 'Pascal_Snake_Case', ex: 'Start_Button' },
    { id: 'upper', label: 'UPPER_CASE', ex: 'START_BUTTON' }
  ];
  const words = s => norm(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const cap = w => w.charAt(0).toUpperCase() + w.slice(1);

  // Returnerer navnet som dele, så vi kan forklare hvad hver del betyder
  function buildName(o) {
    const w = words(o.text);
    if (!w.length) return [];
    const t = state.data.entries.find(e => e.id === o.type);
    const scope = SCOPES.find(s => s.id === o.scope);
    const parts = [];
    const snakeStyle = ['snake', 'pascalsnake', 'upper'].includes(o.casing);
    const hasPrefix = (o.useScope && scope?.prefix) || (o.useType && t);
    if (o.useScope && scope?.prefix) parts.push({ text: scope.prefix + '_', kind: 'scope', desc: `scope: ${scope.desc}` });
    if (o.useType && t) {
      const tp = t.prefix.split(/[\s/]/)[0];
      parts.push({ text: tp + (snakeStyle ? '_' : ''), kind: 'type', desc: `type: ${t.title}` });
    }
    let name;
    switch (o.casing) {
      case 'camel': name = hasPrefix ? w.map(cap).join('') : w.map((x, i) => i ? cap(x) : x).join(''); break;
      case 'pascal': name = w.map(cap).join(''); break;
      case 'snake': name = w.join('_'); break;
      case 'pascalsnake': name = w.map(cap).join('_'); break;
      default: name = w.map(x => x.toUpperCase()).join('_');
    }
    parts.push({ text: name, kind: 'name', desc: 'beskrivende navn' });
    return parts;
  }

  function renderBuilder() {
    setChrome('Navnebygger', false, 'builder');
    const def = { casing: 'camel', useType: true, useScope: true, scope: 'in', type: 'bool', text: 'start button' };
    const saved = Object.assign({}, def, store.get('builder2', {}));
    const typeOpts = TYPES(state).map(e => `<option value="${esc(e.id)}">${esc(e.title)} (${esc(e.prefix)})</option>`).join('');
    const scopeOpts = SCOPES.map(s => `<option value="${s.id}">${esc(s.label)}${s.prefix ? ` (${s.prefix}_)` : ''}</option>`).join('');
    const caseOpts = CASES.map(c => `<option value="${c.id}">${esc(c.label)} (fx ${esc(c.ex)})</option>`).join('');
    view.innerHTML = `
      <div class="section-title">Byg et variabelnavn og kombinér stilarter</div>
      <div class="builder">
        <label>Hvad er det? (skriv med almindelige ord, gerne på engelsk)
          <input id="bText" type="text" placeholder="fx start button"></label>
        <label>Skrivemåde<select id="bCasing">${caseOpts}</select></label>
        <label class="check"><input id="bUseType" type="checkbox"> <span><strong>Ungarsk notation</strong> (typepræfiks, fx x for BOOL)</span></label>
        <label id="bTypeWrap">Datatype<select id="bType">${typeOpts}</select></label>
        <label class="check"><input id="bUseScope" type="checkbox"> <span><strong>Scope-præfiks</strong> (fx i_ for input, g_ for global)</span></label>
        <label id="bScopeWrap">Scope<select id="bScope">${scopeOpts}</select></label>
        <div><div class="hint">Resultat</div><div class="result" id="bResult">–</div></div>
        <div class="parts" id="bParts"></div>
        <p class="hint" id="bHint"></p>
      </div>`;
    const els = { text: $('#bText'), casing: $('#bCasing'), useType: $('#bUseType'), type: $('#bType'), useScope: $('#bUseScope'), scope: $('#bScope') };
    els.text.value = saved.text; els.casing.value = saved.casing; els.type.value = saved.type; els.scope.value = saved.scope;
    els.useType.checked = saved.useType; els.useScope.checked = saved.useScope;
    const update = () => {
      const o = { text: els.text.value, casing: els.casing.value, useType: els.useType.checked, type: els.type.value, useScope: els.useScope.checked, scope: els.scope.value };
      store.set('builder2', o);
      $('#bTypeWrap').hidden = !o.useType;
      $('#bScopeWrap').hidden = !o.useScope;
      const parts = buildName(o);
      const full = parts.map(p => p.text).join('');
      $('#bResult').innerHTML = parts.length ? parts.map(p => `<span class="part-${p.kind}">${esc(p.text)}</span>`).join('') : '–';
      $('#bParts').innerHTML = parts.map(p => `<span class="part-chip part-${p.kind}"><code>${esc(p.text.replace(/_$/, ''))}</code> ${esc(p.desc)}</span>`).join('');
      const tips = [];
      if (o.useType && o.casing === 'camel') tips.push('Ungarsk notation + camelCase: præfikset står med småt, og hvert ord i navnet starter med stort. Det er CODESYS\' egen anbefaling.');
      if (!o.useType && o.casing === 'camel') tips.push('Ren camelCase uden typepræfiks. Det anbefaler Siemens\' styleguide.');
      if (o.casing === 'pascalsnake') tips.push('Pascal_Snake_Case er udbredt i Allen-Bradley, hvor tags ikke skelner mellem store og små bogstaver.');
      if (o.casing === 'upper') tips.push('STORE_BOGSTAVER bruges normalt kun til konstanter.');
      if (full.length > 40) tips.push(`Navnet er ${full.length} tegn. Allen-Bradley tillader højst 40.`);
      $('#bHint').textContent = tips.join(' ');
    };
    Object.values(els).forEach(el => { el.addEventListener('input', update); el.addEventListener('change', update); });
    update();
  }

  // ---------- Router ----------
  function render() {
    const h = location.hash || '#/';
    if (state.query) return renderSearch();
    if (h.startsWith('#/cat/')) return renderCategory(decodeURIComponent(h.slice(6)));
    if (h.startsWith('#/e/')) return renderEntry(decodeURIComponent(h.slice(4)));
    if (h === '#/favs') return renderFavs();
    if (h === '#/builder') return renderBuilder();
    return renderHome();
  }

  view.addEventListener('click', ev => {
    const go = ev.target.closest('[data-go]');
    if (!go) return;
    if (state.query) { search.value = ''; state.query = ''; }
    location.hash = go.dataset.go;
  });

  // ---------- Start ----------
  syncVendorChips();
  fetch('data/notation.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(d => { state.data = d; render(); })
    .catch(err => {
      view.innerHTML = `<p class="empty">Kunne ikke indlæse data (${esc(err.message)}).<br>Start appen via en webserver, fx <code>python -m http.server</code>.</p>`;
    });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
