import { esc, list, title, link, date, dates, empty, rich, image, venue, publicPath, partners, sectionsFor, sectionHTML, sectionPreview, socialLinks } from './comparison-content.js';

const directions = {
  vertical: { name: 'Vertical navigation', line: 'Everything has a place.', description: 'A compact record summary and persistent section rail. One selection changes the reading area.', strength: 'Quick, predictable access to detailed information.', tradeoff: 'Visitors must choose a section to read beyond the summary.' },
  cards: { name: 'Expanding cards', line: 'See the whole. Explore a part.', description: 'Preview every section, then expand one into a full-page reading view with its own navigation.', strength: 'Easy discovery, with a clear return to the overview.', tradeoff: 'Opening a section adds an interaction.' },
  desk: { name: 'Programme desk', line: 'The details, within reach.', description: 'A section index, a generous reading area and a context rail that changes with your task.', strength: 'Practical facts and next actions stay close to the content.', tradeoff: 'Three columns need a simpler arrangement on small screens.' },
  notebook: { name: 'Open notebook', line: 'A story you can navigate.', description: 'A continuous sequence of chapters with a sticky contents rail. Read in order or jump directly.', strength: 'Supports both scanning and uninterrupted reading.', tradeoff: 'Substantial records make a longer page.' },
  atlas: { name: 'Section atlas', line: 'A map of what matters.', description: 'An editorial mosaic of section previews. Each opens a reading view with a section map.', strength: 'Shows the breadth and relative emphasis of the page.', tradeoff: 'Card previews must be useful enough to guide the next click.' },
  workspace: { name: 'Connected workspace', line: 'Follow the connections.', description: 'Search a directory beside the selected record. Move between people or research homes without losing context.', strength: 'Efficient exploration of connected records.', tradeoff: 'The preview and full record need distinct links.' },
  ledger: { name: 'Activity ledger', line: 'Follow the work over time.', description: 'Published, dated activity sits beside stable information about the work and its people.', strength: 'Makes recent movement and older work discoverable.', tradeoff: 'Works best when the team maintains dated updates.' },
};
const families = {
  events: { label: 'Events', layouts: ['desk', 'vertical', 'cards', 'notebook', 'atlas'], preferred: 'desk', why: 'Choose the Programme desk when finding dates, venue and participation details is the primary task.' },
  people: { label: 'People', layouts: ['workspace', 'vertical', 'cards'], preferred: 'workspace', why: 'Use the Connected workspace for discovery; keep publication search and profile details easy to reach.' },
  projects: { label: 'Projects', layouts: ['notebook', 'ledger', 'vertical', 'cards'], preferred: 'notebook', why: 'Use the Open notebook to explain purpose, approach and outputs. Choose a ledger when genuine dated updates are maintained.' },
  centres: { label: 'Centres', layouts: ['atlas', 'workspace', 'ledger', 'vertical'], preferred: 'atlas', why: 'Use the Section atlas to expose connected projects, people and learning. A workspace helps compare research homes.' },
  academy: { label: 'Academy & courses', layouts: ['notebook', 'desk', 'cards'], preferred: 'notebook', why: 'Lead with learning outcomes and the outline. Keep fees and course access nearby.' },
  classroom: { label: 'Classroom', layouts: ['vertical'], preferred: 'vertical', why: 'Retain a stable lesson outline and reading area; public mockups do not expose private teaching materials.' },
  resources: { label: 'Resources', layouts: ['workspace'], preferred: 'workspace', why: 'Use searchable records with clear authorship, licence and access links. No resources were returned in this capture.' },
  about: { label: 'About', layouts: ['notebook'], preferred: 'notebook', why: 'Use a readable narrative with clear connections to centres, projects and people.' },
  custom: { label: 'Custom learning', layouts: ['desk'], preferred: 'desk', why: 'Help visitors frame a learning question, then make contact through the existing inquiry route.' },
};
let snapshot, data, state, sections = [], record, dialog = null, motion = [], closing = false, returnTarget = null, savedBodyOverflow = '', lastOpenedId = '';
const memory = new Map();
const directoryMemory = new Map();
const app = document.querySelector('#app');
const toolsToggle = document.querySelector('#review-tools-toggle');
toolsToggle.onclick = () => {
  const hidden = document.body.classList.toggle('review-tools-hidden');
  toolsToggle.textContent = hidden ? 'Show review tools' : 'Hide review tools';
  toolsToggle.setAttribute('aria-expanded', String(!hidden));
};
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const isExpandedLayout = () => ['cards', 'atlas'].includes(state.layout);
const recordsFor = family => data[family === 'academy' || family === 'classroom' ? 'courses' : family] || [];
const recordKey = () => `${state.family}:${state.record}`;
const memoryFor = () => { if (!memory.has(recordKey())) memory.set(recordKey(), { drafts: {}, positions: {}, publicationSearch: '', publicationYear: 'all', days: {}, directorySearch: '', listSearch: '', listStatus: 'all' }); return memory.get(recordKey()); };
const directoryFor = () => { if (!directoryMemory.has(state.family)) directoryMemory.set(state.family, { search: '', scroll: 0 }); return directoryMemory.get(state.family); };
function readState() {
  const p = new URLSearchParams(location.search);
  const family = families[p.get('family')] ? p.get('family') : 'events';
  const layout = families[family].layouts.includes(p.get('layout')) ? p.get('layout') : families[family].preferred;
  const records = recordsFor(family);
  const preferred = family === 'events' ? 'voices-traditions-knowing-andamans-through-language-culture' : family === 'projects' ? 'tholkudi' : family === 'people' ? 'ritesh' : family === 'centres' ? 'digital-preservation' : '';
  return { family, layout, record: records.find(x => x.slug === p.get('record'))?.slug || records.find(x => x.slug === preferred)?.slug || records[0]?.slug || '', section: p.get('section') || '', view: p.get('view') === 'directory' ? 'directory' : 'detail', page: p.get('page') === 'review' ? 'review' : '', role: ['participant', 'organiser'].includes(p.get('role')) ? p.get('role') : 'guest' };
}
function stateURL(changes = {}) {
  const next = { ...state, ...changes };
  const url = new URL(location.href); url.search = '';
  for (const key of ['page', 'family', 'layout', 'record', 'section', 'role', 'view']) if (next[key] && !(key === 'role' && next[key] === 'guest') && !(key === 'view' && next[key] === 'detail')) url.searchParams.set(key, next[key]);
  return url;
}
function saveDOM() {
  if (!state) return;
  const mem = memoryFor();
  (dialog || document).querySelectorAll('[data-draft]').forEach(el => mem.drafts[el.dataset.draft] = el.value);
  const pub = document.querySelector('[data-publication-search]'); if (pub) mem.publicationSearch = pub.value;
  const year = document.querySelector('[data-publication-year]'); if (year) mem.publicationYear = year.value;
  const day = document.querySelector('[data-day]'); if (day) mem.days[state.section || sections[0]?.id] = day.value;
  const browser = document.querySelector('.record-browser'); if (browser) directoryFor().scroll = browser.scrollTop;
  if (dialog) mem.positions[`dialog:${state.section}`] = dialog.scrollTop;
  else mem.positions[`page:${state.layout}:${state.section}`] = scrollY;
}
function navigate(changes, { replace = false, reset = true } = {}) {
  saveDOM();
  history[replace ? 'replaceState' : 'pushState']({}, '', stateURL(changes));
  destroyDialog(); state = readState(); render();
  if (reset) scrollTo(0, 0);
}
function controls() {
  return `<section class="laboratory" aria-label="Design comparison controls"><div class="lab-intro"><p class="kicker">Structure before decoration</p><h2 class="lab-title">One CoDIN. Different ways in.</h2><p>Compare layouts using the same public records.</p><a href="?page=review">All directions & review pack ↗</a></div><div class="lab-controls"><label>Page family<select id="family">${Object.entries(families).map(([id, f]) => `<option value="${id}" ${state.family === id ? 'selected' : ''}>${f.label}</option>`).join('')}</select></label><label>Design direction<select id="layout">${families[state.family].layouts.map(id => `<option value="${id}" ${state.layout === id ? 'selected' : ''}>${directions[id].name}</option>`).join('')}</select></label><label class="record-control">Record<select id="record" ${!recordsFor(state.family).length ? 'disabled' : ''}>${recordsFor(state.family).length ? recordsFor(state.family).map(r => `<option value="${esc(r.slug)}" ${r.slug === state.record ? 'selected' : ''}>${esc(title(r))}</option>`).join('') : '<option>No public records available</option>'}</select></label><label>Access preview<select id="role"><option value="guest" ${state.role === 'guest' ? 'selected' : ''}>Public visitor</option><option value="participant" ${state.role === 'participant' ? 'selected' : ''}>Participant · simulated</option><option value="organiser" ${state.role === 'organiser' ? 'selected' : ''}>Organiser · simulated</option></select></label></div></section>`;
}
function provenance() {
  const captured = new Date(snapshot.provenance.capturedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  const endpoint = snapshot.provenance.endpoints[state.family === 'academy' || state.family === 'classroom' ? 'courses' : state.family];
  return `<details class="provenance"><summary>Public API snapshot · ${esc(captured)} IST · independent preview</summary><p>Source: ${link(snapshot.provenance.source, snapshot.provenance.source)}. Captured without sign-in. These are records returned by your app; their content has not been independently verified. No live API connection is needed to browse this gallery.</p>${endpoint?.state === 'unavailable' ? `<p>Unavailable source: ${esc(endpoint.path)}. ${esc(endpoint.reason)}</p>` : ''}<p>Registration, payment, management and learner states are demonstrations. Public links open their actual destinations. Changes here stay in memory until this page is reloaded.</p><a href="comparison-data.json">Inspect the presentation snapshot</a></details>`;
}
function designNote() {
  const d = directions[state.layout];
  return `<aside class="design-note"><div><span class="direction-number">${String(Object.keys(directions).indexOf(state.layout) + 1).padStart(2, '0')}</span><div><p class="kicker">${d.name}</p><p>${d.description}</p></div></div><details><summary>Why this arrangement?</summary><p><strong>Strength:</strong> ${d.strength}</p><p><strong>Tradeoff:</strong> ${d.tradeoff}</p><p>${families[state.family].why}</p></details></aside>`;
}
function header() {
  return `<div class="site-masthead"><a class="wordmark" href="combined.html"><img src="assets/logo.png" width="42" height="42" alt=""><span>CoDIN<small>Council for Diversity and Innovation</small></span></a><nav aria-label="Mockup page families">${['events', 'people', 'projects', 'centres'].map(f => `<a href="${stateURL({ family: f, layout: families[f].preferred, record: '', section: '', view: 'detail' })}" data-family="${f}" ${f === state.family ? 'aria-current="page"' : ''}>${families[f].label}</a>`).join('')}</nav></div>`;
}
function action() {
  if (state.family === 'events') return `<a class="button primary" href="${esc(publicPath('events', record) + '?participate=1')}">${['Completed', 'Archived'].includes(record.status) ? 'Resources & access ↗' : state.role === 'participant' ? 'View my access ↗' : 'Participation details ↗'}</a>`;
  if (state.family === 'people' && record.email) return link(`mailto:${record.email}`, 'Contact ↗', 'button primary');
  if (state.family === 'projects' && record.outputUrl) return link(record.outputUrl, record.outputLabel || 'Explore the output ↗', 'button primary');
  return link(publicPath(state.family === 'classroom' ? 'academy' : state.family, record), 'Open current page ↗', 'button primary');
}
function summary() {
  const short = state.family === 'people' ? record.bio : record.description || record.tagline;
  const affiliations = data.centres.filter(c => [...list(record.associatedCentres), ...list(record.centres)].includes(c.slug));
  return `<section class="record-summary" aria-labelledby="record-title"><div class="summary-copy"><p class="breadcrumb">CoDIN / ${families[state.family].label}${record.shortName ? ` / ${esc(record.shortName)}` : ''}</p><p class="kicker">${esc(record.type || record.tag || record.role || families[state.family].label)}</p><h1 id="record-title">${esc(title(record))}</h1>${short ? `<p class="record-intro">${esc(short.length > 340 ? short.slice(0, 337) + '…' : short)}</p>` : ''}<div class="facts">${record.status ? `<span class="badge">${esc(record.status)}</span>` : ''}${dates(record) ? `<span>${esc(dates(record))}</span>` : ''}${record.location ? `<span>${venue(record)}</span>` : ''}${record.fundingAgency ? `<span><strong>Funder:</strong> ${esc(record.fundingAgency)}</span>` : ''}</div>${affiliations.length ? `<div class="affiliations">${affiliations.map(c => link(publicPath('centres', c), c.shortName || c.name)).join(' · ')}</div>` : ''}${state.family === 'people' && list(record.researchInterests).length ? `<div class="interest-list">${record.researchInterests.map(i => `<span>${esc(i)}</span>`).join('')}</div>` : ''}<div class="summary-actions">${action()}${record.image ? `<button class="mobile-poster-link" data-image>View ${state.family === 'people' ? 'portrait' : 'image / poster'} ↗</button>` : ''}${state.family === 'events' || state.family === 'people' && record.email || state.family === 'projects' && record.outputUrl ? link(publicPath(state.family, record), 'Current full record ↗', 'quiet-link') : ''}${socialLinks(record)}</div></div>${record.image ? `<button class="record-art ${state.family === 'people' ? 'portrait' : ''}" data-image aria-label="Open published image for ${esc(title(record))}">${image(record.image, title(record))}<span>View ${state.family === 'people' ? 'portrait' : 'image / poster'} ↗</span></button>` : ''}</section>${partners(record)}`;
}
function navHTML(active, modal = false) {
  return `<nav class="section-nav" aria-label="${modal ? 'Expanded section' : 'Record section'} navigation"><p class="kicker">${modal ? 'Section map' : 'On this page'}</p>${sections.map((s, i) => `<a href="${stateURL({ section: s.id })}" data-section="${esc(s.id)}" ${s.id === active ? 'aria-current="true"' : ''}><span>${String(i + 1).padStart(2, '0')}</span>${esc(s.label)}</a>`).join('')}</nav><label class="mobile-section">Go to section<select data-section-select>${sections.map(s => `<option value="${esc(s.id)}" ${s.id === active ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>`;
}
function accessHTML() {
  if (state.role === 'guest') return '';
  return `<aside class="access-preview"><p class="kicker">${state.role === 'organiser' ? 'Organiser desk' : 'Participant access'} · simulated</p><p>${state.role === 'organiser' ? 'Editing, participant management, publishing and material controls remain in the current app. This preview does not grant permissions.' : 'Confirmation, payment and material access are checked by the current app. This preview does not represent your account status.'}</p>${state.role === 'organiser' ? `<label>Practice announcement draft<textarea data-draft="announcement" rows="3" placeholder="Try switching sections; this draft stays until reload."></textarea></label><p class="small">Memory only · no save or publish request</p>` : ''}${link(publicPath(state.family === 'classroom' ? 'academy' : state.family, record), 'Open current app ↗')}</aside>`;
}
function contextRail(section) {
  const target = section?.type;
  return `<aside class="context-rail"><p class="kicker">${target === 'logistics' ? 'Plan your visit' : target === 'schedule' ? 'Your programme' : target === 'registration' ? 'Participation' : state.family === 'events' ? 'At a glance' : 'Keep in view'}</p>${record.location ? `<div><span class="small">Where</span><p>${venue(record)}</p></div>` : ''}${dates(record) ? `<div><span class="small">When</span><p>${esc(dates(record))}</p></div>` : ''}${record.fundingAgency ? `<div><span class="small">Funding</span><p>${esc(record.fundingAgency)}</p></div>` : ''}${target === 'registration' && record.registrationCard?.description ? rich(record.registrationCard.description) : ''}${action()}${record.supportOfficeEmail ? `<p>${link(`mailto:${record.supportOfficeEmail}`, 'Ask the event team ↗')}</p>` : ''}<p class="small">Published details from the captured record. Follow the current page for availability.</p></aside>`;
}
function reading(section, { chapter = false } = {}) {
  return `<article class="reading ${chapter ? 'chapter' : ''}" id="chapter-${esc(section.id)}" tabindex="-1" data-reading="${esc(section.id)}"><p class="kicker">${esc(section.note || families[state.family].label)} / ${String(sections.indexOf(section) + 1).padStart(2, '0')}</p><h2>${esc(section.label)}</h2>${sectionHTML(section, record)}</article>`;
}
function cards() {
  return `<div class="overview-heading"><div><p class="kicker">${state.layout === 'atlas' ? 'Your section map' : 'Explore this page'}</p><h2>${directions[state.layout].line}</h2></div><p>Choose a section to expand it. Essential facts and public actions stay above.</p></div><div class="section-cards ${state.layout === 'atlas' ? 'atlas-grid' : ''}">${sections.map((s, i) => `<button class="section-card tone-${i % 4}" data-expand="${esc(s.id)}" aria-haspopup="dialog"><span class="card-number">${String(i + 1).padStart(2, '0')} / ${esc(s.note || 'Explore')}</span><h3>${esc(s.label)}</h3><p>${esc(sectionPreview(s))}</p><span class="card-open">Open section <span aria-hidden="true">↗</span></span></button>`).join('')}</div>${accessHTML()}`;
}
function activityHTML() {
  const items = data.activity.filter(x => list(x[state.family === 'projects' ? 'associatedProjects' : 'associatedCentres']).includes(record.slug) && x.date && Number.isFinite(Date.parse(x.date))).sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  return `<div class="ledger-heading"><p class="kicker">Dated work</p><h2>Follow the work.</h2><p>Dates below are those supplied by the activity feed. Record updates are not presented as research milestones.</p></div><label class="ledger-filter">Activity type<select data-activity-filter><option value="all">All activity</option>${[...new Set(items.map(x => x.category || 'Update'))].map(c => `<option>${esc(c)}</option>`).join('')}</select></label><div class="activity-stream">${items.length ? items.map(x => `<article class="activity-entry" data-category="${esc(x.category || 'Update')}"><time>${esc(date(x.date))}</time><div><p class="kicker">${esc(x.category || 'Update')} · ${x.isDynamic ? 'Record update' : 'Published activity'}</p><h3>${link(x.link, x.title)}</h3>${rich(x.description)}</div></article>`).join('') : empty('No dated activity is linked to this record in the public feed. Its purpose, team and outputs remain available alongside.')}</div>`;
}
function workspace() {
  return `<div class="workspace-layout"><aside class="record-browser"><p class="kicker">${families[state.family].label} directory</p><label>Find ${state.family === 'people' ? 'a person' : 'a research home'}<input type="search" data-directory-search placeholder="Name, focus or affiliation"></label><p class="small" data-directory-count>${recordsFor(state.family).length} records</p><div class="record-browser-list">${recordsFor(state.family).map(r => `<a href="${stateURL({ record: r.slug, section: '' })}" data-record="${esc(r.slug)}" data-search="${esc([title(r), r.role, r.description, ...list(r.researchInterests)].join(' ').toLowerCase())}" ${r.slug === record.slug ? 'aria-current="true"' : ''}>${image(r.image, title(r), 'directory-portrait')}<span><strong>${esc(title(r))}</strong><small>${esc(r.role || r.shortName || '')}</small></span></a>`).join('')}</div><p data-directory-empty class="empty-state" hidden>No matching records.</p></aside><div class="workspace-content"><div class="workspace-caption"><p>Selected record</p>${link(publicPath(state.family, record), 'Open full page ↗')}</div>${navHTML(activeSection().id)}${reading(activeSection())}${accessHTML()}</div></div>`;
}
function activeSection() { return sections.find(s => s.id === state.section) || sections[0]; }
function directory() {
  return `<section class="directory-page"><p class="kicker">${families[state.family].label} / Browse</p><h1>Find your way into the work.</h1><div class="directory-tools"><label>Search ${families[state.family].label.toLowerCase()}<input data-list-search type="search" placeholder="Title, name or topic"></label><label>Status<select data-list-status><option value="all">All records</option>${[...new Set(recordsFor(state.family).map(r => r.status).filter(Boolean))].map(s => `<option>${esc(s)}</option>`).join('')}</select></label></div><p class="small" data-list-count></p><div class="listing-grid">${recordsFor(state.family).map(r => `<article class="listing-card" data-list-record data-search="${esc([title(r), r.description, r.role, ...list(r.keywords), ...list(r.researchInterests)].join(' ').toLowerCase())}" data-status="${esc(r.status || '')}">${image(r.image, title(r), 'listing-image')}<div><p class="kicker">${esc(r.status || r.shortName || r.role || r.type || '')}</p><h2><a data-record="${esc(r.slug)}" href="${stateURL({ record: r.slug, view: 'detail', section: '' })}">${esc(title(r))}</a></h2><p>${esc((r.description || r.bio || '').slice(0, 160))}</p>${dates(r) ? `<p class="small">${esc(dates(r))}</p>` : ''}<a class="quiet-link" data-record="${esc(r.slug)}" href="${stateURL({ record: r.slug, view: 'detail', section: '' })}">Explore record ↗</a></div></article>`).join('')}</div><p class="empty-state" data-list-empty hidden>No matching records. Change the search or status filter.</p></section>`;
}
function ancillary() {
  if (state.family === 'resources') return `<section class="supplementary"><p class="kicker">Resource library / Connected workspace</p><h1>A clear path to reusable knowledge.</h1>${empty('The current public resource API returned zero records. No sample publications or downloads have been invented.')}<div class="resource-wireframe"><aside><h2>Find a resource</h2><label>Search<input disabled placeholder="Available when records are published"></label><label>Format<select disabled><option>All formats</option></select></label></aside><article><h2>Resource reading area</h2><p>Published records will show title, author, format, version, licence, citation and an access link here when supplied.</p>${link('http://localhost:3000/resources', 'Open current resource library ↗', 'button')}</article></div></section>`;
  if (state.family === 'custom') return `<section class="supplementary"><p class="kicker">Custom learning / Programme desk</p><h1>Start with a learning question.</h1><p>Interaction prototype. These notes stay in this page’s memory; nothing is submitted.</p><div class="custom-grid"><div><label>Your context<textarea data-draft="context" rows="3" placeholder="Who is this learning experience for?"></textarea></label><label>Your learning question<textarea data-draft="question" rows="4" placeholder="What would you like to understand or be able to do?"></textarea></label><label>Preferred format<select data-draft="format"><option>Explore together</option><option>Online</option><option>Residential</option><option>Blended</option></select></label></div><aside class="context-rail"><h2>Make a connection.</h2><p>Keep audience, goals and practical constraints together. Continue through the existing custom-learning page for an actual inquiry.</p>${link('http://localhost:3000/academy/custom', 'Open current inquiry page ↗', 'button')}</aside></div></section>`;
  if (state.family === 'about') return `<section class="supplementary"><p class="kicker">About / Open notebook</p><h1>Language, knowledge and shared possibilities.</h1><p class="preview-note">The statements below are drawn from the repository’s Vision & Mission content; the public API does not supply an About record.</p><div class="notebook-layout"><nav class="section-nav" aria-label="About chapters"><a href="#vision">Vision</a><a href="#mission">Mission</a><a href="#research-homes">Research homes</a></nav><div><article class="reading chapter" id="vision"><h2>A World Where No Language Is Too Small for AI or Too Forgotten for Digital Life.</h2><p>Our vision is to build an inclusive community-led commons where all varieties and languages are granted first-class citizenship in the AI world.</p></article><article class="reading chapter" id="mission"><h2>Cataloging the Gaps, Empowering the Voices, Building the Pipelines.</h2><p>CoDIN's mission is to proactively correct demographic skew in major technology platforms. We work with indigenous communities to conduct training programs, curate datasets and archives and build self-owned, decentralised AI models for all languages and varieties.</p></article><article class="reading chapter" id="research-homes"><h2>Our research homes</h2>${relatedCentres()}</article></div></div></section>`;
  return '';
}
function relatedCentres() { return `<div class="related-grid">${data.centres.map(c => `<article class="related-card"><h3>${link(publicPath('centres', c), c.name)}</h3><p>${esc(c.description)}</p></article>`).join('')}</div>`; }
function reviewIndex() {
  return `<main class="review-index" id="record-content"><p class="kicker">Expanded design review</p><h1>Make ease of use the impressive part.</h1><p class="index-intro">Seven structures. The current CoDIN theme. Actual public records from your local app, captured for an independent review.</p><div class="review-actions"><a class="button primary" href="?family=events&layout=desk">Start with the event ↗</a><button class="button" data-print>Print comparison</button><a href="review/layout-laboratory.pdf" download>Download comparison PDF ↓</a><a href="review/laboratory/">All screenshots →</a></div>${provenance()}<div class="direction-gallery">${Object.entries(directions).map(([id, d], i) => {
    const family = id === 'workspace' ? 'people' : id === 'ledger' ? 'projects' : 'events';
    return `<article><p class="kicker">${String(i + 1).padStart(2, '0')} / ${d.name}</p><h2>${d.line}</h2><p>${d.description}</p><p><strong>Best at:</strong> ${d.strength}</p><p class="small"><strong>Consider:</strong> ${d.tradeoff}</p><a class="button" href="?family=${family}&layout=${id}">Try this structure ↗</a><div class="artifact-links"><a href="review/laboratory/${family}-${id}-1440.png">Desktop</a><a href="review/laboratory/${family}-${id}-390.png">Mobile</a></div></article>`;
  }).join('')}</div><section class="recommendations"><h2>A shared language. A structure for each job.</h2>${['events', 'people', 'projects', 'centres', 'academy', 'classroom', 'resources', 'about', 'custom'].map(f => `<article><h3><a href="?family=${f}&layout=${families[f].preferred}">${families[f].label} ↗</a></h3><p>${families[f].why}</p></article>`).join('')}</section><section class="review-tasks"><h2>Try it with a purpose.</h2><ol><li>Find the Andamans event venue and open its map.</li><li>Find registration fees and the event’s funders.</li><li>Open a section, move to another and return to the overview.</li><li>Find a person’s publication by title and year.</li><li>Follow a centre to a project and an available output.</li><li>Repeat on a phone, using the keyboard and reduced motion.</li></ol><p>Programme desk is the recommended event baseline. Notebook suits project explanations; a ledger is an alternative when dated work is maintained. Atlas suits research homes; workspace suits browsing people.</p></section><section class="print-screens"><h2>Representative desktop compositions</h2>${[['events', 'desk'], ['events', 'atlas'], ['people', 'workspace'], ['projects', 'notebook'], ['centres', 'atlas']].map(([f, d]) => `<figure><img src="review/laboratory/${f}-${d}-1440.png" alt="${families[f].label}: ${directions[d].name}"><figcaption>${families[f].label} / ${directions[d].name}</figcaption></figure>`).join('')}</section></main>`;
}
function render() {
  toolsToggle.hidden = state.page === 'review';
  record = recordsFor(state.family).find(r => r.slug === state.record);
  sections = record ? sectionsFor(state.family === 'classroom' ? 'academy' : state.family, record, data) : [];
  if (state.role !== 'guest' && record) sections.push({ id: 'access-preview', label: state.role === 'organiser' ? 'Organiser controls · preview' : 'My access · preview', type: 'notice', content: 'Simulated role preview only. Sign in to the current app for actual permissions, participant management, materials and publishing.' });
  if (state.family === 'classroom' && record) {
    sections = list(record.outline).map((item, i) => ({ id: `lesson-${i}`, label: typeof item === 'string' ? item : item.title || `Lesson ${i + 1}`, type: 'notice', content: 'Public lesson-outline preview. Private reading, recordings and learner progress are not fetched or reproduced here.' }));
    if (!sections.length) sections.push({ id: 'access', label: 'Course access', type: 'notice', content: 'No public lesson outline is available. Open the course to sign in.' });
  }
  document.title = `${state.page ? 'All directions' : directions[state.layout].name + ' / ' + families[state.family].label} — CoDIN design review`;
  if (state.page === 'review') app.innerHTML = reviewIndex();
  else {
    const selected = activeSection();
    let body;
    if (['resources', 'about', 'custom'].includes(state.family)) body = ancillary();
    else if (!record) body = empty('No public records are available for this page family.');
    else if (state.view === 'directory') body = directory();
    else {
      let layout;
      if (isExpandedLayout()) layout = cards();
      else if (state.layout === 'workspace') layout = workspace();
      else if (state.layout === 'notebook') layout = `<div class="notebook-layout">${navHTML(selected.id)}<div class="chapters">${sections.map(s => reading(s, { chapter: true })).join('')}${accessHTML()}</div></div>`;
      else if (state.layout === 'ledger') layout = `<div class="ledger-layout"><div>${activityHTML()}</div><aside class="ledger-reference"><h2>About the work</h2>${navHTML(selected.id)}${reading(selected)}${accessHTML()}</aside></div>`;
      else layout = `<div class="detail-layout ${state.layout === 'desk' ? 'desk-layout' : ''}">${navHTML(selected.id)}<div>${reading(selected)}${accessHTML()}</div>${state.layout === 'desk' ? contextRail(selected) : ''}</div>`;
      body = `${summary()}${state.family === 'classroom' ? '<p class="preview-note">Classroom composition only · the public outline is real; private lessons and learner state are unavailable.</p>' : ''}${layout}`;
    }
    app.innerHTML = `${controls()}${provenance()}${designNote()}<main class="site-preview layout-${state.layout}" id="record-content">${header()}<div class="page-utilities">${recordsFor(state.family).length ? `<button data-toggle-view>${state.view === 'directory' ? '← Selected record' : 'Browse all ' + families[state.family].label.toLowerCase()}</button>` : ''}<a href="${stateURL()}">Link to this comparison ↗</a><button data-print>Print this view</button></div>${body}<footer class="page-footer"><p>CoDIN · ${directions[state.layout].name}</p><a href="?page=review">Compare every direction →</a><a href="./">Design gallery →</a></footer></main>`;
  }
  bind(); restoreDOM();
  if (!state.page && isExpandedLayout() && state.section && sections.some(s => s.id === state.section)) openExpanded(state.section, null, false);
  else if (!state.page && state.layout === 'notebook' && state.section) requestAnimationFrame(() => document.getElementById(`chapter-${state.section}`)?.scrollIntoView({ behavior: 'instant', block: 'start' }));
}
function restoreDOM(root = document) {
  const mem = memoryFor();
  root.querySelectorAll('[data-draft]').forEach(el => { if (mem.drafts[el.dataset.draft] !== undefined) el.value = mem.drafts[el.dataset.draft]; });
  const pub = root.querySelector('[data-publication-search]'); if (pub) pub.value = mem.publicationSearch;
  const year = root.querySelector('[data-publication-year]'); if (year) year.value = mem.publicationYear;
  const day = root.querySelector('[data-day]'); if (day) { day.value = mem.days[state.section || sections[0]?.id] || '0'; day.dispatchEvent(new Event('change')); }
  if (pub) pub.dispatchEvent(new Event('input'));
  const directorySearch = root.querySelector('[data-directory-search]'); if (directorySearch) { directorySearch.value = directoryFor().search; directorySearch.dispatchEvent(new Event('input')); root.querySelector('.record-browser').scrollTop = directoryFor().scroll; }
  const listSearch = root.querySelector('[data-list-search]'); if (listSearch) { listSearch.value = mem.listSearch; root.querySelector('[data-list-status]').value = mem.listStatus; listSearch.dispatchEvent(new Event('input')); }
}
function selectSection(id) {
  if (!sections.some(s => s.id === id)) return;
  saveDOM();
  if (isExpandedLayout()) { openExpanded(id, dialog ? returnTarget : document.querySelector(`[data-expand="${CSS.escape(id)}"]`), true); return; }
  if (state.layout === 'notebook') {
    history.pushState({}, '', stateURL({ section: id })); state.section = id;
    document.querySelectorAll('[data-section]').forEach(a => a.toggleAttribute('aria-current', a.dataset.section === id));
    document.querySelectorAll('[data-section-select]').forEach(el => el.value = id);
    document.getElementById(`chapter-${id}`)?.scrollIntoView({ behavior: reduced() ? 'instant' : 'smooth', block: 'start' }); return;
  }
  const oldScroll = scrollY;
  navigate({ section: id }, { reset: false });
  scrollTo(0, memoryFor().positions[`page:${state.layout}:${id}`] ?? oldScroll);
  document.querySelector('.reading')?.focus({ preventScroll: true });
}
function bind(root = document) {
  root.querySelectorAll('[data-section]').forEach(el => el.onclick = event => { event.preventDefault(); selectSection(el.dataset.section); });
  root.querySelectorAll('[data-section-select]').forEach(el => el.onchange = () => selectSection(el.value));
  root.querySelectorAll('[data-expand]').forEach(el => el.onclick = () => { saveDOM(); openExpanded(el.dataset.expand, el, true); });
  root.querySelectorAll('[data-record]').forEach(el => el.onclick = event => { event.preventDefault(); const top = scrollY; navigate({ record: el.dataset.record, section: '', view: 'detail' }, { reset: state.layout !== 'workspace' }); if (state.layout === 'workspace') scrollTo(0, top); });
  root.querySelectorAll('[data-family]').forEach(el => el.onclick = event => { event.preventDefault(); navigate({ family: el.dataset.family, layout: families[el.dataset.family].preferred, record: '', section: '', view: 'detail' }); });
  root.querySelectorAll('[data-fallback]').forEach(img => { img.onerror = () => img.remove(); });
  root.querySelectorAll('[data-print]').forEach(el => el.onclick = () => window.print());
  root.querySelectorAll('[data-draft]').forEach(el => el.oninput = () => memoryFor().drafts[el.dataset.draft] = el.value);
  const pub = root.querySelector('[data-publication-search]'), year = root.querySelector('[data-publication-year]');
  if (pub && year) {
    const filter = () => { const query = pub.value.toLowerCase(); let count = 0; root.querySelectorAll('[data-publication]').forEach(el => { el.hidden = !el.textContent.toLowerCase().includes(query) || year.value !== 'all' && el.dataset.year !== year.value; if (!el.hidden) count++; }); root.querySelector('[data-publication-count]').textContent = `${count} publications`; root.querySelector('[data-publication-empty]').hidden = count !== 0; memoryFor().publicationSearch = pub.value; memoryFor().publicationYear = year.value; };
    pub.oninput = filter; year.onchange = filter;
  }
  const day = root.querySelector('[data-day]'); if (day) day.onchange = () => { root.querySelectorAll('[data-day-panel]').forEach(el => el.hidden = el.dataset.dayPanel !== day.value); memoryFor().days[state.section || sections[0]?.id] = day.value; };
  const directorySearch = root.querySelector('[data-directory-search]'); if (directorySearch) directorySearch.oninput = () => { let count = 0; root.querySelectorAll('[data-record][data-search]').forEach(el => { el.hidden = !el.dataset.search.includes(directorySearch.value.toLowerCase()); if (!el.hidden) count++; }); root.querySelector('[data-directory-count]').textContent = `${count} records`; root.querySelector('[data-directory-empty]').hidden = count !== 0; directoryFor().search = directorySearch.value; };
  const listSearch = root.querySelector('[data-list-search]'), status = root.querySelector('[data-list-status]');
  if (listSearch && status) { const filter = () => { let count = 0; root.querySelectorAll('[data-list-record]').forEach(el => { el.hidden = !el.dataset.search.includes(listSearch.value.toLowerCase()) || status.value !== 'all' && el.dataset.status !== status.value; if (!el.hidden) count++; }); root.querySelector('[data-list-count]').textContent = `${count} records`; root.querySelector('[data-list-empty]').hidden = count !== 0; memoryFor().listSearch = listSearch.value; memoryFor().listStatus = status.value; }; listSearch.oninput = filter; status.onchange = filter; filter(); }
  const activity = root.querySelector('[data-activity-filter]'); if (activity) activity.onchange = () => root.querySelectorAll('[data-category]').forEach(el => el.hidden = activity.value !== 'all' && el.dataset.category !== activity.value);
  const family = root.querySelector('#family'); if (family) family.onchange = () => navigate({ family: family.value, layout: families[family.value].preferred, record: '', section: '', view: 'detail' });
  const layout = root.querySelector('#layout'); if (layout) layout.onchange = () => navigate({ layout: layout.value, section: '' });
  const recordSelect = root.querySelector('#record'); if (recordSelect) recordSelect.onchange = () => navigate({ record: recordSelect.value, section: '' });
  const role = root.querySelector('#role'); if (role) role.onchange = () => navigate({ role: role.value }, { reset: false });
  const toggle = root.querySelector('[data-toggle-view]'); if (toggle) toggle.onclick = () => navigate({ view: state.view === 'directory' ? 'detail' : 'directory', section: '' });
  root.querySelectorAll('[data-image]').forEach(photo => photo.onclick = () => openImage(photo));
}
function destroyDialog() {
  if (!dialog) return;
  motion.forEach(a => a.cancel()); motion = [];
  dialog.close(); dialog.remove(); dialog = null; closing = false;
  document.body.style.overflow = savedBodyOverflow;
}
function openExpanded(id, source, push) {
  const section = sections.find(s => s.id === id); if (!section) return;
  const wasOpen = Boolean(dialog);
  if (wasOpen) saveDOM();
  if (push) history.pushState({}, '', stateURL({ section: id }));
  state.section = id; lastOpenedId = id;
  if (!wasOpen) {
    returnTarget = source;
    savedBodyOverflow = document.body.style.overflow;
    dialog = document.createElement('dialog'); dialog.className = 'expanded-view';
    dialog.setAttribute('aria-labelledby', 'expanded-title'); document.body.append(dialog); document.body.style.overflow = 'hidden';
    dialog.addEventListener('cancel', e => { e.preventDefault(); closeExpanded(); });
  }
  motion.forEach(a => a.cancel()); motion = [];
  dialog.innerHTML = `<div class="expansion-surface" aria-hidden="true"></div><div class="expanded-content"><header class="expanded-header"><div><p class="kicker">${esc(title(record))}</p><h1 id="expanded-title">${esc(section.label)}</h1></div><div><a href="${stateURL()}">Direct section link ↗</a>${link(publicPath(state.family === 'classroom' ? 'academy' : state.family, record), 'Current full record ↗', 'expanded-record-link')}<button class="button" data-close>Close <span aria-hidden="true">×</span></button></div></header><div class="expanded-layout">${navHTML(id, true)}<div>${reading(section)}${accessHTML()}</div></div></div>`;
  if (!wasOpen) dialog.showModal();
  closing = false;
  bind(dialog); restoreDOM(dialog);
  dialog.querySelector('[data-close]').onclick = closeExpanded;
  dialog.scrollTop = memoryFor().positions[`dialog:${id}`] || 0;
  dialog.querySelector('[data-close]').focus({ preventScroll: true });
  const surface = dialog.querySelector('.expansion-surface'), content = dialog.querySelector('.expanded-content');
  if (!wasOpen && source && !reduced()) {
    const s = source.getBoundingClientRect(), r = dialog.getBoundingClientRect();
    motion = [surface.animate([{ transform: `translate(${s.x-r.x}px,${s.y-r.y}px) scale(${s.width/r.width},${s.height/r.height})` }, { transform: 'none' }], { duration: 350, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }), content.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 230, delay: 120, fill: 'both' })];
  } else if (wasOpen && !reduced()) motion = [content.animate([{ opacity: .2 }, { opacity: 1 }], { duration: 180 })];
}
async function closeExpanded() {
  if (!dialog || closing) return;
  closing = true; saveDOM();
  const closingDialog = dialog, target = returnTarget || document.querySelector(`[data-expand="${CSS.escape(lastOpenedId)}"]`);
  const content = dialog.querySelector('.expanded-content'), surface = dialog.querySelector('.expansion-surface');
  const transform = surface ? getComputedStyle(surface).transform : 'none';
  const opacity = content ? getComputedStyle(content).opacity : '1';
  motion.forEach(a => a.cancel()); motion = [];
  if (!reduced() && surface && content) {
    const r = dialog.getBoundingClientRect(), s = target?.getBoundingClientRect();
    const end = s ? `translate(${s.x-r.x}px,${s.y-r.y}px) scale(${s.width/r.width},${s.height/r.height})` : 'translateY(10px)';
    motion = [surface.animate([{ transform, opacity: 1 }, { transform: end, opacity: 0 }], { duration: 350, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }), content.animate([{ opacity }, { opacity: 0 }], { duration: 140, fill: 'both' })];
    await Promise.all(motion.map(a => a.finished.catch(() => {})));
  }
  if (dialog !== closingDialog) return;
  destroyDialog(); history.pushState({}, '', stateURL({ section: '' })); state.section = ''; restoreDOM();
  target?.focus({ preventScroll: true });
}
function openImage(source) {
  savedBodyOverflow = document.body.style.overflow; returnTarget = source;
  dialog = document.createElement('dialog'); dialog.className = 'image-dialog'; dialog.setAttribute('aria-label', 'Published record image');
  dialog.innerHTML = `<button class="button" data-close>Close image ×</button>${image(record.image, title(record))}<p>Published record image · displayed without cropping</p>`;
  document.body.append(dialog); dialog.showModal(); document.body.style.overflow = 'hidden';
  const close = () => { destroyDialog(); source.focus({ preventScroll: true }); };
  dialog.querySelector('[data-close]').onclick = close; dialog.oncancel = e => { e.preventDefault(); close(); }; bind(dialog);
}
window.addEventListener('popstate', () => { saveDOM(); const target = returnTarget; destroyDialog(); state = readState(); render(); if (!dialog && isExpandedLayout()) (target?.isConnected ? target : document.querySelector(`[data-expand="${CSS.escape(lastOpenedId)}"]`))?.focus({ preventScroll: true }); });
try {
  const response = await fetch('comparison-data.json'); if (!response.ok) throw Error(`Snapshot HTTP ${response.status}`);
  snapshot = await response.json(); data = snapshot.data;
  for (const key of ['events', 'projects', 'people', 'centres', 'courses', 'resources', 'activity']) if (!Array.isArray(data[key])) throw Error(`Missing ${key} records`);
  state = readState(); render();
} catch (error) {
  app.innerHTML = `<main class="loading"><h1>The review data could not be loaded.</h1><p>${esc(error.message)}</p><p>Serve this folder using <code>./start.sh preview</code>, then open <code>/designs/compare.html</code>.</p><a href="./">Return to the existing design gallery</a></main>`;
}
