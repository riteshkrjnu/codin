import { buildActivities } from './activityFeed';
import { useLifecycleNow } from '../lib/lifecycleClock';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { getEffectiveStatus, getProjectStatus, isNoticeVisible } from '../lib/courseStatus';
export type RecordData = Record<string, any>;
export const publicRecord = (x:RecordData) => !x.deleted && !['Draft','Trash'].includes(x.status) && x.publicationState !== 'draft';
export const coursePath = (x:RecordData) => /residential/i.test(x.type||'') ? `/events/${encodeURIComponent(x.slug)}?isCourse=true&from=academy` : `/academy/online/${encodeURIComponent(x.slug)}`;
export const projectStatus = getProjectStatus;
export const statusMatches = (x:string, filter:string) => filter === 'All' || (filter === 'Active' ? ['Upcoming','Ongoing'].includes(x) : filter === 'Archived' ? ['Completed','Archived','Suspended'].includes(x) : x === filter);
export const dateLabel = (value?:string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',year:'numeric'}) : value || '';
export const safeUrl = (value?:string) => value && /^(https?:\/\/|\/(?!\/)|mailto:|tel:)/i.test(value) ? value : '';
const empty={projects:[],centres:[],courses:[],events:[],people:[],items:[],resources:[]} as Record<string,RecordData[]>;
const endpoints={projects:'projects',centres:'centres',courses:'courses',events:'events',people:'people',items:'activity-feed',resources:'resources'};
const DataContext=createContext({data:empty,loading:true,errors:[] as string[],refresh:()=>{}});
export function SiteDataProvider({children}:{children:ReactNode}){
 const now=useLifecycleNow();const {user}=useAuth();const [data,setData]=useState(empty),[loading,setLoading]=useState(true),[errors,setErrors]=useState<string[]>([]),[revision,setRevision]=useState(0);
 useEffect(()=>{const update=()=>setRevision(x=>x+1);const timer=window.setInterval(update,60000);window.addEventListener('codin-content-updated',update);window.addEventListener('focus',update);return()=>{clearInterval(timer);window.removeEventListener('codin-content-updated',update);window.removeEventListener('focus',update);};},[]);
 useEffect(()=>{const controller=new AbortController();(async()=>{
  const result=await Promise.allSettled(Object.entries(endpoints).map(async([key,path])=>{const r=await fetch(`/api/${path}`,{signal:controller.signal});if(!r.ok)throw Error(key);const body=await r.json();if(!Array.isArray(body[key]))throw Error(key);return [key,body[key].filter(publicRecord)] as const;}));
  if(controller.signal.aborted)return;
  const next={...empty},failed:string[]=[];result.forEach((r,i)=>{if(r.status==='fulfilled')next[r.value[0]]=[...r.value[1]];else failed.push(Object.keys(endpoints)[i]);});
  // Keep residential projections available to the Events directory; the activity builder deduplicates them.
  setData(next);setErrors(failed);setLoading(false);
 })();return()=>controller.abort();},[user?.token,revision]);
 const effectiveData={...data,items:data.items.filter(item=>isNoticeVisible(item,now)),projects:data.projects.map(p=>({...p,storedStatus:p.storedStatus||p.status,status:projectStatus(p,now)})),courses:data.courses.map(c=>({...c,storedStatus:c.storedStatus||c.status,status:getEffectiveStatus(c,now)})),events:data.events.map(e=>({...e,storedStatus:e.storedStatus||e.status,status:getEffectiveStatus(e,now)}))};
 return <DataContext.Provider value={{data:effectiveData,loading,errors,refresh:()=>setRevision(x=>x+1)}}>{children}</DataContext.Provider>;
}
export const useSiteData=()=>useContext(DataContext);
export function useActivities(){
 const {data}=useSiteData();
 return buildActivities(data,coursePath);
}
