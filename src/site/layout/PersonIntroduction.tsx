import { useId, useState } from 'react';
import type { RecordData } from '../data';
import { RichText } from '../ui';

/** Full biography stays intact; only its collapsed presentation is shortened. */
export default function PersonIntroduction({ person, syncing }: { person: RecordData; syncing?: boolean; key?: string }) {
  const [expanded,setExpanded]=useState(false), id=useId(), stats=person.scholarStats;
  return <section className="person-introduction" aria-label="Research and biography">
    {person.bio&&<><div id={id} className={`person-biography ${expanded?'is-expanded':''}`}><RichText text={person.bio}/></div><button className="dossier-text-action" aria-expanded={expanded} aria-controls={id} onClick={()=>setExpanded(v=>!v)}>{expanded?'Show less':'Read full biography'} {expanded?'↑':'↓'}</button></>}
    {stats&&<section className="person-research-metrics" aria-label="Research metrics"><dl className="person-statistics">{[['Citations',stats.citations],['h-index',stats.hIndex],['i10-index',stats.i10Index],['Publications',stats.publicationCount]].filter(([,value])=>value!==undefined&&value!==null).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><small>{syncing?'Updating research metrics…':stats.lastUpdated?`Research metrics updated ${stats.lastUpdated}`:'Google Scholar research metrics'}</small></section>}
  </section>;
}
