import { resolveConnections } from '../features/writing/connections';
import type { RecordData } from './data';
import { getEffectiveStatus } from '../lib/courseStatus';
import { normalizePublications } from '../features/publications/publications';

/** Activities describe things happening around a project, rather than repeating its directory card. */
export function buildActivities(data: Record<string,RecordData[]>, courseLink: (record:RecordData)=>string) {
  const entries: RecordData[]=[];
  for(const course of data.courses)entries.push({...course,activityKey:`course:${course.slug}`,sourceId:course.slug,activityKind:'course',area:'w2m',status:getEffectiveStatus(course),date:course.startDate||course.updatedAt,sourceDate:course.startDate,link:courseLink(course)});
  for(const event of data.events) {
    if(event.isCourse&&data.courses.some(c=>c.slug===event.slug))continue;
    entries.push({...event,activityKey:`event:${event.slug}`,sourceId:event.slug,activityKind:'event',area:'events',status:getEffectiveStatus(event),date:event.startDate||event.updatedAt,sourceDate:event.startDate,link:`/events/${encodeURIComponent(event.slug)}${event.isCourse?'?isCourse=true':''}`});
  }
  for(const item of data.items) {
    if(item.isDynamic)continue;
    const link=String(item.link||item.actionLink||''), source=item.sourceId||link.split('?')[0].split('/').filter(Boolean).at(-1);
    const related=entries.find(e=>e.sourceId===source), project=data.projects.find(p=>p.slug===source&&(/project/i.test(item.category||'')||link.startsWith('/projects/')));
    const associatedProjects=[...new Set([...(item.associatedProjects||[]),...(related?.associatedProjects||[]),...(project?[project.slug]:[])])];
    const area=associatedProjects.length?'projects':related?.area||(/academy|w2m/i.test(item.category||'')?'w2m':/event/i.test(item.category||'')?'events':'general');
    entries.push({...item,activityKey:`notice:${item.sourceCollection||'announcements'}:${item._id}`,activityKind:'announcement',area,associatedProjects,status:getEffectiveStatus(item),link:item.link||item.actionLink||related?.link||`/notices/${encodeURIComponent(item._id)}`,date:item.date||item.publishAt||item.updatedAt});
  }
  for(const resource of data.resources)entries.push({...resource,associatedProjects:resolveConnections(resource,data).filter(c=>c.type==='project').map(c=>c.slug),associatedCentres:resolveConnections(resource,data).filter(c=>c.type==='centre').map(c=>c.slug),activityKey:`publication:${resource.slug}`,activityKind:'publication',area:'resources',status:'Published',date:resource.publishedAt||resource.date,link:`/resources/${encodeURIComponent(resource.slug)}`});
  for(const project of data.projects)for(const [i,pub] of normalizePublications(project.publications||[]).entries())entries.push({...pub,activityKey:`project-publication:${project.slug}:${i}`,activityKind:'publication',area:'resources',status:'Published',date:pub.year,associatedProjects:[project.slug],link:pub.link||`/projects/${encodeURIComponent(project.slug)}`});
  return entries.sort((a,b)=>Number(!!b.pinned||!!b.highlighted)-Number(!!a.pinned||!!a.highlighted)||(Number.isFinite(activityTimestamp(b))?activityTimestamp(b):0)-(Number.isFinite(activityTimestamp(a))?activityTimestamp(a):0));
}
export function activityTimestamp(record: RecordData) {
  const date=Date.parse(record.sourceDate||record.startDate||record.date||record.publishedAt);
  return Number.isFinite(date)?date:Infinity;
}
