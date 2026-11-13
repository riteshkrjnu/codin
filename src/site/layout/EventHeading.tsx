import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { dateLabel, useSiteData, type RecordData } from '../data';
import { recordPartners } from '../partners';
import { getEffectiveStatus } from '../../lib/courseStatus';
import { useLifecycleNow } from '../../lib/lifecycleClock';
import { Badge } from '../ui';
import PartnerStrip from './PartnerStrip';
import { venueLink } from './RecordGlance';

export default function EventHeading({record,kind,actions}: {record:RecordData;kind:'event'|'course';actions:ReactNode}) {
  const {data}=useSiteData(),now=useLifecycleNow(),map=venueLink(record),partners=recordPartners(record);
  const centres=data.centres.filter(c=>(record.associatedCentres||record.centres||[]).includes(c.slug));
  const dates=record.startDate?[dateLabel(record.startDate),record.endDate&&dateLabel(record.endDate)!==dateLabel(record.startDate)?dateLabel(record.endDate):null].filter(Boolean).join(' – '):record.dates;
  return <header className="event-record-heading">
    <p className="eyebrow">{kind==='course'?'W2M Academy':'Events'} / {record.type||'CoDIN'}</p>
    <div className="event-heading-meta">{dates&&<time dateTime={record.startDate}>{dates}</time>}<Badge status={getEffectiveStatus(record,now)}/></div>
    <h1>{record.title}</h1>
    {record.location&&<p className="event-heading-venue"><MapPin aria-hidden="true"/>{map?<a href={map}>{record.location} ↗</a>:<span>{record.location}</span>}</p>}
    <PartnerStrip partners={partners}/>
    {centres.length>0&&<div className="event-heading-centres"><span>Centres</span><nav aria-label="Associated centres">{centres.map(c=><Link key={c.slug} to={`/centres/${c.slug}`}>{c.name||c.shortName} ↗</Link>)}</nav></div>}
    <div className="record-heading-actions event-heading-actions">{actions}</div>
    {record.description&&<p className="event-heading-description">{record.description}</p>}
  </header>;
}
