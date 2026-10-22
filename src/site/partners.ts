import type { RecordData } from './data';

/** Combine credits without writing derived relationships back into content records. */
export function mergeOrganisations(items: RecordData[]) {
  const rows=new Map<string,RecordData>();
  for(const item of items) {
    if(!item || (!item.name && !item.logo))continue;
    const key=String(item.name||item.website||item.url||item.logo).trim().toLocaleLowerCase().replace(/\s+/g,' '), previous=rows.get(key);
    rows.set(key,{...previous,...item,name:previous?.name||item.name,logo:item.logo||previous?.logo,website:item.website||item.url||item.link||previous?.website});
  }
  return [...rows.values()];
}
export function recordPartners(record: RecordData) {
  const funding=[...(record.fundingAgencies||[]),...(record.sponsors||[])];
  return {
    funding:mergeOrganisations(funding.length?funding:record.fundingAgency?[{name:record.fundingAgency}]:[]),
    collaborators:mergeOrganisations(record.collaborators?.length?record.collaborators:record.collaboratingAgency?[{name:record.collaboratingAgency}]:[]),
    support:mergeOrganisations(record.supportingAgencies||[]),
  };
}
export function centrePartners(centre: RecordData, data: Record<string,RecordData[]>) {
  const published=(r:RecordData)=>!r.deleted&&!['Draft','Trash'].includes(r.status)&&r.publicationState!=='draft';
  const projects=(data.projects||[]).filter(p=>published(p)&&((centre.projects||[]).includes(p.slug)||p.associatedCentres?.includes(centre.slug)));
  const slugs=new Set(projects.map(p=>p.slug));
  const activities=[...(data.events||[]),...(data.courses||[])].filter(e=>published(e)&&(e.associatedCentres?.includes(centre.slug)||(centre.events||[]).includes(e.slug)||(centre.courses||[]).includes(e.slug)||e.associatedProjects?.some((slug:string)=>slugs.has(slug))));
  const groups=[centre,...projects,...activities].map(recordPartners);
  return {funding:mergeOrganisations(groups.flatMap(g=>g.funding)),collaborators:mergeOrganisations(groups.flatMap(g=>g.collaborators)),support:mergeOrganisations(groups.flatMap(g=>g.support))};
}
