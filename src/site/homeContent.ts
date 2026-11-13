import { resolveConnections } from '../features/writing/connections';
import { dateBoundary, isNoticeVisible } from '../lib/courseStatus';
export const tileDefinitions=[{id:'projects',label:'Projects',intro:'Questions taking shape in the world.',link:'/projects'},{id:'w2m',label:'W2M Academy',intro:'Words. Worlds. Models. Learn in good company.',link:'/academy'},{id:'events',label:'Events',intro:'Gatherings, exchanges and shared practice.',link:'/events'},{id:'notices',label:'Notifications',intro:'Jobs, notices, circulars and opportunities.',link:'/notices'},{id:'upcoming',label:'Upcoming happenings',intro:'Make room for what comes next.',link:'/events'},{id:'publications',label:'Publications & updates',intro:'Scholarship to read, adapt and build upon.',link:'/resources'},{id:'showcase',label:'Inside the work',intro:'Voices, images and moments from our practice.',link:'/resources'}];
export const storyKey=(item:any)=>String(item.activityKey||item.homeKey||item.slug||item._id||item.link);
export function buildUpcoming(data:Record<string,any[]>,activities:any[],now=Date.now()){
 const result:any[]=[];const seen=new Set<string>();
 const add=(item:any,date:string,end=false)=>{if(typeof date!=='string')return;const normalized=end&&!/^\d{4}-\d{2}-\d{2}$/.test(date)&&/\b\d{4}\b/.test(date)&&!/:/.test(date)&&Number.isFinite(Date.parse(date))?new Date(date).toISOString().slice(0,10):date;const at=dateBoundary(normalized,end);const key=storyKey(item);if(at===undefined||at<now||seen.has(key))return;seen.add(key);result.push({...item,upcomingDate:normalized,upcomingAt:at});};
 for(const a of activities)if(['event','course'].includes(a.activityKind)&&a.status==='Upcoming'){
  add({...a,upcomingType:a.activityKind==='course'?'W2M programme':'Event'},a.sourceDate||a.startDate);
 }
 for(const r of [...(data.events||[]),...(data.courses||[])])for(const key of ['applicationDeadline','registrationDeadline','enrollmentDeadline'])if(r[key])add({...r,homeKey:`deadline:${r.slug}:${key}`,activityKey:undefined,title:`${r.title}: applications close`,link:activities.find(a=>a.sourceId===r.slug)?.link||`/events/${r.slug}`,upcomingType:'Application deadline'},r[key],true);

 for(const r of [...(data.events||[]),...(data.courses||[])]){
  for(const section of r.subPages||[])if(section.type==='registration'&&section.content?.deadline)add({...r,homeKey:`registration:${r.slug}:${section.slug}`,title:`${r.title}: registration deadline`,link:activities.find(a=>a.sourceId===r.slug)?.link||`/events/${r.slug}`,upcomingType:'Registration deadline'},section.content.deadline,true);
  for(const phase of r.registrationCard?.actionPhases||[])if(phase.endDate)add({...r,homeKey:`phase:${r.slug}:${phase.id}`,title:`${r.title}: ${phase.title}`,link:activities.find(a=>a.sourceId===r.slug)?.link||`/events/${r.slug}`,upcomingType:'Programme deadline'},phase.endDate,true);
  if(r.registrationCard?.paymentDeadline)add({...r,homeKey:`payment:${r.slug}`,title:`${r.title}: registration closes`,link:activities.find(a=>a.sourceId===r.slug)?.link||`/events/${r.slug}`,upcomingType:'Registration deadline'},r.registrationCard.paymentDeadline,true);
 }
 for(const item of data.items||[])if(isNoticeVisible(item,now)&&item.deadline)add({...item,homeKey:`notice-deadline:${item._id}`,link:item.link||item.actionLink||`/notices/${encodeURIComponent(item._id)}`,upcomingType:'Notice deadline'},item.deadline,true);
 for(const p of data.projects||[])for(const [i,position] of (p.openPositions||[]).entries())if(position.deadline)add({...position,homeKey:`position:${p.slug}:${i}`,link:`/projects/${p.slug}?section=staff`,description:p.title,upcomingType:'Job deadline'},position.deadline,true);
 return result.sort((a,b)=>a.upcomingAt-b.upcomingAt||String(a.title).localeCompare(String(b.title)));
}
export function buildTileItems(data:Record<string,any[]>,activities:any[]){
 const newest=(items:any[])=>[...items].sort((a,b)=>(Date.parse(b.publishedAt||b.updatedAt||b.date)||0)-(Date.parse(a.publishedAt||a.updatedAt||a.date)||0));
 const publications=newest((data.resources||[]).map(r=>({...r,link:`/resources/${r.slug}`})));
 const showcase=publications.filter(r=>['audio','photo','video'].includes(r.mediaType)||r.document?.blocks?.some((b:any)=>['image','gallery','audio','video','youtube'].includes(b.type))).map(r=>{const b=r.document?.blocks?.find((b:any)=>['image','gallery','audio','video','youtube'].includes(b.type));return {...r,mediaType:r.mediaUrl?r.mediaType:b?.type==='youtube'?'video':b?.type==='image'||b?.type==='gallery'?'photo':b?.type,mediaUrl:r.mediaUrl||b?.url||b?.images?.[0]?.url,image:r.image||(b?.type==='image'?b.url:b?.images?.[0]?.url)};});
 for(const p of data.projects||[])for(const [i,url] of (p.overviewYoutubeLinks||[]).entries())showcase.push({...p,homeKey:`project-video:${p.slug}:${i}`,link:`/projects/${p.slug}`,mediaType:'video',mediaUrl:url});
 for(const p of data.projects||[])for(const [i,url] of [...(p.overviewImages||[]),...(p.methodologyImages||[])].entries())showcase.push({...p,homeKey:`project-photo:${p.slug}:${i}`,link:`/projects/${p.slug}`,mediaType:'photo',mediaUrl:url,image:url});
 return {projects:newest([...(data.projects||[]).map(p=>({...p,link:`/projects/${p.slug}`})),...activities.filter(a=>a.associatedProjects?.length)]),w2m:newest(activities.filter(a=>a.area==='w2m'||resolveConnections(a,data).some(c=>c.type==='course'))),events:newest(activities.filter(a=>a.activityKind==='event'||resolveConnections(a,data).some(c=>c.type==='event'))),notices:newest(activities.filter(a=>a.activityKind==='announcement')),publications,upcoming:buildUpcoming(data,activities),showcase} as Record<string,any[]>;
}
export function orderHighlights(items:any[],pins:string[]=[]){return [...items].sort((a,b)=>{const ai=pins.indexOf(storyKey(a)),bi=pins.indexOf(storyKey(b));return (ai<0?Infinity:ai)-(bi<0?Infinity:bi)||0;});}
