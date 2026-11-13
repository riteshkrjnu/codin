import RecordImage from './RecordImage';
import { learningHref } from './learningAccess';
import { affiliations, peopleAffiliation } from '../peopleAffiliation';
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { coursePath, useSiteData } from '../data';
import { resourceLibrary } from '../resources';

/** Navigation/presentation only: record controllers and their editors remain mounted in children. */
export default function ConnectedWorkspace({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation(), { data, loading } = useSiteData();
  const [params,setParams]=useSearchParams(), affiliation=params.get("affiliation")||"all";
  const learningSlug=/^\/academy\/online\/([^/]+)$/.exec(pathname)?.[1];
  const origin=params.get('from');
  const eventLearning=!!learningSlug&&(origin==='events'||origin!=='academy'&&(params.get('context')==='event'||params.get('context')!=='course'&&data.events.some(r=>!r.isCourse&&r.slug===decodeURIComponent(learningSlug))));
  const academyRecord=pathname.startsWith('/events/')&&origin==='academy';
  const governance = pathname === '/about/board' || pathname === '/about/rab';
  const family = governance ? 'people' : academyRecord ? 'academy' : eventLearning ? 'events' : pathname.split('/')[1];
  const supported = ['centres', 'academy', 'projects', 'people', 'resources', 'events'].includes(family);
  const isIndex = governance || /^\/(centres|projects|people|resources|events)\/?$/.test(pathname) || /^\/academy(?:\/(?:online|residential|custom))?\/?$/.test(pathname);
  const [directoryState, setDirectoryState] = useState({ path: pathname, open: isIndex }), [queries, setQueries] = useState<Record<string, string>>({});
  const open = directoryState.path === pathname ? directoryState.open : isIndex;
  // A disclosure click can arrive while Router is committing a record transition.
  const setOpen = (value: boolean) => setDirectoryState({ path: window.location.pathname, open: value });
  const directoryRef = useRef<HTMLElement>(null), scrollPositions = useRef<Record<string, number>>({});
  useLayoutEffect(() => { if(open && directoryRef.current) directoryRef.current.scrollTop=scrollPositions.current[family]||0; },[open,family]);
  const label = ({ centres: 'Centres', academy: 'W2M Academy', projects: 'Projects', people: 'People', resources: 'CoDIN Commons', events: 'Events' } as Record<string, string>)[family];
  const records = useMemo(() => {
    const source = family === 'academy' ? data.courses : family === 'resources' ? resourceLibrary(data) : data[family] || [];
    return source.filter(r => (family!=='people'||affiliation==='all'||peopleAffiliation(r)===affiliation) && (!governance || r.boardMemberType === (pathname.endsWith('/board') ? 'board' : 'rab')) && !(family === 'academy' && pathname === '/academy/online' && /residential/i.test(r.type || '')) && !(family === 'academy' && pathname === '/academy/residential' && !/residential/i.test(r.type || ''))).map(r => ({ ...r, label: r.title || r.fullName || r.name, href: learningSlug&&['academy','events'].includes(family) ? learningHref(r.slug,eventLearning&&!r.isCourse?'event':'course',eventLearning?'events':'academy') : family === 'academy' ? coursePath(r) : `/${family}/${encodeURIComponent(r.slug)}${family==='events'&&r.isCourse?'?isCourse=true&from=events':''}` }));
  }, [data, family, pathname, affiliation, learningSlug, eventLearning]);
  if (!supported || pathname.startsWith('/academy/certifications')) return <>{children}</>;
  const query = queries[family] || '', rows = records.filter(r => `${r.label} ${r.role || ''} ${r.description || r.bio || ''} ${[...(Array.isArray(r.researchInterests)?r.researchInterests:[]),...(Array.isArray(r.keywords)?r.keywords:[])].join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return <div className={`connected-workspace workspace-${family} ${open ? 'is-expanded' : 'is-collapsed'}`}>
    <aside ref={directoryRef} className="workspace-directory" aria-label={`${label} directory`} hidden={!open} onScroll={e=>{if(open)scrollPositions.current[family]=e.currentTarget.scrollTop;}}>
      <div className="workspace-directory-heading"><span>{label}</span><button aria-label={`Collapse ${label} sidebar`} onClick={() => setOpen(false)}>←</button></div>
      <label>Search {label.toLowerCase()}<input type="search" value={query} onChange={e => setQueries(v => ({ ...v, [family]: e.target.value }))} placeholder="Name, title or topic"/></label>
      {family==='people'&&!governance&&<label>Affiliation<select aria-label="Sidebar affiliation" value={affiliation} onChange={e=>{const next=new URLSearchParams(params);next.set('affiliation',e.target.value);setParams(next,{replace:true});}}>{Object.entries(affiliations).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
      {family === 'academy' && <nav className="academy-format-links" aria-label="Course formats">{[['/academy','All'],['/academy/residential','Residential'],['/academy/online','Online'],['/academy/custom','Custom courses']].map(([href,title])=><Link key={href} to={href} aria-current={pathname===href?'page':undefined}>{title}</Link>)}</nav>}
      <p className="workspace-count" role="status">{loading ? 'Loading…' : `${rows.length} records`}</p>
      <nav aria-label={`${label} records`}>{rows.map(r => <Link key={r.slug} to={r.href} className={family==='people'?'workspace-person-link':undefined} aria-current={(learningSlug?decodeURIComponent(learningSlug)===r.slug:pathname===r.href.split('?')[0]) ? 'page' : undefined} onClick={() => setOpen(false)}>{family==='people'&&<div className="workspace-person-thumbnail" aria-hidden="true"><RecordImage src={r.image} alt={r.label}/></div>}<div className="workspace-record-copy"><strong>{r.label}</strong><small>{(family==='people'?affiliations[peopleAffiliation(r)]:undefined) || r.role || r.shortName || r.type || r.kind || r.status}</small></div><span aria-hidden="true">↗</span></Link>)}</nav>
      {!loading && !rows.length && <p>No matching public records.</p>}
    </aside>
    <div className="workspace-rail" hidden={open}><button onClick={() => setOpen(true)} aria-expanded={open} aria-label={`Show ${label} sidebar`}><span aria-hidden="true">☰</span><span>{label}</span></button></div>
    <div className="workspace-page">{children}</div>
  </div>;
}
