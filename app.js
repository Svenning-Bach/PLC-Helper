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
    { id: 'local', label: 'Lokal (VAR)', cds: '' },
    { id: 'in', label: 'Input (VAR_INPUT)', cds: 'i_' },
    { id: 'out', label: 'Output (VAR_OUTPUT)', cds: 'q_' },
    { id: 'inout', label: 'In/Out (VAR_IN_OUT)', cds: 'io_' },
    { id: 'global', label: 'Global', cds: 'g_' },
    { id: 'const', label: 'Konstant', cds: 'c_' }
  ];
  const words = s => norm(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const cap = w => w.charAt(0).toUpperCase() + w.slice(1);

  function buildName(style, scopeId, typeId, text) {
    const w = words(text);
    if (!w.length) return '';
    const t = state.data.entries.find(e => e.id === typeId);
    const scope = SCOPES.find(s => s.id === scopeId);
    if (style === 'codesys') {
      return (scope?.cds || '') + (t?.vendors.codesys.prefix || '') + w.map(cap).join('');
    }
    if (style === 'siemens') {
      if (scopeId === 'const') return w.map(x => x.toUpperCase()).join('_');
      const base = w.map((x, i) => i ? cap(x) : x).join('');
      return t?.id === 'bool' && !/^(is|has|can)/.test(base) ? 'is' + cap(base) : base;
    }
    // Allen-Bradley: PascalCase med underscore mellem ord, maks 40 tegn
    return w.map(cap).join('_').slice(0, 40);
  }

  function renderBuilder() {
    setChrome('Navnebygger', false, 'builder');
    const saved = store.get('builder', { style: 'codesys', scope: 'in', type: 'bool', text: 'start button' });
    const typeOpts = TYPES(state).map(e => `<option value="${esc(e.id)}">${esc(e.title)} (${esc(e.prefix)})</option>`).join('');
    const scopeOpts = SCOPES.map(s => `<option value="${s.id}">${esc(s.label)}</option>`).join('');
    view.innerHTML = `
      <div class="section-title">Byg et variabelnavn efter en navnestandard</div>
      <div class="builder">
        <label>Stil
          <select id="bStyle">
            <option value="codesys">CODESYS (ungarsk notation)</option>
            <option value="siemens">Siemens styleguide (camelCase)</option>
            <option value="ab">Allen-Bradley (Pascal_Case)</option>
          </select></label>
        <label>Scope<select id="bScope">${scopeOpts}</select></label>
        <label>Datatype<select id="bType">${typeOpts}</select></label>
        <label>Hvad er det? (skriv med almindelige ord, gerne på engelsk)
          <input id="bText" type="text" placeholder="fx start button"></label>
        <div><div class="hint">Forslag</div><div class="result" id="bResult">–</div></div>
        <p class="hint" id="bHint"></p>
      </div>`;
    const els = { style: $('#bStyle'), scope: $('#bScope'), type: $('#bType'), text: $('#bText') };
    els.style.value = saved.style; els.scope.value = saved.scope; els.type.value = saved.type; els.text.value = saved.text;
    const hints = {
      codesys: 'Scope-præfiks + typepræfiks + PascalCase. Fx i_xStartButton.',
      siemens: 'Siemens anbefaler ingen typepræfiks. BOOL får is/has foran, konstanter skrives med STORE_BOGSTAVER.',
      ab: 'Tags er ikke case-sensitive. Maks 40 tegn, ingen dobbelte eller afsluttende underscore.'
    };
    const update = () => {
      const v = { style: els.style.value, scope: els.scope.value, type: els.type.value, text: els.text.value };
      store.set('builder', v);
      $('#bResult').textContent = buildName(v.style, v.scope, v.type, v.text) || '–';
      $('#bHint').textContent = hints[v.style];
    };
    Object.values(els).forEach(el => el.addEventListener('input', update));
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
