import { courseOverviewPages } from '../site/coursePresentation';
import type { RecordData } from '../site/data';

/** Shared public overview editor: both entry points save the same subPages chapter. */
export default function CourseOverviewEditor({record,onChange}: {record:RecordData;onChange:(pages:RecordData[])=>void}) {
  const pages=courseOverviewPages(record),page=pages.find(p=>p.type==='course_overview')!, index=pages.indexOf(page), modules=page.content?.modules||[];
  const update=(patch:RecordData)=>onChange(pages.map(p=>p===page?{...page,...patch}:p));
  const content=(patch:RecordData)=>update({content:{...page.content,...patch}});
  const module=(i:number,patch:RecordData)=>content({modules:modules.map((m:RecordData,j:number)=>j===i?{...m,...patch}:m)});
  return <section className="course-overview-editor" aria-label="Course overview editor"><h3>Course overview</h3><p>Public course information, shared with the Events editor. Learning materials stay in the LMS.</p>
    <label>Overview card title<input aria-label="Course overview title" value={page.title} onChange={e=>update({title:e.target.value})}/></label>
    <label>Overview description<textarea aria-label="Course overview description" rows={3} value={page.content?.description||''} onChange={e=>content({description:e.target.value})}/></label>
    <label>Position among page sections<select aria-label="Course overview position" value={index} onChange={e=>{const next=pages.filter(p=>p!==page);next.splice(Number(e.target.value),0,page);onChange(next);}}>{pages.map((p,i)=><option key={p.slug} value={i}>{i+1}{p===page?' · current position':''}</option>)}</select></label>
    {modules.map((m:RecordData,i:number)=><fieldset key={i}><legend>Module {i+1}</legend><label>Module title<input aria-label={`Module ${i+1} title`} value={m.title||''} onChange={e=>module(i,{title:e.target.value})}/></label><label>Module details<textarea aria-label={`Module ${i+1} details`} rows={3} value={m.description||''} onChange={e=>module(i,{description:e.target.value})}/></label><div><button type="button" disabled={!i} onClick={()=>{const next=[...modules];[next[i-1],next[i]]=[next[i],next[i-1]];content({modules:next});}}>Move module up</button><button type="button" onClick={()=>content({modules:modules.filter((_:any,j:number)=>j!==i)})}>Remove module {i+1}</button></div></fieldset>)}
    <button type="button" onClick={()=>content({modules:[...modules,{title:'',description:''}]})}>Add overview module</button>
  </section>;
}
