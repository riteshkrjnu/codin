import type { ReactNode } from 'react';
import { centrePartners, recordPartners } from '../partners';
import { learningHref, learningLabel } from './learningAccess';
import type { RecordData } from '../data';
import { dateLabel, useSiteData } from '../data';
import { getEffectiveStatus, getProjectStatus } from '../../lib/courseStatus';
import { Heading, Badge } from '../ui';
import { useLifecycleNow } from '../../lib/lifecycleClock';
import { Link, useLocation } from 'react-router-dom';
import { venueLink } from './RecordGlance';
import { PartnerLinks } from '../cards';
import PartnerStrip from './PartnerStrip';

/** Presentation contract: controllers keep their data, permissions, forms and tabs. */
export default function RecordHeading({ record, kind, actions, materialsAccess=false }: { record: RecordData; materialsAccess?: boolean; actions?: ReactNode; kind: 'project'|'event'|'course'|'centre'|'person' }) {
  const now = useLifecycleNow(), { data } = useSiteData();
  const partners=kind==='centre'?centrePartners(record,data):recordPartners(record);
  const centreSlugs = record.associatedCentres || record.centres || [];
  const centres = data.centres.filter(c => centreSlugs.includes(c.slug));
  const location = useLocation(), map = venueLink(record);
  const registration = kind==='course'?{slug:'registration'}:record.subPages?.find((s:any) => s.type === 'registration')||(kind==='event'?{slug:'registration'}:undefined);
  const query = new URLSearchParams(location.search); if (registration) {query.set('section', registration.slug);if(query.has('tab'))query.set('tab',registration.slug);}
  const state = kind === 'project' ? getProjectStatus(record, now) : getEffectiveStatus(record, now);
  return <><Heading eyebrow={`${{project:'Projects',event:'Events',course:'W2M Academy',centre:'Centres',person:'People'}[kind]} / ${record.tag||record.type||record.shortName||record.role||'CoDIN'}`}
    title={record.title||record.fullName||record.name} intro={kind==='person'?undefined:record.description}
    aside={['project','event','course'].includes(kind)?<><Badge status={state}/><strong>{record.startDate?[dateLabel(record.startDate),dateLabel(record.endDate)].filter(Boolean).join(' – '):record.dates}</strong>{record.location&&<p>{map?<a href={map}>{record.location} ↗</a>:record.location}</p>}</>:undefined}/>
    {((kind==='person'&&record.email) || centres.length>0)&&<div className="record-heading-connections">{kind==='person'&&record.email&&<a href={`mailto:${record.email}`}>Email ↗</a>}{centres.map(c=><Link key={c.slug} to={`/centres/${c.slug}`}>{c.shortName||c.name} ↗</Link>)}</div>}
    {['event','course'].includes(kind)&&<div className="record-heading-actions">{actions!==undefined?actions:<>{materialsAccess&&<Link className="action" to={learningHref(record.slug,kind,new URLSearchParams(location.search).get('from')||undefined)}>{learningLabel(kind)} ↗</Link>}{registration&&<Link className="action action-secondary" to={`${location.pathname}?${query}`}>Registration ↗</Link>}</>}</div>}
    {kind==='project'?<PartnerStrip partners={partners}/>:<div className="record-heading-partners">{kind==='centre'&&(partners.funding.length+partners.collaborators.length+partners.support.length)>0&&<p className="centre-partner-note">Funders and collaborators across this centre’s projects and programmes.</p>}<PartnerLinks title={kind==='centre'?'Collaborators':'Organisers & collaborators'} items={partners.collaborators}/><PartnerLinks title="Sponsors & funders" items={partners.funding}/><PartnerLinks title="Supporting partners" items={partners.support}/></div>}</>;
}
