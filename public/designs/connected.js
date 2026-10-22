import { esc, list, title, link, dates, date, empty, rich, image, venue, publicPath, partners, sectionsFor, sectionHTML, sectionPreview, socialLinks } from './comparison-content.js';

const families = {
  centres: { label: 'Centres', singular: 'Centre', intro: 'Find a research home.', description: 'Explore the questions, people and projects connected to each centre.' },
  academy: { label: 'W2M Academy', singular: 'Course', intro: 'Learn in good company.', description: 'Explore the public course outlines, instructors and practical details. Continue to the current LMS for learning and access.' },
  projects: { label: 'Projects', singular: 'Project', intro: 'Follow a question into practice.', description: 'Explore the purpose, approach, people and outputs behind the work.' },
  people: { label: 'People', singular: 'Person', intro: 'Meet the people behind the work.', description: 'Find expertise, publications, teaching and connections across CoDIN.' },
  resources: { label: 'Resources', singular: 'Resource', intro: 'Knowledge you can return to.', description: 'Discover publications, tools and reusable outputs, with clear authorship and access.' },
  events: { label: 'Events', singular: 'Event', intro: 'Come into the conversation.', description: 'Find a gathering, check the practical details and explore its programme.' },
};
const atlasFamilies = new Set(['centres', 'academy', 'projects', 'events']);
const app = document.querySelector('#connected-app');
let snapshot, data, state, record, sections = [], sidebarOpen = false, modal = null, imageDialog = null;
let entryAnimations = [], closing = false, previousOverflow = '', returnCard = null, renderVersion = 0;
const readers = new Set(), recordMemory = new Map(), directoryMemory = new Map();
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const excerpt = (value, max = 180) => { const text = String(value || ''); return text.length > max ? text.slice(0, max - 1).replace(/\s+\S*$/, '') + '…' : text; };
const recordsFor = family => family === 'academy' ? data.courses : family === 'events' ? data.events.filter(r => !r.isCourse) : data[family] || [];
const memory = () => {
  const key = `${state.family}:${state.record}`;
  if (!recordMemory.has(key)) recordMemory.set(key, { chapters: {}, pageScroll: 0, readerScroll: 0, active: '' });
  return recordMemory.get(key);
};
const directory = () => {
  if (!directoryMemory.has(state.family)) directoryMemory.set(state.family, { query: '', status: 'all', track: 'all', scroll: 0 });
  return directoryMemory.get(state.family);
};
function readState() {
  const p = new URLSearchParams(location.search), family = families[p.get('family')] ? p.get('family') : 'events';
  const records = recordsFor(family);
  const defaults = { events: 'voices-traditions-knowing-andamans-through-language-culture', people: 'ritesh', projects: 'tholkudi', centres: 'digital-preservation' };
  return { family, view: p.get('view') === 'index' ? 'index' : 'detail', record: records.find(r => r.slug === p.get('record'))?.slug || records.find(r => r.slug === defaults[family])?.slug || records[0]?.slug || '', section: p.get('section') || '', track: ['online', 'residential'].includes(p.get('track')) ? p.get('track') : 'all' };
}
function url(changes = {}) {
  const next = { ...state, ...changes }, u = new URL(location.href); u.search = '';
  for (const key of ['family', 'view', 'record', 'section', 'track']) if (next[key] && !(key === 'track' && next[key] === 'all')) u.searchParams.set(key, next[key]);
  return u;
}
function livePath() {
  if (state.family === 'events' && record.isCourse) return `${publicPath('events', record)}?isCourse=true`;
  return publicPath(state.family, record);
}
function lmsPath() { return `${snapshot.provenance.source}/academy/online/${encodeURIComponent(record.slug)}`; }
function remember() {
  if (!state) return;
  const browser = document.querySelector('.connected-browser');
  if (browser) directory().scroll = browser.scrollTop;
  for (const reader of readers) reader.remember();
  if (record) memory().pageScroll = scrollY;
}
function disposeReaders() { for (const reader of readers) reader.dispose(); readers.clear(); }
function route(changes, { focus = true } = {}) {
  remember(); history.pushState({}, '', url(changes)); closeModalNow(); disposeReaders();
  state = readState(); sidebarOpen = state.view === 'index'; render(); scrollTo(0, 0);
  if (focus) document.querySelector('#main-content h1')?.focus({ preventScroll: true });
}
function header() {
  return `<header class="connected-header"><a class="wordmark" href="combined.html"><img src="assets/logo.png" width="42" height="42" alt=""><span>CoDIN<small>Council for Diversity and Innovation</small></span></a><nav aria-label="CoDIN preview pages">${Object.entries(families).map(([key, f]) => `<a href="${url({ family: key, view: 'index', record: '', section: '', track: 'all' })}" data-family="${key}" ${state.family === key ? 'aria-current="page"' : ''}>${f.label}</a>`).join('')}</nav></header>`;
}
function browser() {
  const rows = recordsFor(state.family), d = directory();
  return `<aside class="connected-browser" id="record-browser" aria-label="${families[state.family].label} directory"><div class="browser-heading"><p class="kicker">Explore / ${families[state.family].label}</p><button data-browser-close aria-label="Collapse ${families[state.family].label} sidebar">←</button></div><label>Search ${families[state.family].label.toLowerCase()}<input data-directory-search type="search" placeholder="Name, title or topic" value="${esc(d.query)}"></label>${state.family === 'academy' ? `<label class="browser-filter">Course format<select data-track><option value="all">All courses</option><option value="online" ${state.track === 'online' ? 'selected' : ''}>Online</option><option value="residential" ${state.track === 'residential' ? 'selected' : ''}>Residential</option></select></label>` : ''}${rows.some(r => r.status) ? `<label class="browser-filter">Status<select data-directory-status><option value="all">All statuses</option>${[...new Set(rows.map(r => r.status).filter(Boolean))].map(s => `<option value="${esc(s)}" ${d.status === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></label>` : ''}<p class="small" data-directory-count>${rows.length} records</p><div class="connected-records">${rows.map(r => `<a href="${url({ record: r.slug, view: 'detail', section: '' })}" data-record="${esc(r.slug)}" data-search="${esc([title(r), r.role, r.description, ...list(r.researchInterests), ...list(r.keywords)].join(' ').toLowerCase())}" data-status="${esc(r.status || '')}" data-track="${/residential/i.test(r.type || '') ? 'residential' : 'online'}" ${state.view === 'detail' && r.slug === state.record ? 'aria-current="page"' : ''}>${image(r.image, title(r), 'browser-thumb')}<span><strong>${esc(title(r))}</strong><small>${esc(r.shortName || r.role || r.type || r.kind || '')}</small>${r.status ? `<small>${esc(r.status)}</small>` : ''}</span><span class="browser-arrow" aria-hidden="true">↗</span></a>`).join('')}</div><p class="empty-state" data-directory-empty ${rows.length ? 'hidden' : ''}>${rows.length ? 'No matching records. Try another search or filter.' : 'No public records were returned in this snapshot.'}</p><p class="browser-footnote">Choose a record to open its page. Reopen this directory at any time.</p></aside>`;
}
function overview() {
  const f = families[state.family], rows = recordsFor(state.family);
  return `<section class="connected-overview"><p class="kicker">${f.label} / Connected workspace</p><h1 tabindex="-1">${f.intro}</h1><p class="overview-intro">${f.description}</p>${state.family === 'academy' ? `<div class="academy-paths">${[['all', 'All courses'], ['online', 'Online learning'], ['residential', 'Residential learning']].map(([key, text]) => `<a href="${url({ track: key })}" data-track-link="${key}" ${key === state.track ? 'aria-current="true"' : ''}>${text}</a>`).join('')}</div>` : ''}<div class="workspace-explainer"><span class="explainer-mark" aria-hidden="true">↖</span><div><h2>Start with ${/^[aeiou]/i.test(f.singular) ? 'an' : 'a'} ${f.singular.toLowerCase()}.</h2><p>Select a record in the directory. The sidebar folds away and the full page takes its place.</p></div></div><div class="overview-record-grid">${rows.map(r => `<article class="overview-record" data-overview-record="${esc(r.slug)}"><p class="kicker">${esc(r.status || r.role || r.shortName || r.kind || '')}</p><h2><a data-record="${esc(r.slug)}" href="${url({ record: r.slug, view: 'detail', section: '' })}">${esc(title(r))}</a></h2><p>${esc(excerpt(r.description || r.bio))}</p><a data-record="${esc(r.slug)}" href="${url({ record: r.slug, view: 'detail', section: '' })}">Open ${f.singular.toLowerCase()} ↗</a></article>`).join('')}</div><p class="empty-state" data-overview-empty ${rows.length ? 'hidden' : ''}>No public ${f.label.toLowerCase()} match this view. ${!rows.length ? 'This preview does not invent content or downloads.' : 'Change the search or filter to see more.'}</p></section>`;
}
function primaryActions() {
  if (['events', 'academy'].includes(state.family)) return `<div class="learning-actions">${link(lmsPath(), 'Open LMS ↗', 'button primary lms-entry')}${link(livePath(), 'Registration & access ↗', 'button')}<span class="lms-caption">Sign-in and access are checked in the current app.</span></div>`;
  if (state.family === 'people' && record.email) return link(`mailto:${record.email}`, 'Contact ↗', 'button primary');
  if (state.family === 'projects' && record.outputUrl) return link(record.outputUrl, record.outputLabel || 'Explore project output ↗', 'button primary');
  if (state.family === 'resources' && record.url) return link(record.url, 'Access resource ↗', 'button primary');
  return link(livePath(), 'Open current page ↗', 'button');
}
function summary() {
  const intro = state.family === 'people' ? record.bio : record.description || record.tagline;
  const affiliation = data.centres.filter(c => [...list(record.centres), ...list(record.associatedCentres)].includes(c.slug));
  return `<section class="record-summary connected-summary"><div class="summary-copy"><p class="breadcrumb">CoDIN / <a href="${url({ view: 'index', section: '' })}" data-index>${families[state.family].label}</a>${record.shortName ? ` / ${esc(record.shortName)}` : ''}</p><p class="kicker">${esc(record.type || record.kind || record.role || record.tag || families[state.family].singular)}</p><h1 id="detail-title" tabindex="-1">${esc(title(record))}</h1>${intro ? `<p class="record-intro">${esc(intro.length > 290 ? intro.slice(0, 287).replace(/\s+\S*$/, '') + '…' : intro)}</p>` : ''}<div class="facts">${record.status ? `<span class="badge">${esc(record.status)}</span>` : ''}${dates(record) ? `<span>${esc(dates(record))}</span>` : ''}${record.location ? `<span>${venue(record)}</span>` : ''}</div>${affiliation.length ? `<p class="affiliations">${affiliation.map(c => `<a data-related-family="centres" data-related-record="${esc(c.slug)}" href="${url({ family: 'centres', record: c.slug, section: '' })}">${esc(c.shortName || c.name)}</a>`).join(' · ')}</p>` : ''}${state.family === 'people' && list(record.researchInterests).length ? `<div class="interest-list">${record.researchInterests.map(x => `<span>${esc(x)}</span>`).join('')}</div>` : ''}<div class="summary-actions">${primaryActions()}${socialLinks(record)}${record.image ? '<button class="mobile-poster-link" data-image>View image / poster ↗</button>' : ''}</div></div>${record.image ? `<button class="record-art ${state.family === 'people' ? 'portrait' : ''}" data-image aria-label="View published image">${image(record.image, title(record))}<span>View image / poster ↗</span></button>` : ''}</section>${partners(record)}`;
}
function glance(section) {
  const associated = data.centres.filter(c => [...list(record.associatedCentres), ...list(record.centres)].includes(c.slug));
  const fees = list(record.registrationCard?.fees);
  return `<details class="connected-glance" ${innerWidth > 950 ? 'open' : ''}><summary>At a glance <span aria-hidden="true">＋</span></summary><div class="glance-body">${primaryActions()}${record.status ? `<div><span class="small">Status</span><p>${esc(record.status)}</p></div>` : ''}${dates(record) ? `<div><span class="small">When</span><p>${esc(dates(record))}</p></div>` : ''}${record.location ? `<div><span class="small">Where</span><p>${venue(record)}</p></div>` : ''}${record.fundingAgency ? `<div><span class="small">Funding</span><p>${esc(record.fundingAgency)}</p></div>` : ''}${associated.length ? `<div><span class="small">Research homes</span><p>${associated.map(c => link(publicPath('centres', c), c.shortName || c.name)).join(' · ')}</p></div>` : ''}${state.family === 'people' ? `<div><span class="small">Role</span><p>${esc(record.role || '')}</p>${record.email ? link(`mailto:${record.email}`, record.email) : ''}</div>` : ''}${state.family === 'resources' ? `<div><span class="small">Publication details</span><p>${esc([list(record.authors).join(', ') || (typeof record.authors === 'string' ? record.authors : ''), record.year, record.version, record.licence].filter(Boolean).join(' · '))}</p></div>` : ''}${fees.length ? `<details class="glance-fees"><summary>Published fees · ${fees.length} categories</summary>${fees.map(f => `<p class="fee-line">${esc(f.category)}<strong>${esc(f.fee)}</strong></p>`).join('')}</details>` : ''}${record.supportOfficeEmail ? `<p>${link(`mailto:${record.supportOfficeEmail}`, 'Ask the event team ↗')}</p>` : ''}<a class="glance-source" href="${esc(livePath())}">Current full record ↗</a></div></details>`;
}
function sectionNav(active) {
  return `<nav class="reader-index" aria-label="Page sections"><p class="kicker">On this page</p>${sections.map((s, i) => `<a href="${url({ section: s.id })}" data-read-section="${esc(s.id)}" ${s.id === active ? 'aria-current="location"' : ''}><span>${String(i + 1).padStart(2, '0')}</span>${esc(s.label)}</a>`).join('')}</nav><label class="reader-mobile-index">Go to section<select data-reader-select>${sections.map(s => `<option value="${esc(s.id)}" ${s.id === active ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>`;
}
function readerMarkup(active, expanded = false) {
  return `<div class="combined-reader ${expanded ? 'in-modal' : ''}" data-reader>${sectionNav(active)}<div class="reader-chapters">${sections.map((s, i) => `<article class="reader-chapter is-unloaded" id="connected-chapter-${esc(s.id)}" data-chapter="${esc(s.id)}" data-chapter-order="${i}" tabindex="-1"><div class="chapter-placeholder"><p class="kicker">Section ${String(i + 1).padStart(2, '0')}</p><h2>${esc(s.label)}</h2><p>${esc(sectionPreview(s))}</p><button data-load-section="${esc(s.id)}">Read this section ↓</button></div></article>`).join('')}<p class="reader-end">You’ve reached the end of this page. <a href="${url({ section: sections[0]?.id || '' })}" data-read-section="${esc(sections[0]?.id || '')}">Back to the beginning ↑</a></p></div>${glance(sections.find(s => s.id === active))}<p class="reader-live skip" aria-live="polite" role="status"></p></div>`;
}
function atlas() {
  return `<section class="connected-atlas"><div class="overview-heading"><div><p class="kicker">Explore this ${families[state.family].singular.toLowerCase()}</p><h2>A map of what matters.</h2></div><p>Open a section, then keep reading. Close the reading view to return here.</p></div><div class="section-cards atlas-grid">${sections.map((s, i) => `<button class="section-card tone-${i % 4}" data-open-section="${esc(s.id)}" aria-haspopup="dialog"><span class="card-number">${String(i + 1).padStart(2, '0')} / Explore</span><h3>${esc(s.label)}</h3><p>${esc(sectionPreview(s))}</p><span class="card-open">Read section <span aria-hidden="true">↗</span></span></button>`).join('')}</div></section>`;
}
function resourceSections() {
  return [{ id: 'read', label: 'Read & explore', type: 'markdown', content: record.body || record.description }, { id: 'access', label: 'Access & citation', type: 'markdown', content: [record.authors && `Authors: ${Array.isArray(record.authors) ? record.authors.join(', ') : record.authors}`, record.version && `Version: ${record.version}`, record.licence && `Licence: ${record.licence}`, record.url && `[Access resource](${record.url})`].filter(Boolean).join('\n\n') }];
}
function render() {
  renderVersion++; disposeReaders();
  record = recordsFor(state.family).find(r => r.slug === state.record);
  sections = record ? state.family === 'resources' ? resourceSections() : sectionsFor(state.family, record, data) : [];
  // Courseware remains in the existing LMS; the preview provides the actual entry route.
  if (state.family === 'academy') sections = sections.filter(s => s.id !== 'classroom');
  if (state.section && !sections.some(s => s.id === state.section)) { state.section = ''; history.replaceState({}, '', url()); }
  const isIndex = state.view === 'index';
  const active = state.section || sections[0]?.id;
  const main = isIndex ? overview() : record ? `${summary()}${atlasFamilies.has(state.family) ? atlas() : readerMarkup(active)}` : `<section class="connected-overview"><h1 tabindex="-1">${families[state.family].label}</h1>${empty('No public record is available in this snapshot.')}<a href="${url({ view: 'index', section: '' })}" data-index>Browse the directory →</a></section>`;
  app.innerHTML = `${header()}<div class="connected-shell ${sidebarOpen ? 'browser-open' : 'browser-closed'}"><div class="browser-collapse-rail"><button data-browser-toggle aria-expanded="${sidebarOpen}" aria-controls="record-browser" aria-label="Show ${families[state.family].label} sidebar"><span aria-hidden="true">☰</span><span class="rail-label">${families[state.family].label}</span></button></div>${browser()}<main id="main-content" class="connected-main">${main}<footer class="connected-footer"><a href="${url({ view: 'index', section: '' })}" data-index>All ${families[state.family].label.toLowerCase()} →</a><a href="./">Design gallery →</a><button data-print>Print this page</button></footer></main></div>`;
  bindPage(); filterDirectory();
  const browserEl = document.querySelector('.connected-browser'); browserEl.scrollTop = directory().scroll;
  if (!isIndex && record && !atlasFamilies.has(state.family)) mountReader(document.querySelector('[data-reader]'), active, window);
  if (!isIndex && atlasFamilies.has(state.family) && state.section) openSection(state.section, null, false);
  document.title = `${isIndex ? 'All ' + families[state.family].label : record ? title(record) : families[state.family].label} — CoDIN refined design`;
}
function setSidebar(open) {
  const browserEl = document.querySelector('.connected-browser'); if (browserEl) directory().scroll = browserEl.scrollTop;
  sidebarOpen = open; const shell = document.querySelector('.connected-shell');
  shell.classList.toggle('browser-open', open); shell.classList.toggle('browser-closed', !open);
  const toggle = document.querySelector('[data-browser-toggle]'); toggle.setAttribute('aria-expanded', String(open));
  browserEl.inert = !open;
  if (open) browserEl.querySelector('input')?.focus({ preventScroll: true }); else toggle.focus({ preventScroll: true });
}
function filterDirectory() {
  const d = directory(); let count = 0;
  document.querySelectorAll('.connected-records [data-record]').forEach(el => {
    const visible = el.dataset.search.includes(d.query.toLowerCase()) && (d.status === 'all' || el.dataset.status === d.status) && (state.family !== 'academy' || state.track === 'all' || el.dataset.track === state.track);
    el.hidden = !visible; if (visible) count++;
    const card = document.querySelector(`[data-overview-record="${CSS.escape(el.dataset.record)}"]`); if (card) card.hidden = !visible;
  });
  document.querySelector('[data-directory-count]').textContent = `${count} ${count === 1 ? 'record' : 'records'}`;
  document.querySelector('[data-directory-empty]').hidden = count > 0;
  const overviewEmpty = document.querySelector('[data-overview-empty]'); if (overviewEmpty) overviewEmpty.hidden = count > 0;
  document.querySelector('.connected-browser').inert = !sidebarOpen;
}
function bindPage() {
  document.querySelectorAll('[data-family]').forEach(el => el.onclick = e => { e.preventDefault(); route({ family: el.dataset.family, view: 'index', record: '', section: '', track: 'all' }); });
  document.querySelectorAll('[data-record]').forEach(el => el.onclick = e => { e.preventDefault(); route({ record: el.dataset.record, view: 'detail', section: '' }); });
  document.querySelectorAll('[data-related-family]').forEach(el => el.onclick = e => { e.preventDefault(); route({ family: el.dataset.relatedFamily, record: el.dataset.relatedRecord, view: 'detail', section: '', track: 'all' }); });
  document.querySelectorAll('a[data-index]').forEach(el => el.onclick = e => { e.preventDefault(); route({ view: 'index', section: '' }); });
  document.querySelectorAll('[data-open-section]').forEach(el => el.onclick = () => openSection(el.dataset.openSection, el, true));
  document.querySelector('[data-browser-toggle]').onclick = () => setSidebar(!sidebarOpen);
  document.querySelector('[data-browser-close]').onclick = () => setSidebar(false);
  document.querySelector('[data-directory-search]').oninput = e => { directory().query = e.target.value; filterDirectory(); };
  const status = document.querySelector('[data-directory-status]'); if (status) status.onchange = e => { directory().status = e.target.value; filterDirectory(); };
  const track = document.querySelector('[data-track]'); if (track) track.onchange = e => route({ track: e.target.value, view: 'index', section: '' }, { focus: false });
  document.querySelectorAll('[data-track-link]').forEach(el => el.onclick = e => { e.preventDefault(); route({ track: el.dataset.trackLink, view: 'index', section: '' }); });
  document.querySelectorAll('[data-image]').forEach(el => el.onclick = () => showImage(el));
  document.querySelectorAll('[data-print]').forEach(el => el.onclick = () => { for (const reader of readers) reader.loadAll(); window.print(); });
  bindImages(document);
}
function bindImages(root) { root.querySelectorAll('[data-fallback]').forEach(img => { img.onerror = () => img.remove(); img.onload = () => img.dataset.imageReady = 'true'; if (img.complete && img.naturalWidth > 0) img.dataset.imageReady = 'true'; }); }

// One reader owns its progressive mounts and scroll spy. Mounted sections stay mounted.
function mountReader(root, initial, scroller) {
  const localRecord = record, localSections = sections, mem = memory(), version = renderVersion;
  const chapters = [...root.querySelectorAll('[data-chapter]')], loaded = new Set();
  const isWindow = scroller === window;
  let disposed = false, frame = 0, suspended = true, active = initial;
  const offset = () => {
    const headerHeight = isWindow ? 0 : modal?.querySelector('.reader-toolbar')?.getBoundingClientRect().height || 90;
    if (!isWindow) root.style.setProperty('--reader-toolbar-height', `${headerHeight}px`);
    return (isWindow ? 12 : headerHeight) + (innerWidth <= 1100 ? 80 : 14);
  };
  function rememberSection(chapter) {
    if (!chapter) return;
    const previous = mem.chapters[chapter.dataset.chapter] || {};
    for (const selector of ['[data-publication-search]', '[data-publication-year]', '[data-day]', '[data-reader-note]']) {
      const el = chapter.querySelector(selector); if (el) previous[selector] = el.value;
    }
    mem.chapters[chapter.dataset.chapter] = previous;
  }
  function hydrate(chapter) {
    const values = mem.chapters[chapter.dataset.chapter] || {};
    for (const [selector, value] of Object.entries(values)) { const el = chapter.querySelector(selector); if (el) el.value = value; }
    const search = chapter.querySelector('[data-publication-search]'), year = chapter.querySelector('[data-publication-year]');
    if (search && year) {
      const filter = () => {
        let count = 0;
        chapter.querySelectorAll('[data-publication]').forEach(el => { el.hidden = !el.textContent.toLowerCase().includes(search.value.toLowerCase()) || year.value !== 'all' && el.dataset.year !== year.value; if (!el.hidden) count++; });
        chapter.querySelector('[data-publication-count]').textContent = `${count} publications`;
        chapter.querySelector('[data-publication-empty]').hidden = count > 0; rememberSection(chapter);
      }; search.oninput = filter; year.onchange = filter; filter();
    }
    const day = chapter.querySelector('[data-day]'); if (day) { const change = () => { chapter.querySelectorAll('[data-day-panel]').forEach(el => el.hidden = el.dataset.dayPanel !== day.value); rememberSection(chapter); }; day.onchange = change; change(); }
    bindImages(chapter);
    chapter.querySelectorAll('a').forEach(a => {
      try {
        const u = new URL(a.href), source = new URL(snapshot.provenance.source);
        const match = u.pathname.match(/^\/(centres|projects|people|events|resources)\/([^/]+)$/);
        const course = a.closest('.related-card') && u.pathname.match(/^\/academy\/(?:online|residential)\/([^/]+)$/);
        const family = match?.[1] || (course ? 'academy' : ''), slug = match?.[2] || course?.[1];
        if (u.origin === source.origin && family && recordsFor(family).some(r => r.slug === decodeURIComponent(slug))) a.onclick = e => { e.preventDefault(); route({ family, record: decodeURIComponent(slug), view: 'detail', section: '', track: 'all' }); };
      } catch { /* An absent/invalid URL remains non-navigable. */ }
    });
  }
  function load(id) {
    const index = localSections.findIndex(s => s.id === id), chapter = chapters[index], section = localSections[index];
    if (!chapter || loaded.has(id) || disposed) return;
    chapter.innerHTML = `<p class="kicker">${families[state.family].singular} / ${String(index + 1).padStart(2, '0')}</p><h2>${esc(section.label)}</h2><div class="chapter-body">${sectionHTML(section, localRecord)}</div>`;
    chapter.classList.remove('is-unloaded'); chapter.dataset.loaded = 'true'; loaded.add(id); hydrate(chapter);
  }
  function updateActive(id, changeURL = true) {
    if (disposed || !id) return;
    active = id; mem.active = id;
    root.querySelectorAll('[data-read-section]').forEach(a => { if (a.dataset.readSection === id) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
    root.querySelector('[data-reader-select]').value = id;
    const section = localSections.find(s => s.id === id);
    if (!isWindow && modal) {
      modal.querySelector('[data-current-section]').textContent = section.label;
      modal.querySelector('[data-reader-direct]').href = url({ section: id });
    }
    if (changeURL && renderVersion === version) { state.section = id; history.replaceState({}, '', url({ section: id })); }
  }
  function topFor(chapter) {
    const box = chapter.getBoundingClientRect();
    return isWindow ? scrollY + box.top - offset() : scroller.scrollTop + box.top - scroller.getBoundingClientRect().top - offset();
  }
  function jump(id, { push = true, focus = true } = {}) {
    const chapter = chapters.find(c => c.dataset.chapter === id); if (!chapter) return;
    chapters.forEach(rememberSection); load(id);
    suspended = true;
    if (push) { state.section = id; history.pushState({}, '', url({ section: id })); }
    updateActive(id, !push);
    scroller.scrollTo({ top: Math.max(0, topFor(chapter)), behavior: 'instant' });
    if (focus) chapter.focus({ preventScroll: true });
    requestAnimationFrame(() => { suspended = false; onScroll(); });
  }
  function onScroll() {
    if (frame || suspended || disposed) return;
    frame = requestAnimationFrame(() => {
      frame = 0; if (disposed || suspended) return;
      const rootTop = isWindow ? 0 : scroller.getBoundingClientRect().top;
      const boundary = rootTop + offset() + 12, bottom = (isWindow ? innerHeight : scroller.getBoundingClientRect().bottom) + 80;
      // Mount one approaching section per frame; never replace previously read content.
      const next = chapters.find(c => !loaded.has(c.dataset.chapter) && c.getBoundingClientRect().bottom > boundary && c.getBoundingClientRect().top < bottom);
      if (next) load(next.dataset.chapter);
      const current = chapters.filter(c => loaded.has(c.dataset.chapter) && c.getBoundingClientRect().top <= boundary).at(-1) || chapters.find(c => loaded.has(c.dataset.chapter));
      if (current && current.dataset.chapter !== active) updateActive(current.dataset.chapter);
      if (next) onScroll();
    });
  }
  root.querySelectorAll('[data-read-section]').forEach(a => a.onclick = e => { e.preventDefault(); jump(a.dataset.readSection); });
  root.querySelector('[data-reader-select]').onchange = e => jump(e.target.value);
  root.querySelectorAll('[data-load-section]').forEach(el => el.onclick = () => jump(el.dataset.loadSection));
  scroller.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll);
  const observer = new ResizeObserver(onScroll); observer.observe(root.querySelector('.reader-chapters'));
  const controller = { root, remember() { chapters.forEach(rememberSection); if (!isWindow) mem.readerScroll = scroller.scrollTop; }, dispose() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); scroller.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); }, jump, loadAll() { localSections.forEach(s => load(s.id)); }, load };
  readers.add(controller); load(initial); updateActive(initial, false);
  // Defer until dialog layout and sticky headers have their final dimensions.
  requestAnimationFrame(() => {
    if (disposed) return;
    const chapter = chapters.find(c => c.dataset.chapter === initial);
    if (!isWindow || state.section) scroller.scrollTo({ top: Math.max(0, topFor(chapter)), behavior: 'instant' });
    suspended = false; onScroll();
  });
  return controller;
}
function closeModalNow() {
  if (!modal) return;
  for (const reader of [...readers]) if (modal.contains(reader.root)) { reader.remember(); reader.dispose(); readers.delete(reader); }
  entryAnimations.forEach(a => a.cancel()); entryAnimations = [];
  modal.close(); modal.remove(); modal = null; closing = false; document.body.style.overflow = previousOverflow;
}
function openSection(id, trigger, push) {
  if (!sections.some(s => s.id === id)) return;
  if (modal) { [...readers].find(r => modal.contains(r.root))?.jump(id); return; }
  remember(); if (push) history.pushState({}, '', url({ section: id })); state.section = id;
  returnCard = trigger; previousOverflow = document.body.style.overflow;
  modal = document.createElement('dialog'); modal.className = 'connected-reader-modal'; modal.setAttribute('aria-labelledby', 'reader-title');
  modal.innerHTML = `<div class="reader-surface" aria-hidden="true"></div><div class="reader-modal-content"><header class="reader-toolbar"><div><p class="kicker">${esc(title(record))}</p><h1 id="reader-title" data-current-section>${esc(sections.find(s => s.id === id).label)}</h1></div><div><a data-reader-direct href="${url()}">Section link ↗</a>${['academy', 'events'].includes(state.family) ? link(lmsPath(), 'Open LMS ↗', 'button lms-entry') : ''}<button class="button" data-close-reader>Close to Atlas ×</button></div></header>${readerMarkup(id, true)}</div>`;
  document.body.append(modal); document.body.style.overflow = 'hidden'; modal.showModal();
  modal.addEventListener('cancel', e => { e.preventDefault(); closeReader(); });
  modal.querySelector('[data-close-reader]').onclick = closeReader;
  mountReader(modal.querySelector('[data-reader]'), id, modal);
  modal.querySelector('[data-close-reader]').focus({ preventScroll: true });
  if (trigger && !reduced()) {
    const source = trigger.getBoundingClientRect(), target = modal.getBoundingClientRect();
    entryAnimations = [modal.querySelector('.reader-surface').animate([{ transform: `translate(${source.x - target.x}px,${source.y - target.y}px) scale(${source.width / target.width},${source.height / target.height})` }, { transform: 'none' }], { duration: 350, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }), modal.querySelector('.reader-modal-content').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 230, delay: 120, fill: 'both' })];
  }
}
async function closeReader() {
  if (!modal || closing) return; closing = true; remember();
  const local = modal, source = returnCard || document.querySelector(`[data-open-section="${CSS.escape(state.section)}"]`);
  const surface = modal.querySelector('.reader-surface'), content = modal.querySelector('.reader-modal-content');
  const transform = getComputedStyle(surface).transform, opacity = getComputedStyle(content).opacity;
  entryAnimations.forEach(a => a.cancel()); entryAnimations = [];
  if (!reduced()) {
    const s = source?.getBoundingClientRect(), r = modal.getBoundingClientRect();
    entryAnimations = [surface.animate([{ transform, opacity: 1 }, { transform: s ? `translate(${s.x-r.x}px,${s.y-r.y}px) scale(${s.width/r.width},${s.height/r.height})` : 'translateY(8px)', opacity: 0 }], { duration: 350, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }), content.animate([{ opacity }, { opacity: 0 }], { duration: 140, fill: 'both' })];
    await Promise.all(entryAnimations.map(a => a.finished.catch(() => {})));
  }
  if (modal !== local) return;
  closeModalNow(); history.pushState({}, '', url({ section: '' })); state.section = ''; source?.focus({ preventScroll: true });
}
function showImage(trigger) {
  imageDialog = document.createElement('dialog'); imageDialog.className = 'image-dialog'; imageDialog.setAttribute('aria-label', 'Published image');
  imageDialog.innerHTML = `<button class="button" data-close-image>Close image ×</button>${image(record.image, title(record))}`;
  document.body.append(imageDialog); imageDialog.showModal(); const close = () => { imageDialog.close(); imageDialog.remove(); imageDialog = null; trigger.focus({ preventScroll: true }); };
  imageDialog.querySelector('button').onclick = close; imageDialog.oncancel = e => { e.preventDefault(); close(); }; bindImages(imageDialog);
}
window.addEventListener('popstate', () => {
  remember(); const next = readState();
  if (next.family === state.family && next.record === state.record && next.view === state.view && next.section && readers.size) {
    state = next; [...readers][0].jump(next.section, { push: false, focus: false }); return;
  }
  const focusId = returnCard?.dataset.openSection || state.section, top = record ? memory().pageScroll : 0;
  closeModalNow(); disposeReaders(); state = next; sidebarOpen = state.view === 'index'; render();
  if (!modal) { scrollTo(0, top); document.querySelector(`[data-open-section="${CSS.escape(focusId || '')}"]`)?.focus({ preventScroll: true }); }
});
window.addEventListener('beforeprint', () => { for (const reader of readers) reader.loadAll(); });
try {
  const response = await fetch('comparison-data.json'); if (!response.ok) throw Error(`Snapshot HTTP ${response.status}`);
  snapshot = await response.json(); data = snapshot.data;
  for (const key of ['events', 'projects', 'people', 'centres', 'courses', 'resources']) if (!Array.isArray(data[key])) throw Error(`Missing ${key} records`);
  document.querySelector('#provenance').textContent = `Public records captured ${new Date(snapshot.provenance.capturedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} IST from ${snapshot.provenance.source}. This independent prototype makes no account or payment changes. Open LMS continues through the current app and its existing access checks.`;
  state = readState(); sidebarOpen = state.view === 'index'; render();
} catch (error) { app.innerHTML = `<main class="loading"><h1>The preview could not load.</h1><p>${esc(error.message)}</p><p>Run <code>./start.sh preview</code> and open <code>/designs/connected.html</code>.</p><a href="./">Return to the design gallery</a></main>`; }
