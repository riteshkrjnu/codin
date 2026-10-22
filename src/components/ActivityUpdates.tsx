import { useActivities, dateLabel } from '../site/data';
import { activityTimestamp } from '../site/activityFeed';
import { SmartLink } from '../site/ui';
export default function ActivityUpdates({ kind, slug }: {kind:'project'|'centre';slug:string}) {
  const activities=useActivities();
  const items=activities.filter(item=>(kind==='project'?['announcement','publication','event'].includes(item.activityKind)&&item.associatedProjects?.includes(slug):item.associatedCentres?.includes(slug))).sort((a,b)=>(Number.isFinite(activityTimestamp(b))?activityTimestamp(b):0)-(Number.isFinite(activityTimestamp(a))?activityTimestamp(a):0));
  if(!items.length)return null;
  return <section className="dossier-subsection"><h2>Latest activity</h2><div className="dossier-records">{items.slice(0,6).map(item=><article key={item.activityKey}><div><p className="dossier-meta">{item.status}{item.date?` · ${dateLabel(item.date)}`:''}</p><h3><SmartLink to={item.link||item.actionLink}>{item.title} ↗</SmartLink></h3><p>{item.description}</p></div></article>)}</div></section>;
}
