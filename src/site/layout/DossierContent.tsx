import { Link } from 'react-router-dom';
import { type ReactNode } from 'react';
import { coursePath, type RecordData } from '../data';
import { RichText, SmartLink, Media } from '../ui';
import RecordImage from './RecordImage';
import RecordContent from './RecordContent';
import PublicationList from '../../features/publications/PublicationList';
import { normalizePublications } from '../../features/publications/publications';

/** Read templates receive real records and explicit action slots; controllers retain all writes. */
export function ConnectedRecords({ items, family, empty = 'No connected records have been published.' }: { items: RecordData[]; family: string; empty?: string }) {
  return items.length ? <div className="dossier-records">{items.map((r,i) => <article key={r.slug||i} className={family==='people'?'dossier-person-row':''}>
    {family==='people'&&<div className="dossier-avatar"><RecordImage src={r.image} alt={r.fullName||r.name||r.title}/></div>}
    <div><p className="dossier-meta">{[r.role||r.type||r.tag,r.dates||r.duration].filter(Boolean).join(' · ')}</p>
    <h3>{r.external||(!r.slug&&!r.link)?<span>{r.fullName||r.name||r.title}</span>:<SmartLink to={r.isManual?r.link:family==='academy'?coursePath(r):r.slug?`/${family}/${r.slug}`:r.link}>{r.title||r.fullName||r.name} ↗</SmartLink>}</h3>
    {(r.description||r.bio)&&<p>{r.description||r.bio}</p>}{(r.location||r.venue)&&<p className="dossier-meta">{r.location||r.venue}</p>}</div>
  </article>)}</div> : <p className="dossier-empty">{empty}</p>;
}
export function Aims({ items }: {items?:string[]}) { return items?.length ? <ol className="dossier-aims">{items.map((text,i)=><li key={i}><span>{String(i+1).padStart(2,'0')}</span><RichText text={text}/></li>)}</ol> : <p className="dossier-empty">No aims have been published yet.</p>; }
function EvidenceMedia({ images=[], videos=[] }: {images?:string[];videos?:string[]}) {
  return <div className="dossier-media">{images.map((src,i)=><a key={src+i} href={src} target="_blank" rel="noreferrer"><RecordImage src={src} alt={`Published image ${i+1}`}/><small>View image ↗</small></a>)}{videos.map((url,i)=><div key={url+i}><Media type="video" url={url} title={`Published video ${i+1}`}/></div>)}</div>;
}
export function ProjectChapter({ section, record, people, events, onApply }: {section:RecordData;record:RecordData;people:RecordData[];events:RecordData[];onApply:(position:RecordData)=>void}) {
  if(section.slug==='overview'||section.slug==='methodology') {
    const overview=section.slug==='overview';return <div className="dossier-reading"><RichText text={overview?record.longDescription||record.description:record.methodology}/>
      <EvidenceMedia images={overview?record.overviewImages:record.methodologyImages} videos={overview?record.overviewYoutubeLinks:record.methodologyYoutubeLinks}/>
      {overview&&record.impact?.length>0&&<section className="dossier-subsection"><h3>Outcomes & contribution</h3><Aims items={record.impact}/></section>}</div>;
  }
  if(section.slug==='aims')return <Aims items={record.aims}/>;
  if(section.slug==='events'||section.type==='events')return <ConnectedRecords items={events} family="events"/>;
  if(section.slug==='staff') {
    const resolve=(slugs:string[]=[])=>slugs.map(slug=>people.find(p=>p.slug===slug)||{slug,fullName:slug.split('(')[0].trim(),role:slug.includes('(')?slug.split('(')[1].replace(')','').trim():undefined,external:true});
    return <div className="dossier-reading"><section><h3>Project leads</h3><ConnectedRecords items={resolve(record.projectDirectors)} family="people"/></section><section className="dossier-subsection"><h3>Research & field team</h3><ConnectedRecords items={resolve(record.projectStaffs)} family="people"/></section><section className="dossier-subsection"><h3>Opportunities</h3>{record.openPositions?.length?record.openPositions.map((position:RecordData,i:number)=><article key={i} className="dossier-opportunity"><h4>{position.title}</h4>{position.deadline&&<p className="dossier-meta">Apply by {position.deadline}</p>}<RichText text={position.description}/><div className="dossier-actions">{position.applyLink&&<SmartLink to={position.applyLink}>Job specification ↗</SmartLink>}<button onClick={()=>onApply(position)}>Apply through CoDIN ↗</button></div></article>):<p className="dossier-empty">No vacancies are currently advertised.</p>}</section></div>;
  }
  return <RecordContent section={section as any}/>;
}
export function CentreChapter({section,record,people,projects,courses}: {section:RecordData;record:RecordData;people:RecordData[];projects:RecordData[];courses:RecordData[]}) {
  if(section.slug==='aims')return <div className="dossier-reading"><Aims items={record.aims}/>{record.relevantCards?.length>0&&<section className="dossier-subsection"><h3>Resources & facilities</h3><div className="dossier-records">{record.relevantCards.map((r:RecordData,i:number)=><article key={i}><div><h4>{r.title}</h4><RichText text={r.description}/></div></article>)}</div></section>}</div>;
  if(section.slug==='people')return <ConnectedRecords items={people} family="people"/>;
  if(section.slug==='projects')return <ConnectedRecords items={projects} family="projects"/>;
  if(section.slug==='courses')return <ConnectedRecords items={courses} family="academy"/>;
  if(section.slug==='publications')return <PublicationList items={normalizePublications(record.publications||[])}/>;
  return <RecordContent section={section as any}/>;
}
export function PersonBiography({person,syncing}: {person:RecordData;syncing?:boolean}) {
  const stats=person.scholarStats;
  return <div className="dossier-reading"><RichText text={person.bio}/>{stats&&<section className="dossier-subsection"><div className="dossier-section-label"><h3>Research in numbers</h3><span>{syncing?'Updating…':stats.lastUpdated?`Updated ${stats.lastUpdated}`:'Google Scholar'}</span></div><dl className="person-statistics">{[['Citations',stats.citations],['h-index',stats.hIndex],['i10-index',stats.i10Index],['Publications',stats.publicationCount]].map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value??0}</dd></div>)}</dl></section>}</div>;
}
function PublishedDetails({value}: {value:any}) {
  if(value==null)return null;
  if(typeof value!=='object')return <RichText text={String(value)}/>;
  if(Array.isArray(value))return <ul className="published-details-list">{value.map((v,i)=><li key={i}><PublishedDetails value={v}/></li>)}</ul>;
  if(typeof value.markdown==='string')return <RichText text={value.markdown}/>;
  return <dl className="published-details">{Object.entries(value).map(([key,v])=><div key={key}><dt>{key.replace(/([a-z])([A-Z])/g,'$1 $2')}</dt><dd><PublishedDetails value={v}/></dd></div>)}</dl>;
}
export function PersonBackground({person}: {person:RecordData}) {
  return <div className="dossier-reading"><section><h3>Education</h3><div className="dossier-records">{person.education?.length?person.education.map((r:RecordData,i:number)=><article key={i}><time>{r.year}</time><div><h4>{r.degree}</h4><p>{r.institution}</p></div></article>):<p className="dossier-empty">No education details published.</p>}</div></section><section className="dossier-subsection"><h3>Experience</h3><div className="dossier-records">{person.experience?.length?person.experience.map((r:RecordData,i:number)=><article key={i}><time>{r.period}</time><div><h4>{r.role}</h4><p>{r.organization}</p><RichText text={r.description}/></div></article>):<p className="dossier-empty">No experience details published.</p>}</div></section>{person.otherSections?.map((r:RecordData,i:number)=><section className="dossier-subsection" key={i}><h3>{r.title}</h3><PublishedDetails value={r.content}/></section>)}</div>;
}
