// Presentation-only adapters. All record text is escaped or sanitised before insertion.
export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const list = value => Array.isArray(value) ? value : [];
export const title = record => record?.title || record?.fullName || record?.name || 'Untitled record';
export function safeUrl(value, source = 'http://localhost:3000') {
  if (typeof value !== 'string') return '';
  const raw = value.trim().replace(/^mailto:\s*/i, 'mailto:');
  if (!/^(https?:\/\/|mailto:|tel:|\/(?!\/))/i.test(raw)) return '';
  try { const url = new URL(raw, source); return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
export const link = (url, label, className = '') => safeUrl(url) ? `<a class="${esc(className)}" href="${esc(safeUrl(url))}">${esc(label)}</a>` : `<span>${esc(label)}</span>`;
export const date = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' }) : value || '';
export const dates = record => record.startDate ? [date(record.startDate), date(record.endDate)].filter(Boolean).join(' – ') : record.dates || '';
export const empty = message => `<p class="empty-state">${esc(message)}</p>`;

function sanitise(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const allowed = new Set('P BR DIV SPAN H2 H3 H4 H5 STRONG B EM I U A UL OL LI BLOCKQUOTE CODE PRE IMG HR TABLE THEAD TBODY TR TH TD'.split(' '));
  for (const node of Array.from(doc.body.querySelectorAll('*'))) {
    if (!allowed.has(node.tagName)) { node.remove(); continue; }
    for (const attr of Array.from(node.attributes)) if (!['href', 'src', 'alt', 'title', 'colspan', 'rowspan'].includes(attr.name)) node.removeAttribute(attr.name);
    for (const attr of ['href', 'src']) if (node.hasAttribute(attr)) {
      const url = safeUrl(node.getAttribute(attr));
      if (url && (attr !== 'src' || /^https?:/i.test(url))) node.setAttribute(attr, url); else node.removeAttribute(attr);
    }
    if (node.tagName === 'IMG') { node.setAttribute('loading', 'lazy'); node.setAttribute('alt', node.getAttribute('alt') || 'Published content image'); }
  }
  return doc.body.innerHTML;
}
export function rich(value) {
  if (!value) return '';
  let raw = String(value).replace(/\r/g, '');
  // Retain stored HTML formatting through a strict element and URL allowlist.
  if (/<\/?(?:p|div|br|ul|ol|li|h[1-6]|table|img|a|strong|em)\b/i.test(raw)) raw = sanitise(raw);
  else raw = esc(raw);
  const inline = text => text
    .replace(/!\[([^\]]*)\]\(([^\s)]+)\)/g, (_, alt, url) => safeUrl(url) ? `<img src="${esc(safeUrl(url))}" alt="${esc(alt)}" loading="lazy">` : alt)
    .replace(/\[([^\]]+)\]\(([^\s)]+)\)/g, (_, label, url) => safeUrl(url.replace(/&amp;/g, '&')) ? `<a href="${esc(safeUrl(url.replace(/&amp;/g, '&')))}">${label}</a>` : label)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  raw = raw.split(/\n\s*\n/).map(block => {
    const lines = block.split('\n');
    if (lines.every(l => /^\s*[-*] /.test(l))) return `<ul>${lines.map(l => `<li>${inline(l.replace(/^\s*[-*] /, ''))}</li>`).join('')}</ul>`;
    if (lines.every(l => /^\s*\d+[.)] /.test(l))) return `<ol>${lines.map(l => `<li>${inline(l.replace(/^\s*\d+[.)] /, ''))}</li>`).join('')}</ol>`;
    return lines.map(l => /^#{1,5} /.test(l) ? `<h3>${inline(l.replace(/^#+ /, ''))}</h3>` : inline(l)).join('<br>');
  }).join('<br><br>');
  // Blank lines between Markdown bullets must not create separate, widely spaced lists.
  raw = raw.replace(/<\/(ul|ol)>(?:\s*<br>\s*)+<\1>/gi, '');
  return `<div class="rich">${sanitise(raw)}</div>`;
}
export function image(url, name, className = '') {
  const safe = safeUrl(url);
  return `<span class="image-wrap ${esc(className)}"><span class="image-fallback" aria-hidden="true">${esc(name?.split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('') || 'C')}</span>${/^https?:/.test(safe) ? `<img src="${esc(safe)}" alt="${esc(name)}" loading="lazy" data-fallback>` : ''}</span>`;
}
export function venue(record) {
  const logistics = list(record.subPages).filter(s => s.type === 'logistics').flatMap(s => list(s.content));
  const item = logistics.find(x => /venue|location|address/i.test(x.key || x.label || '')) || logistics.find(x => x.link);
  return item?.link ? link(item.link, `${record.location || 'Venue'} ↗`) : esc(record.location || 'Location not published');
}
export const publicPath = (family, record) => `http://localhost:3000/${family === 'academy' ? `academy/${/residential/i.test(record.type || '') ? 'residential' : 'online'}` : family}/${encodeURIComponent(record.slug || '')}`;
export function related(records, family) {
  return list(records).length ? `<div class="related-grid">${records.map(r => `<article class="related-card">${image(r.image, title(r), 'mini-image')}<div><p class="kicker">${esc(r.role || r.type || r.tag || family)}</p><h3>${link(publicPath(family, r), title(r))}</h3>${r.description ? `<p>${esc(r.description)}</p>` : ''}</div></article>`).join('')}</div>` : empty('No linked records published in this snapshot.');
}
export function partners(record) {
  const groups = [['Collaborators', record.collaborators], ['Sponsors / funders', record.sponsors], ['Funding', record.fundingAgencies], ['Support', record.supportingAgencies]];
  const content = groups.filter(([, items]) => list(items).length).map(([label, items]) => `<div class="partner-group"><p class="kicker">${label}</p><div class="partner-list">${items.map(p => `<div class="partner">${image(p.logo, p.name, 'partner-logo')}<div>${link(p.website, p.name)}${p.role ? `<small>${esc(p.role)}</small>` : ''}</div></div>`).join('')}</div>`).join('');
  return content ? `<section class="partner-strip" aria-label="Organisations and funders">${content}</section>` : '';
}
export function publications(record) {
  const items = new Map();
  for (let value of [...list(record.publications), ...list(record.scholarPublications)]) {
    if (!value) continue;
    if (typeof value === 'string') {
      const markdownLink = value.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      const url = value.match(/https?:\/\/[^\s<>]+/);
      const citations = value.match(/\[Citations:\s*(\d+)\]/i)?.[1];
      value = { title: value.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1').replace(/\[Citations:\s*\d+\]/gi, '').replace(/\((?:19|20)\d{2}\)/g, '').replace(/https?:\/\/[^\s<>]+/g, '').trim(), year: value.match(/\b((?:19|20)\d{2})\b/)?.[1], link: markdownLink?.[2] || url?.[0], citationCount: citations === undefined ? undefined : Number(citations) };
    }
    if (typeof value !== 'object') continue;
    const item = { ...value, title: value.title || value.name || value.citation };
    const key = String(item.title || '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
    if (!key) continue;
    const previous = items.get(key) || {};
    items.set(key, { ...previous, ...Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined && v !== '')) });
  }
  return [...items.values()].sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
}
export function socialLinks(record) {
  const socials = record.socials || {}, links = [];
  const labels = { linkedin: 'LinkedIn', website: 'Website', github: 'GitHub', twitter: 'Twitter', researchgate: 'ResearchGate', academia: 'Academia' };
  for (const [key, label] of Object.entries(labels)) if (safeUrl(socials[key])) links.push(link(socials[key], label));
  const scholar = socials.realGoogleScholar || socials.googlescholar;
  if (scholar) links.push(link(/^https?:/i.test(scholar) ? scholar : `https://scholar.google.com/citations?user=${encodeURIComponent(scholar)}`, 'Google Scholar'));
  if (socials.semanticscholar) links.push(link(/^https?:/i.test(socials.semanticscholar) ? socials.semanticscholar : `https://www.semanticscholar.org/author/${encodeURIComponent(socials.semanticscholar)}`, 'Semantic Scholar'));
  if (socials.orcid) links.push(link(/^https?:/i.test(socials.orcid) ? socials.orcid : `https://orcid.org/${encodeURIComponent(socials.orcid)}`, 'ORCID'));
  for (const item of list(record.otherLinks)) if (safeUrl(item.url || item.link)) links.push(link(item.url || item.link, item.name || item.label || item.title || 'Profile link'));
  return links.join(' ');
}
function publicationHTML(items) {
  return items.length ? `<div class="publication-tools"><label>Search publications<input data-publication-search type="search" placeholder="Title, author or journal"></label><label>Year<select data-publication-year><option value="all">All years</option>${[...new Set(items.map(p => String(p.year || '')).filter(Boolean))].sort().reverse().map(y => `<option>${esc(y)}</option>`).join('')}</select></label></div><p data-publication-count class="small">${items.length} publications</p><ol class="publication-list">${items.map(p => `<li data-publication data-year="${esc(p.year || '')}"><h3>${link(p.url || p.link || p.doi && `https://doi.org/${p.doi}`, p.title)}</h3><p>${esc([p.authors, p.journal || p.venue, p.year].filter(Boolean).join(' · '))}</p>${p.citationCount !== undefined ? `<small>${esc(p.citationCount)} citations in source snapshot</small>` : ''}</li>`).join('')}</ol><p class="empty-state" data-publication-empty hidden>No matching publications.</p>` : empty('No publications published in this snapshot.');
}
function objectRows(items) {
  return `<div class="detail-list">${items.map(x => typeof x === 'string' ? `<div>${rich(x)}</div>` : `<article>${x.name || x.title || x.degree || x.role || x.label ? `<h3>${link(x.profileUrl || x.url || x.link, x.name || x.title || x.degree || x.role || x.label)}</h3>` : ''}${rich([x.role !== x.name ? x.role : '', x.affiliation || x.institution || x.organization, x.period || x.year].filter(Boolean).join(' · '))}${rich(x.description || x.content || x.abstract || '')}</article>`).join('')}</div>`;
}
export function sectionHTML(section, record) {
  const c = section.content;
  if (section.type === 'related') return related(c.records, c.family);
  if (section.type === 'publications') return publicationHTML(c);
  if (section.type === 'links') return `<ul class="link-list">${list(c).map(x => `<li>${link(x.url || x.website || x.link, x.name || x.title || 'Open resource ↗')}</li>`).join('')}</ul>`;
  if (section.type === 'dates') return `<ol class="date-list">${list(c).map(x => `<li><span class="date-mark">${esc(x.date)}</span><div><strong>${esc(x.label)}</strong>${x.footnote || x.Footnote ? `<p>${esc(x.footnote || x.Footnote)}</p>` : ''}</div></li>`).join('')}</ol>`;
  if (section.type === 'schedule') {
    const days = list(c?.scheduleDays).length ? c.scheduleDays : list(c).length ? c : list(record.schedule);
    const nested = days.some(x => Array.isArray(x.sessions) || Array.isArray(x.items) || Array.isArray(x.schedule));
    const rows = items => `<div class="schedule-list">${list(items).map(x => `<article><time>${esc(x.time || x.timeLabel || x.startTime || '')}</time><div><h3>${esc(x.topic || x.sessionName || x.title || x.name)}</h3>${x.venue ? `<p class="small">${esc(x.venue)}</p>` : ''}${x.speaker || x.presenter || x.description ? `<p>${esc(x.speaker || x.presenter || x.description)}</p>` : ''}${x.details ? rich(x.details) : ''}${list(x.entries).length ? `<div class="session-entries">${x.entries.map(entry => `<div><h4>${esc(entry.topic || entry.title || '')}</h4>${entry.speaker ? `<p>${esc(entry.speaker)}</p>` : ''}${rich(entry.details || entry.description)}</div>`).join('')}</div>` : ''}</div></article>`).join('')}</div>`;
    const documentLink = c?.googleDriveLink || c?.document?.url || c?.document?.fileUrl;
    const access = documentLink ? `<p>${link(documentLink, 'Open published programme document ↗', 'quiet-link')}</p>` : '';
    return access + (nested ? `<label class="day-label">Programme day<select data-day>${days.map((d, i) => `<option value="${i}">${esc([d.day || d.name || d.title || `Day ${i + 1}`, d.date].filter(Boolean).join(' · '))}</option>`).join('')}</select></label>${days.map((d, i) => `<div data-day-panel="${i}" ${i ? 'hidden' : ''}>${d.description ? rich(d.description) : ''}${rows(d.sessions || d.items || d.schedule)}</div>`).join('')}` : days.length ? rows(days) : !access ? empty('No programme details were published in this snapshot.') : '');
  }
  if (section.type === 'registration') {
    const fees = list(c?.fees).length ? c.fees : list(record.registrationCard?.fees);
    return `${c?.deadline ? `<p><strong>Published registration deadline:</strong> ${esc(c.deadline)}</p>` : ''}${fees.length ? `<table><caption>Published registration fees</caption><thead><tr><th scope="col">Category</th><th scope="col">Fee</th></tr></thead><tbody>${fees.map(f => `<tr><td>${esc(f.category)}</td><td>${esc(f.fee)}</td></tr>`).join('')}</tbody></table>` : ''}${list(c?.instructions).map(rich).join('')}${rich(c?.markdown || c?.description)}<p class="preview-note">Design preview: no registration, payment or account change takes place here. Follow the current event page for eligibility and access.</p>${link(publicPath('events', record) + '?tab=' + encodeURIComponent(section.sourceSlug || section.id), 'Open current participation details ↗', 'button')}`;
  }
  if (section.type === 'logistics') return `<div class="detail-list">${list(c).map(x => `<article><h3>${esc(x.key || x.label || 'Practical information')}</h3>${rich(x.value || x.description)}${x.link ? link(x.link, 'Open location / details ↗') : ''}</article>`).join('')}</div>`;
  if (section.type === 'committees') return list(c).map(group => `<h3>${esc(group.name)}</h3>${objectRows(list(group.members))}`).join('');
  if (section.type === 'contact') return `<div class="detail-list">${list(c).map(x => `<article><h3>${esc(x.name)}</h3><p>${esc(x.designation || x.role || '')}</p>${link(`mailto:${x.email || ''}`, x.email || '')} ${x.phone ? link(`tel:${x.phone}`, x.phone) : ''}</article>`).join('')}</div>`;
  if (section.type === 'list') return objectRows(list(c));
  if (section.type === 'notice') return empty(c);
  if (typeof c === 'string') return rich(c);
  if (Array.isArray(c)) return objectRows(c);
  if (c && typeof c === 'object') return `${c.teaser ? `<p class="section-teaser">${esc(c.teaser)}</p>` : ''}${rich(c.markdown || c.text || c.description || '')}${!c.markdown && !c.text && !c.description && !c.teaser ? `<dl>${Object.entries(c).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${typeof v === 'object' ? objectRows(list(v)) : rich(v)}</dd>`).join('')}</dl>` : ''}`;
  return empty('Content is not available in the public snapshot.');
}
export function sectionsFor(family, record, data) {
  const sections = [];
  const add = (id, label, type, content, note = '') => sections.push({ id, label, type, content, note });
  const relatedTo = (key, slugs) => data[key].filter(x => list(slugs).includes(x.slug));
  const relatedSection = (id, label, key, records) => { if (records.length) add(id, label, 'related', { family: key === 'courses' ? 'academy' : key, records }); };
  const custom = () => list(record.subPages).forEach((s, i) => {
    let id = s.slug || `section-${i}`;
    if (sections.some(x => x.id === id)) id = `custom-${id}-${i}`;
    sections.push({ id, sourceSlug: s.slug, label: s.title || 'Additional information', type: s.type || 'markdown', content: s.content, note: 'Published section' });
  });
  if (family === 'events') {
    custom();
    if (!sections.length) add('overview', 'About the event', 'markdown', record.longDescription || record.description);
    if (list(record.schedule).length && !sections.some(s => s.type === 'schedule')) add('programme', 'Programme', 'schedule', record.schedule);
    if (list(record.presenters).length) add('presenters', 'Presenters', 'list', record.presenters);
    relatedSection('related-projects', 'Connected projects', 'projects', relatedTo('projects', record.associatedProjects));
    relatedSection('related-centres', 'Research centres', 'centres', relatedTo('centres', record.associatedCentres));
    if (record.supportOfficeEmail && !sections.some(s => s.type === 'contact')) add('contact', 'Contact', 'contact', [{ name: 'Event enquiries', designation: record.supportOfficeText, email: record.supportOfficeEmail }]);
  } else if (family === 'projects') {
    add('overview', 'Purpose & overview', 'markdown', record.longDescription || record.description);
    if (record.outputUrl || list(record.relatedLinks).length) add('outputs', 'Outputs & links', 'links', [...(record.outputUrl ? [{ name: record.outputLabel || 'Open project output ↗', url: record.outputUrl }] : []), ...list(record.relatedLinks)]);
    if (record.methodology) add('methodology', 'Approach', 'markdown', record.methodology);
    if (list(record.aims).length) add('aims', 'Aims', 'list', record.aims);
    if (list(record.impact).length) add('impact', 'Impact', 'list', record.impact);
    relatedSection('directors', 'Project leads', 'people', relatedTo('people', record.projectDirectors));
    if (list(record.projectStaffs).length) add('team', 'Team & roles', 'list', record.projectStaffs);
    relatedSection('events', 'Related events', 'events', data.events.filter(e => list(e.associatedProjects).includes(record.slug)));
    if (list(record.openPositions).length) add('opportunities', 'Opportunities', 'list', record.openPositions);
    custom();
  } else if (family === 'people') {
    add('about', 'Research & biography', 'markdown', record.bio);
    add('publications', 'Publications', 'publications', publications(record));
    relatedSection('projects', 'Projects', 'projects', data.projects.filter(p => list(p.projectDirectors).includes(record.slug)));
    relatedSection('courses', 'Teaching & learning', 'courses', data.courses.filter(c => [...list(c.instructors), ...list(c.associatedPeople)].includes(record.slug)));
    relatedSection('events', 'Events', 'events', data.events.filter(e => list(e.associatedPeople).includes(record.slug) || list(e.presenters).some(p => p.staffSlug === record.slug)));
    if (list(record.manualCourses).length) add('additional-courses', 'Additional teaching', 'list', record.manualCourses);
    if (list(record.manualEvents).length) add('additional-events', 'Additional events', 'list', record.manualEvents);
    if (list(record.experience).length) add('experience', 'Experience', 'list', record.experience);
    if (list(record.education).length) add('education', 'Education', 'list', record.education);
    list(record.otherSections).forEach((s, i) => add(`additional-${i}`, s.title, Array.isArray(s.content) ? 'list' : 'markdown', s.content));
  } else if (family === 'centres') {
    add('focus', 'Research focus', 'markdown', record.description);
    if (list(record.aims).length) add('aims', 'Aims', 'list', record.aims);
    relatedSection('projects', 'Connected projects', 'projects', data.projects.filter(p => list(record.projects).includes(p.slug) || list(p.associatedCentres).includes(record.slug)));
    relatedSection('people', 'People', 'people', data.people.filter(p => list(record.people).includes(p.slug) || list(p.centres).includes(record.slug)));
    relatedSection('courses', 'Learning', 'courses', data.courses.filter(c => list(record.courses).includes(c.slug) || list(c.associatedCentres).includes(record.slug)));
    add('publications', 'Publications', 'publications', publications(record));
    if (list(record.relevantCards).length) add('resources', 'Research resources', 'list', record.relevantCards);
    custom();
  } else if (family === 'academy') {
    add('overview', 'Course overview', 'markdown', record.longDescription || record.description);
    if (list(record.outline).length) add('outline', 'Learning outline', 'list', record.outline);
    if (list(record.highlights).length) add('highlights', 'What to expect', 'list', record.highlights);
    relatedSection('instructors', 'Instructors', 'people', relatedTo('people', record.instructors));
    custom();
    add('classroom', 'Classroom preview', 'notice', 'The classroom keeps its lesson outline, reading area and progress controls. Private lessons and learner progress are not included in this public snapshot. Open the current course to sign in.');
  }
  return sections;
}
export function sectionPreview(section) {
  if (section.type === 'schedule' && list(section.content?.scheduleDays).length) return `${section.content.scheduleDays.length} programme days · ${section.content.scheduleDays[0].name || section.content.scheduleDays[0].date || 'View sessions and speakers'}`;
  if (section.type === 'schedule' && section.content?.googleDriveLink) return 'Open the published programme document.';
  if (section.type === 'related') return `${section.content.records.length} linked ${section.content.family === 'academy' ? 'courses' : section.content.family}`;
  if (Array.isArray(section.content)) {
    const first = section.content[0];
    const description = typeof first === 'string' ? first : first?.title || first?.name || first?.label || first?.key || first?.topic || '';
    return `${section.content.length} ${section.type === 'publications' ? 'publications' : 'entries'}${description ? ` · ${description}` : ''}`;
  }
  const text = typeof section.content === 'string' ? section.content : section.content?.teaser || section.content?.markdown || section.content?.description || '';
  const doc = new DOMParser().parseFromString(text, 'text/html');
  return (doc.body.textContent || '').replace(/[#*`]/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').slice(0, 140) || (section.type === 'registration' ? 'Fees, eligibility and practical next steps.' : 'Read the published details.');
}
