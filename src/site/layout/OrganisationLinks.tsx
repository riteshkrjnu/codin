import { useState } from 'react';
import { safeUrl, type RecordData } from '../data';
import { SmartLink } from '../ui';
import { mergeOrganisations } from '../partners';

function Organisation({ item, showNames }: { item: RecordData; key?: string; showNames?: boolean }) {
  const [failed, setFailed] = useState(false);
  const url = item.website || item.url || item.link;
  const href = safeUrl(url) || (url && /^[\w.-]+\.[a-z]{2,}(?:\/|$)/i.test(url) ? `https://${url}` : undefined);
  const label=[item.name,item.role].filter(Boolean).join(' · ');
  const name=<span>{item.name}{showNames&&item.role&&<small>{item.role}</small>}</span>;
  return <SmartLink className={`organisation-tile${showNames?' organisation-named':''}`} to={href} title={label}>
    {item.logo && !failed ? <><img src={item.logo} alt={showNames?'':label || 'Organisation'} loading="lazy" onError={()=>setFailed(true)}/>{showNames&&name}</> : name}
  </SmartLink>;
}
export default function OrganisationLinks({ items, showNames=false }: { items: RecordData[]; showNames?: boolean }) {
  return <div className="organisation-grid">{mergeOrganisations(items).map((item,i)=><Organisation key={`${item.name}-${item.logo}-${i}`} item={item} showNames={showNames}/>)}</div>;
}
