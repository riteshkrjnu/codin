export function resolveConnections(resource:any,data:Record<string,any[]>){
 const result:{type:string;slug:string;via:string}[]=[];
 const add=(type:string,slug:string,via:string)=>{if(!result.some(x=>x.type===type&&x.slug===slug))result.push({type,slug,via});};
 for(const [field,type] of [['associatedProjects','project'],['associatedCentres','centre'],['associatedEvents','event'],['associatedCourses','course']])for(const slug of resource[field]||[])add(type,slug,'Direct connection');
 for(const item of [...result]){if(item.type==='event'&&data.courses?.some(r=>r.slug===item.slug))add('course',item.slug,'Shared event / course');if(item.type==='course'&&data.events?.some(r=>r.slug===item.slug&&r.isCourse))add('event',item.slug,'Shared event / course');}
 for(const item of [...result])if(['event','course'].includes(item.type)){
  const record=data[item.type==='event'?'events':'courses']?.find(r=>r.slug===item.slug);if(!record)continue;
  for(const p of record.associatedProjects||[])add('project',p,`Via ${record.title}`);
  for(const c of record.associatedCentres||[])add('centre',c,`Via ${record.title}`);
 }
 for(const item of [...result])if(item.type==='project'){
  const project=data.projects?.find(p=>p.slug===item.slug);
  for(const c of project?.associatedCentres||[])add('centre',c,`Via ${project.title}`);
  for(const c of data.centres||[])if(c.projects?.includes(item.slug))add('centre',c.slug,`Via ${project?.title||item.slug}`);
 }
 return result;
}
export function connectedResources(resources:any[],data:Record<string,any[]>,type:string,slug:string){return resources.filter(r=>resolveConnections(r,data).some(c=>c.type===type&&c.slug===slug)).sort((a,b)=>(Date.parse(b.publishedAt||b.createdAt)||0)-(Date.parse(a.publishedAt||a.createdAt)||0));}
