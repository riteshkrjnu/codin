import { useId, useMemo, useState } from 'react';
import type { Publication } from './publications';
import './publications.css';

export default function PublicationList({ items }: { items: Publication[] }) {
  const [query, setQuery] = useState('');
  const [year, setYear] = useState('all');
  const id = useId();
  const years = [...new Set(items.map(item => item.year).filter(Boolean))].sort().reverse();
  const visible = useMemo(() => items.filter(item => (year === 'all' || item.year === year) &&
    `${item.title} ${item.authors || ''} ${item.venue || ''}`.toLowerCase().includes(query.trim().toLowerCase())), [items, query, year]);
  return <div className="publication-list">
    <div className="publication-tools">
      <label htmlFor={`${id}-search`}>Search publications<input id={`${id}-search`} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Title, author or journal"/></label>
      <label htmlFor={`${id}-year`}>Year<select aria-label="Year" id={`${id}-year`} value={year} onChange={event => setYear(event.target.value)}><option value="all">All years</option>{years.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </div>
    <p className="publication-count" role="status">{visible.length} of {items.length} publications</p>
    <ol className="publication-records">{visible.map((item, index) => <li key={`${item.title}-${index}`}>
      <div className="publication-year">{item.year || 'Undated'}</div>
      <div className="publication-citation">
        <h4>{item.link ? <a href={item.link} target="_blank" rel="noreferrer">{item.title}<span className="publication-link-mark" aria-hidden="true"> ↗</span></a> : item.title}</h4>
        {item.authors && <p>{item.authors}</p>}{item.venue && <p className="publication-venue">{item.venue}</p>}
        <div className="publication-meta">{item.citationCount !== undefined && <span>{item.citationCount} citations</span>}{item.scholar && <span>Google Scholar</span>}</div>
      </div>
    </li>)}</ol>
    {!visible.length && <p className="publication-empty">{items.length ? 'No publications match these filters.' : 'No publications listed yet.'}</p>}
  </div>;
}
