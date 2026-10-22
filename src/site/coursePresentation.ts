import type { RecordData } from './data';

export const isResidentialCourse=(record:RecordData)=>/residential/i.test(record.type||'');
export function courseOverviewPages(record: RecordData) {
  const pages=[...(record.subPages||[])];
  if(pages.some(p=>p.type==='course_overview'))return pages;
  const topics=Array.isArray(record.curriculum)&&record.curriculum.length?record.curriculum:Array.isArray(record.outline)&&record.outline.length?record.outline:record.modulesList||[];
  let slug='course-overview',suffix=2;while(pages.some(p=>p.slug===slug))slug=`course-overview-${suffix++}`;
  const overview={slug,title:'Course overview',type:'course_overview',content:{description:record.tagline||record.description||'',modules:topics.map((topic:any)=>typeof topic==='string'?{title:topic,description:''}:{title:topic.title||'',description:topic.description||''})}};
  pages.splice(Math.min(1,pages.length),0,overview);
  return pages;
}
