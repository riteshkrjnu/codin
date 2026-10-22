import RecordImage from './RecordImage';
import { useState } from 'react';
import { RichText, SmartLink } from '../ui';
import { safeUrl } from '../data';
import type { RecordSection } from './RecordExperience';

/** Public chapters only. Forms, permissions, private materials and writes stay in controllers. */
export default function RecordContent({ section }: { section: RecordSection }) {
  const [day, setDay] = useState(0), c = section.content || [];
  if(section.type==='course_overview')return <div className="dossier-reading"><RichText text={c.description}/>{c.modules?.length>0?<div className="course-module-overview">{c.modules.map((module:any,i:number)=><article key={i}><span className="dossier-meta">Module {String(i+1).padStart(2,'0')}</span><h3>{module.title}</h3><RichText text={module.description}/></article>)}</div>:<p className="dossier-empty">The public module outline will be published here.</p>}</div>;
  if (section.type === 'schedule') {
    const groups=new Map<string,any[]>();
    if(Array.isArray(c))c.forEach(row=>{const label=row.date||row.day||'Programme';groups.set(label,[...(groups.get(label)||[]),row]);});
    const days=Array.isArray(c?.scheduleDays)?c.scheduleDays:[...groups].map(([name,sessions])=>({name,sessions}));
    const documentURL=c?.document?.dataUrl;
    const downloadable=safeUrl(documentURL)||(/^data:application\/(pdf|msword|vnd\.)/.test(documentURL||'')?documentURL:undefined);
    let drivePreview='';
    try { const url=new URL(c.googleDriveLink);if(['drive.google.com','docs.google.com'].includes(url.hostname)){const match=url.pathname.match(/\/d\/([^/]+)/);if(match)drivePreview=`${url.origin}${url.pathname.split('/d/')[0]}/d/${match[1]}/preview`;}} catch {}
    const rows=(items:any[])=>items.map((s,i)=><article className="public-schedule-row" key={s.id||i}><time>{s.timeLabel||s.time}</time><div><h3>{s.sessionName||s.topic||s.title}</h3>{s.venue&&<p>{s.venue}</p>}{s.speaker&&<p>{s.speaker}</p>}<RichText text={s.details||s.description}/>{s.entries?.map((entry:any,j:number)=><div className="schedule-entry" key={entry.id||j}><h4>{entry.topic}</h4><p>{entry.speaker}</p><RichText text={entry.details}/></div>)}</div></article>);
    return <div className="dossier-reading public-programme">{downloadable&&<div className="dossier-actions"><a href={downloadable} download={c.document.name}>Download {c.document.name||'programme document'} ↗</a>{c.document.type==='application/pdf'&&<a href={downloadable} target="_blank" rel="noreferrer">Preview PDF ↗</a>}{c.document.size&&<small>{c.document.size}</small>}</div>}
      {c?.googleDriveLink&&<SmartLink to={c.googleDriveLink}>Open programme document ↗</SmartLink>}
      {drivePreview&&<iframe className="programme-document" src={drivePreview} title="Programme document" allowFullScreen/>}
      {days.length>0&&<><label className="programme-day">Programme day<select value={Math.min(day,days.length-1)} onChange={e=>setDay(Number(e.target.value))}>{days.map((d:any,i:number)=><option key={d.id||i} value={i}>{[d.name||`Day ${i+1}`,d.date].filter(Boolean).join(' · ')}</option>)}</select></label>{rows(days[Math.min(day,days.length-1)].sessions||[])}</>}
    </div>;
  }
  if (section.type==='markdown'||typeof c==='string')return <div className="dossier-reading">{c?.teaser&&<div className="chapter-lead"><RichText text={c.teaser}/></div>}<RichText text={typeof c==='string'?c:c?.markdown||c?.text||''}/></div>;
  if (section.type==='registration')return <div className="dossier-reading">{c?.deadline&&<p className="registration-deadline"><strong>Published deadline</strong><span>{c.deadline}</span></p>}{Array.isArray(c?.fees)&&c.fees.length>0&&<div className="public-fees"><table><caption>Published registration fees</caption><thead><tr><th>Category</th><th>Fee</th></tr></thead><tbody>{c.fees.map((fee:any,i:number)=><tr key={i}><td>{fee.category}</td><td>{fee.fee}</td></tr>)}</tbody></table></div>}{Array.isArray(c?.instructions)&&<ul className="registration-instructions">{c.instructions.map((text:string,i:number)=><li key={i}><RichText text={text}/></li>)}</ul>}</div>;
  if (section.type==='dates')return <dl className="public-record-list published-dates">{(Array.isArray(c)?c:[]).map((x:any,i:number)=><div className={x.highlighted?'is-highlighted':''} key={i}><dt>{x.label}</dt><dd><time>{x.date}</time>{x.footnote&&<RichText text={x.footnote}/>}</dd></div>)}</dl>;
  if (section.type==='logistics')return <dl className="public-record-list">{(Array.isArray(c)?c:Object.entries(c).map(([key,value])=>({key,value}))).map((x:any,i:number)=><div key={i}><dt>{x.key||x.label}</dt><dd><RichText text={x.value}/>{x.link&&<SmartLink to={x.link}>View location / details ↗</SmartLink>}</dd></div>)}</dl>;
  if (section.type==='committees')return <div className="public-committees">{(Array.isArray(c)?c:[]).map((g:any,i:number)=><section key={i}><h3>{g.name}</h3><div className="public-record-list">{g.members?.map((p:any,j:number)=><article key={j}>{p.photoUrl&&<div className="dossier-avatar"><RecordImage src={p.photoUrl} alt={p.name||'Committee member'}/></div>}<h4><SmartLink to={p.profileUrl}>{p.name}</SmartLink></h4><p>{[p.role,p.affiliation].filter(Boolean).join(' · ')}</p></article>)}</div></section>)}</div>;
  if (section.type==='contact')return <div className="public-record-list">{(Array.isArray(c)?c:[]).map((x:any,i:number)=><article key={i}><h3>{x.name}</h3><p>{x.designation}</p><div className="glance-links">{x.email&&<SmartLink to={`mailto:${x.email}`}>{x.email}</SmartLink>}{x.phone&&<SmartLink to={`tel:${x.phone}`}>{x.phone}</SmartLink>}</div></article>)}</div>;
  if (Array.isArray(c))return <div className="public-record-list">{c.map((x:any,i:number)=><article key={i}>{typeof x==='string'?<RichText text={x}/>:<>{x.photoUrl&&<div className="dossier-avatar"><RecordImage src={x.photoUrl} alt={x.name||x.title||'Published profile'}/></div>}<h3><SmartLink to={x.profileUrl||x.url||x.link}>{x.name||x.title}</SmartLink></h3><p>{x.role}</p><p>{x.affiliation||x.authors}</p><RichText text={x.description||x.abstract}/></>}</article>)}</div>;
  return <p className="dossier-empty">No additional public details have been published.</p>;
}
