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

  // ---------- Sprog (dansk/engelsk) ----------
  const I18N = {
    da: {
      appTitle: 'PLC Notation', back: 'Tilbage', theme: 'Skift lyst/mørkt tema', langBtn: 'EN', langAria: 'Switch to English',
      searchPh: 'Søg: R_TRIG, int, timer, flanke…', searchAria: 'Søg', vendorAria: 'Vælg leverandør', all: 'Alle',
      menuAria: 'Hovedmenu', tabHome: 'Kategorier', tabFavs: 'Favoritter', tabBuilder: 'Navnebygger',
      description: 'Opslag af ungarsk notation og navngivning for CODESYS, Siemens og Allen-Bradley.',
      noResults: 'Ingen resultater.', categories: 'Kategorier', type: 'Type', prefix: 'Præfiks',
      favOn: '★ Gemt som favorit', favOff: '☆ Gem som favorit', size: 'Størrelse', range: 'Område',
      example: 'Eksempel', perVendor: 'Pr. leverandør', valueRange: 'Værdiområde',
      search: 'Søgning', results: n => `${n} resultat${n === 1 ? '' : 'er'}`, resultsFor: (r, q) => `${r} for “${q}”`,
      yourFavs: 'Dine gemte opslag', noFavs: 'Ingen favoritter endnu.<br>Tryk ☆ på et opslag for at gemme det her.',
      loadError: m => `Kunne ikke indlæse data (${m}).<br>Start appen via en webserver, fx <code>python -m http.server</code>.`,
      bTitle: 'Byg et variabelnavn og kombinér stilarter', bText: 'Hvad er det? (skriv med almindelige ord, gerne på engelsk)',
      bTextPh: 'fx start button', bCasing: 'Skrivemåde', eg: 'fx',
      bUseType: '<strong>Ungarsk notation</strong> (typepræfiks, fx x for BOOL)', bType: 'Datatype',
      bUseScope: '<strong>Scope-præfiks</strong> (fx i_ for input, g_ for global)', bScope: 'Scope', bResult: 'Resultat',
      scopeLabels: { local: 'Lokal (VAR)', in: 'Input (VAR_INPUT)', out: 'Output (VAR_OUTPUT)', inout: 'In/Out (VAR_IN_OUT)', global: 'Global', const: 'Konstant' },
      scopeDesc: { in: 'input', out: 'output', inout: 'in/out', global: 'global', const: 'konstant' },
      partScope: d => `scope: ${d}`, partType: d => `type: ${d}`, partName: 'beskrivende navn',
      tipHungCamel: 'Ungarsk notation + camelCase: præfikset står med småt, og hvert ord i navnet starter med stort. Det er CODESYS\' egen anbefaling.',
      tipCamel: 'Ren camelCase uden typepræfiks. Det anbefaler Siemens\' styleguide.',
      tipPascalSnake: 'Pascal_Snake_Case er udbredt i Allen-Bradley, hvor tags ikke skelner mellem store og små bogstaver.',
      tipUpper: 'STORE_BOGSTAVER bruges normalt kun til konstanter.',
      tipLength: n => `Navnet er ${n} tegn. Allen-Bradley tillader højst 40.`
    },
    en: {
      appTitle: 'PLC Notation', back: 'Back', theme: 'Toggle light/dark theme', langBtn: 'DA', langAria: 'Skift til dansk',
      searchPh: 'Search: R_TRIG, int, timer, edge…', searchAria: 'Search', vendorAria: 'Choose vendor', all: 'All',
      menuAria: 'Main menu', tabHome: 'Categories', tabFavs: 'Favorites', tabBuilder: 'Name builder',
      description: 'Look up Hungarian notation and naming for CODESYS, Siemens and Allen-Bradley.',
      noResults: 'No results.', categories: 'Categories', type: 'Type', prefix: 'Prefix',
      favOn: '★ Saved as favorite', favOff: '☆ Save as favorite', size: 'Size', range: 'Range',
      example: 'Example', perVendor: 'Per vendor', valueRange: 'Value range',
      search: 'Search', results: n => `${n} result${n === 1 ? '' : 's'}`, resultsFor: (r, q) => `${r} for “${q}”`,
      yourFavs: 'Your saved entries', noFavs: 'No favorites yet.<br>Tap ☆ on an entry to save it here.',
      loadError: m => `Could not load data (${m}).<br>Start the app through a web server, e.g. <code>python -m http.server</code>.`,
      bTitle: 'Build a variable name and combine styles', bText: 'What is it? (describe it in plain words, preferably in English)',
      bTextPh: 'e.g. start button', bCasing: 'Naming style', eg: 'e.g.',
      bUseType: '<strong>Hungarian notation</strong> (type prefix, e.g. x for BOOL)', bType: 'Data type',
      bUseScope: '<strong>Scope prefix</strong> (e.g. i_ for input, g_ for global)', bScope: 'Scope', bResult: 'Result',
      scopeLabels: { local: 'Local (VAR)', in: 'Input (VAR_INPUT)', out: 'Output (VAR_OUTPUT)', inout: 'In/Out (VAR_IN_OUT)', global: 'Global', const: 'Constant' },
      scopeDesc: { in: 'input', out: 'output', inout: 'in/out', global: 'global', const: 'constant' },
      partScope: d => `scope: ${d}`, partType: d => `type: ${d}`, partName: 'descriptive name',
      tipHungCamel: 'Hungarian notation + camelCase: the prefix is lower case and every word in the name starts with a capital. This is CODESYS\' own recommendation.',
      tipCamel: 'Plain camelCase without a type prefix. This is what the Siemens style guide recommends.',
      tipPascalSnake: 'Pascal_Snake_Case is common in Allen-Bradley, where tags are not case sensitive.',
      tipUpper: 'UPPER_CASE is normally only used for constants.',
      tipLength: n => `The name is ${n} characters. Allen-Bradley allows at most 40.`
    }
  };
  let lang = store.get('lang', 'da') === 'en' ? 'en' : 'da';
  const t = (k, ...a) => { const v = I18N[lang][k]; return typeof v === 'function' ? v(...a) : v; };

  // Lægger den engelske oversættelse (data/notation.en.json) oven på de danske data.
  // Felter der mangler i oversættelsen beholder den danske tekst. Tags slås sammen,
  // så man også kan søge på danske ord, når appen står på engelsk.
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  function deepMerge(base, over) {
    if (Array.isArray(base) && Array.isArray(over)) return [...new Set([...base, ...over])];
    if (!isObj(base) || !isObj(over)) return over === undefined ? base : over;
    const out = { ...base };
    for (const k of Object.keys(over)) out[k] = deepMerge(base[k], over[k]);
    return out;
  }
  function translate(da, en) {
    if (!en) return da;
    return {
      ...da,
      status: { ...da.status, ...en.status },
      categories: da.categories.map(c => deepMerge(c, en.categories?.[c.id] || {})),
      entries: da.entries.map(e => deepMerge(e, en.entries?.[e.id] || {}))
    };
  }

  const state = {
    data: null,
    raw: { da: null, en: null },
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

  function applyStaticTexts() {
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nAria)));
    $$('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    $('meta[name="description"]').setAttribute('content', t('description'));
    const lb = $('#langBtn');
    lb.title = t('langAria');
  }

  // Henter engelsk data første gang der skiftes til engelsk
  function loadLang(l) {
    if (l === 'da' || state.raw.en) return Promise.resolve();
    return fetch('data/notation.en.json')
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(d => { state.raw.en = d; });
  }
  function useData() { state.data = lang === 'en' ? translate(state.raw.da, state.raw.en) : state.raw.da; }

  $('#langBtn').addEventListener('click', () => {
    const next = lang === 'da' ? 'en' : 'da';
    loadLang(next).then(() => {
      lang = next; store.set('lang', lang);
      applyStaticTexts(); useData(); render();
    }).catch(() => { /* offline uden cache: bliv på nuværende sprog */ });
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
    if (!entries.length) return `<p class="empty">${t('noResults')}</p>`;
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
    document.title = text === t('appTitle') ? text : `${text} · ${t('appTitle')}`;
  }

  // ---------- Sider ----------
  function renderHome() {
    setChrome(t('appTitle'), false, 'home');
    const cats = state.data.categories.map(c => {
      const n = state.data.entries.filter(e => e.category === c.id).length;
      return `<button class="card" data-go="#/cat/${esc(c.id)}">
        <span class="badge">${esc(c.icon)}</span>
        <span><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p></span>
        <span class="count">${n}</span>
      </button>`;
    }).join('');
    view.innerHTML = `<div class="section-title">${t('categories')}</div><div class="grid">${cats}</div>`;
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
          v.type ? `<dt>${t('type')}</dt><dd>${esc(v.type)}</dd>` : '',
          v.prefix ? `<dt>${t('prefix')}</dt><dd>${esc(v.prefix)}</dd>` : ''
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
          ${e.size ? `<span class="pill">${t('size')}: ${esc(e.size)}</span>` : ''}
          ${e.range ? `<span class="pill">${t('range')}: ${esc(e.range)}</span>` : ''}
        </div>
        <button class="fav-btn ${isFav ? 'on' : ''}" id="favToggle">${isFav ? t('favOn') : t('favOff')}</button>
      </div>
      ${rangeBox(e)}
      ${e.example ? `<div class="section-title">${t('example')}</div><pre class="code">${esc(e.example)}</pre>` : ''}
      <div class="section-title">${t('perVendor')}</div>
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
    return `<div class="section-title">${t('valueRange')}</div>
      <div class="range-box">
        ${pair(r.min, r.max)}
        ${r.alt ? `<div class="range-alt">${esc(r.alt.label)}</div>${pair(r.alt.min, r.alt.max)}` : ''}
        ${r.hex ? `<p class="range-note">Hex: <code>${esc(r.hex)}</code></p>` : ''}
        ${r.note ? `<p class="range-note">${esc(r.note)}</p>` : ''}
      </div>`;
  }

  function renderSearch() {
    setChrome(t('search'), true, 'home');
    const res = searchEntries(state.query);
    view.innerHTML = `<div class="section-title">${t('resultsFor', t('results', res.length), esc(state.query))}</div>${rowList(res)}`;
  }

  function renderFavs() {
    setChrome(t('tabFavs'), false, 'favs');
    const entries = state.data.entries.filter(e => state.favs.has(e.id));
    view.innerHTML = entries.length
      ? `<div class="section-title">${t('yourFavs')}</div>${rowList(entries)}`
      : `<p class="empty">${t('noFavs')}</p>`;
  }

  // ---------- Navnebygger ----------
  const TYPES = state => state.data.entries.filter(e => e.category === 'types');
  // Tekster (label/desc) hentes fra I18N, så de følger sproget
  const SCOPES = [
    { id: 'local', prefix: '' },
    { id: 'in', prefix: 'i' },
    { id: 'out', prefix: 'q' },
    { id: 'inout', prefix: 'io' },
    { id: 'global', prefix: 'g' },
    { id: 'const', prefix: 'c' }
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
    const tp_ = state.data.entries.find(e => e.id === o.type);
    const scope = SCOPES.find(s => s.id === o.scope);
    const parts = [];
    const snakeStyle = ['snake', 'pascalsnake', 'upper'].includes(o.casing);
    const hasPrefix = (o.useScope && scope?.prefix) || (o.useType && tp_);
    if (o.useScope && scope?.prefix) parts.push({ text: scope.prefix + '_', kind: 'scope', desc: t('partScope', t('scopeDesc')[scope.id]) });
    if (o.useType && tp_) {
      const tp = tp_.prefix.split(/[\s/]/)[0];
      parts.push({ text: tp + (snakeStyle ? '_' : ''), kind: 'type', desc: t('partType', tp_.title) });
    }
    let name;
    switch (o.casing) {
      case 'camel': name = hasPrefix ? w.map(cap).join('') : w.map((x, i) => i ? cap(x) : x).join(''); break;
      case 'pascal': name = w.map(cap).join(''); break;
      case 'snake': name = w.join('_'); break;
      case 'pascalsnake': name = w.map(cap).join('_'); break;
      default: name = w.map(x => x.toUpperCase()).join('_');
    }
    parts.push({ text: name, kind: 'name', desc: t('partName') });
    return parts;
  }

  function renderBuilder() {
    setChrome(t('tabBuilder'), false, 'builder');
    const def = { casing: 'camel', useType: true, useScope: true, scope: 'in', type: 'bool', text: 'start button' };
    const saved = Object.assign({}, def, store.get('builder2', {}));
    const typeOpts = TYPES(state).map(e => `<option value="${esc(e.id)}">${esc(e.title)} (${esc(e.prefix)})</option>`).join('');
    const scopeOpts = SCOPES.map(s => `<option value="${s.id}">${esc(t('scopeLabels')[s.id])}${s.prefix ? ` (${s.prefix}_)` : ''}</option>`).join('');
    const caseOpts = CASES.map(c => `<option value="${c.id}">${esc(c.label)} (${t('eg')} ${esc(c.ex)})</option>`).join('');
    view.innerHTML = `
      <div class="section-title">${t('bTitle')}</div>
      <div class="builder">
        <label>${t('bText')}
          <input id="bText" type="text" placeholder="${esc(t('bTextPh'))}"></label>
        <label>${t('bCasing')}<select id="bCasing">${caseOpts}</select></label>
        <label class="check"><input id="bUseType" type="checkbox"> <span>${t('bUseType')}</span></label>
        <label id="bTypeWrap">${t('bType')}<select id="bType">${typeOpts}</select></label>
        <label class="check"><input id="bUseScope" type="checkbox"> <span>${t('bUseScope')}</span></label>
        <label id="bScopeWrap">${t('bScope')}<select id="bScope">${scopeOpts}</select></label>
        <div><div class="hint">${t('bResult')}</div><div class="result" id="bResult">–</div></div>
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
      if (o.useType && o.casing === 'camel') tips.push(t('tipHungCamel'));
      if (!o.useType && o.casing === 'camel') tips.push(t('tipCamel'));
      if (o.casing === 'pascalsnake') tips.push(t('tipPascalSnake'));
      if (o.casing === 'upper') tips.push(t('tipUpper'));
      if (full.length > 40) tips.push(t('tipLength', full.length));
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
  applyStaticTexts();
  fetch('data/notation.json')
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(d => { state.raw.da = d; return loadLang(lang).catch(() => { lang = 'da'; applyStaticTexts(); }); })
    .then(() => { useData(); render(); })
    .catch(err => {
      view.innerHTML = `<p class="empty">${t('loadError', esc(err.message))}</p>`;
    });

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
