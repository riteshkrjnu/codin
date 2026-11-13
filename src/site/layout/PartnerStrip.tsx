import type { RecordData } from '../data';
import OrganisationLinks from './OrganisationLinks';

/** Separate credit groups share a compact row, wrapping only when space requires it. */
export default function PartnerStrip({partners}: {partners:{collaborators:RecordData[];funding:RecordData[];support:RecordData[]}}) {
  const groups=[
    {title:'Organisers & collaborators',items:partners.collaborators},
    {title:'Sponsors & funders',items:partners.funding},
    {title:'Supporting partners',items:partners.support},
  ].filter(group=>group.items.length);
  if(!groups.length)return null;
  return <div className="record-partner-strip">{groups.map(group=><section className="partner-strip-group" key={group.title} aria-label={group.title}><h2>{group.title}</h2><OrganisationLinks items={group.items}/></section>)}</div>;
}
