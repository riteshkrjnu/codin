import { Link } from 'react-router-dom';
import { coursePath, useSiteData } from '../../site/data';
import { resolveConnections } from './connections';
export default function ArticleConnections({resource}:{resource:any}){const {data}=useSiteData(),connections=resolveConnections(resource,data);return <div className="article-connections">{connections.map(c=>{const collection={project:'projects',centre:'centres',event:'events',course:'courses'}[c.type],record=data[collection!]?.find(r=>r.slug===c.slug);if(!record)return null;return <article key={`${c.type}:${c.slug}`}><span className="eyebrow">{c.type} · {c.via}</span><h3><Link to={c.type==='course'?coursePath(record):`/${collection}/${c.slug}`}>{record.title||record.name} ↗</Link></h3></article>;})}</div>;}
