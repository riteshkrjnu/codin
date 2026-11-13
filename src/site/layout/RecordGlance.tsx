import { centrePartners, recordPartners } from '../partners';
import OrganisationLinks from './OrganisationLinks';
import { learningHref, learningLabel } from './learningAccess';
import { Link, useLocation } from 'react-router-dom';
import { type ReactNode } from 'react';
import { dateLabel, safeUrl, useSiteData, type RecordData } from '../data';
import { Badge, SmartLink } from '../ui';
import { getEffectiveStatus, getProjectStatus } from '../../lib/courseStatus';
import { useLifecycleNow } from '../../lib/lifecycleClock';

export function venueLink(record: RecordData) {
  const logistics = (record.subPages || []).filter((s:any) => s.type === 'logistics').flatMap((s:any) => Array.isArray(s.content) ? s.content : Object.entries(s.content || {}).map(([key,value]) => ({key,value})));
  const explicit = safeUrl(record.locationUrl || record.venueUrl || logistics.find((x:any) => /venue|location|address/i.test(x.key || x.label || '') && x.link)?.link);
  if (explicit) return explicit;
  const venue = logistics.find((x:any) => /venue|location|address/i.test(x.key || x.label || ''))?.value || record.location;
  if (typeof venue !== 'string' || !venue.trim() || /^(online|virtual|remote|tba|tbd|to be announced)$/i.test(venue.trim())) return undefined;
  return safeUrl(venue) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.replace(/<[^>]*>/g,''))}`;
}
export function ProfileLinks({record}: {record:RecordData}) {
  const social=record.socials||{}, names:Record<string,string>={realGoogleScholar:'Google Scholar',googlescholar:'Google Scholar',semanticscholar:'Semantic Scholar',orcid:'ORCID',researchgate:'ResearchGate',academia:'Academia',linkedin:'LinkedIn',github:'GitHub',twitter:'Twitter / X',website:'Website'};
  const links=Object.entries(names).filter(([key])=>social[key]&&!(key==='googlescholar'&&social.realGoogleScholar)).map(([key,label])=>{
    const value=String(social[key]);
    const to=/^https?:/i.test(value)?value:['realGoogleScholar','googlescholar'].includes(key)?`https://scholar.google.com/citations?user=${encodeURIComponent(value)}`:key==='semanticscholar'?`https://www.semanticscholar.org/author/${encodeURIComponent(value)}`:key==='orcid'?`https://orcid.org/${value}`:value;
    const citations=key==='semanticscholar'?social.semanticscholarCitations:['realGoogleScholar','googlescholar'].includes(key)?social.realGoogleScholarCitations:undefined;
    return {label,to,citations};
  });
  return <div className="glance-links">{links.map(l=><SmartLink key={l.label} to={l.to}>{l.label} ↗{l.citations!==undefined&&<small>{l.citations} citations</small>}</SmartLink>)}{record.otherLinks?.map((l:RecordData,i:number)=><SmartLink key={i} to={l.url}>{l.label} ↗</SmartLink>)}</div>;
}
export default function RecordGlance({ record, kind, children, actions, materialsAccess=false, materialsLabel }: { record: RecordData; kind: string; children?: ReactNode; actions?: ReactNode; materialsAccess?: boolean; materialsLabel?: string }) {
  const now = useLifecycleNow(), map = venueLink(record), {data}=useSiteData(), location=useLocation();
  const centres=data.centres.filter(c=>(record.associatedCentres||record.centres||[]).includes(c.slug));
  const leads=data.people.filter(p=>(record.projectDirectors||[]).includes(p.slug));
  const registration=(record.subPages||[]).find((s:RecordData)=>s.type==='registration');
  const registrationSlug=registration?.slug||'registration';
  const sectionLink=(slug:string)=>{const params=new URLSearchParams(location.search);params.set('section',slug);if(params.has('tab'))params.set('tab',slug);return `${location.pathname}?${params}`;};
  const credits=kind==='centre'?centrePartners(record,data):recordPartners(record);
  const fees=registration?.content?.fees||record.registrationCard?.fees||[];
  const projects=kind==='centre'?data.projects.filter(p=>(record.projects||[]).includes(p.slug)||p.associatedCentres?.includes(record.slug)):[];
  const people=kind==='centre'?data.people.filter(p=>(record.people||[]).includes(p.slug)||p.centres?.includes(record.slug)):[];
  const courses=kind==='centre'?data.courses.filter(p=>(record.courses||[]).includes(p.slug)||p.associatedCentres?.includes(record.slug)):[];
  const fact=(label:string,value:ReactNode)=>value?<div className="glance-fact"><dt>{label}</dt><dd>{value}</dd></div>:null;
  const partners=(rows:RecordData[])=>rows.length?<OrganisationLinks items={rows} showNames={kind==='centre'}/>:null;
  return <div className="record-glance-facts">
    <div className="glance-primary-actions">
      {['event','course'].includes(kind)&&(actions!==undefined?actions:<>{materialsAccess&&<Link className="action" to={learningHref(record.slug,kind,new URLSearchParams(location.search).get('from')||undefined)}>{materialsLabel||learningLabel(kind)} ↗</Link>}<Link className="action action-secondary" to={sectionLink(registrationSlug)}>Registration ↗</Link></>)}
      {kind==='project'&&record.outputUrl&&<SmartLink className="action" to={safeUrl(record.outputUrl)||`https://${record.outputUrl}`}>{record.outputLabel||'Explore project output'} ↗</SmartLink>}
      {kind==='project'&&!record.outputUrl&&<SmartLink className="action" to="mailto:contact@diversity.org.in">Discuss this project ↗</SmartLink>}
      {kind==='person'&&record.email&&<SmartLink className="action" to={`mailto:${record.email}`}>Contact ↗</SmartLink>}
      {kind==='centre'&&<SmartLink className="action" to={`mailto:contact@diversity.org.in?subject=${encodeURIComponent(record.name||'Research enquiry')}`}>Contact the centre ↗</SmartLink>}
    </div>
    <dl className="glance-fact-list">
      {['event','course','project'].includes(kind)&&fact('Status',<Badge status={kind==='project'?getProjectStatus(record,now):getEffectiveStatus(record,now)}/>)}
      {fact(kind==='project'?'Timeline':'When',record.startDate?[dateLabel(record.startDate),dateLabel(record.endDate)].filter(Boolean).join(' – '):record.dates||record.year)}
      {fact('Where',record.location&&(map?<SmartLink to={map}>{record.location} ↗</SmartLink>:record.location))}
      {fact('Funding',partners(credits.funding))}
      {fact('Support',partners(credits.support))}
      {fact('Organisers & collaborators',partners(credits.collaborators))}
      {fact('Centres',centres.length?<OrganisationLinks items={centres.map(c=>({...c,name:c.shortName||c.name,website:`/centres/${c.slug}`}))}/>:null)}
      {fact('Project leads',leads.length?<div className="glance-links">{leads.map(p=><Link key={p.slug} to={`/people/${p.slug}`}>{p.fullName||p.name} ↗</Link>)}</div>:null)}
      {fact('Project reference',kind==='project'?record.id:null)}
      {fact('Role',kind==='person'?record.role:null)}
      {kind==='centre'&&fact('Research focus',record.tagline)}
      {kind==='centre'&&fact('Connected work',<div className="glance-links"><Link to={sectionLink('projects')}>{projects.length} projects ↗</Link><Link to={sectionLink('people')}>{people.length} people ↗</Link><Link to={sectionLink('courses')}>{courses.length} learning programmes ↗</Link><Link to={sectionLink('publications')}>{record.publications?.length||0} publications ↗</Link></div>)}
      {fact('Contact',record.email&&<SmartLink to={`mailto:${record.email}`}>{record.email}</SmartLink>)}
      {fact('Registration deadline',registration?.content?.deadline)}
    </dl>
    {fees.length>0&&<details className="glance-fees"><summary>Published fees · {fees.length} categories</summary><dl>{fees.map((f:RecordData,i:number)=><div key={i}><dt>{f.category}</dt><dd>{f.fee}</dd></div>)}</dl></details>}
    {record.supportOfficeEmail&&<SmartLink to={`mailto:${record.supportOfficeEmail}`}>Ask the event team ↗</SmartLink>}
    {record.relatedLinks?.length>0&&<div className="glance-related"><h3>Further links</h3><div className="glance-links">{record.relatedLinks.map((r:RecordData,i:number)=><SmartLink key={i} to={r.url}>{r.name||r.label} ↗</SmartLink>)}</div></div>}
    {children&&<div className="glance-actions-slot">{children}</div>}
  </div>;
}
