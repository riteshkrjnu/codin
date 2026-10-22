import { RecordData, publicRecord, safeUrl } from './data';
export function resourceLibrary(data:Record<string,RecordData[]>){
 const result=[...data.resources];
 for(const p of data.projects)if(publicRecord(p)&&safeUrl(p.outputUrl)&&!result.some(r=>r.url===p.outputUrl))result.push({slug:`project-${p.slug}`,title:p.outputLabel||`${p.title}: resources`,description:p.description,kind:'Project output',url:p.outputUrl,image:p.image,associatedProjects:[p.slug],associatedCentres:p.associatedCentres,publishedAt:p.updatedAt});
 for(const c of data.centres)for(const p of c.publications||[]){if(!safeUrl(p.link)||result.some(r=>r.url===p.link))continue;let hash=0;for(const ch of p.link)hash=(hash*31+ch.charCodeAt(0))|0;result.push({slug:`centre-${c.slug}-${Math.abs(hash)}`,title:p.title,description:p.journal,authors:p.authors,kind:'Publication',url:p.link,associatedCentres:[c.slug],publishedAt:p.year});}
 return result;
}
