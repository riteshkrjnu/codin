import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import type { NavigationItem } from './navigation';

export default function SiteNavigation({ items }: { items: NavigationItem[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const location = useLocation();
  useLayoutEffect(() => { setExpanded(null); setMobileOpen(false); }, [location.pathname, location.search, location.hash]);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) { setExpanded(null); setMobileOpen(false); } };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);
  return <div className="site-navigation" ref={ref} onKeyDown={event => {
    if (event.key === 'Escape') {
      if (expanded) { triggers.current[expanded]?.focus(); setExpanded(null); }
      else { setMobileOpen(false); ref.current?.querySelector<HTMLButtonElement>('.navigation-toggle')?.focus(); }
      event.stopPropagation();
    }
  }} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setExpanded(null);
  }}>
    <button className="navigation-toggle" aria-expanded={mobileOpen} aria-controls="website-navigation" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? 'Close menu' : 'Menu'}</button>
    <nav id="website-navigation" className={`main-nav restored-navigation ${mobileOpen ? 'navigation-open' : ''}`} aria-label="Website">
      {items.map((item, index) => {
        const id = `navigation-panel-${index}`;
        return item.groups ? <div className={`navigation-item ${item.mega ? 'navigation-mega' : ''}`} key={item.label}>
          <button ref={node => { triggers.current[item.label] = node; }} aria-expanded={expanded === item.label} aria-controls={id} aria-current={location.pathname===item.href||location.pathname.startsWith(item.href+'/')?'true':undefined}
            onClick={() => setExpanded(expanded === item.label ? null : item.label)}
            onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setExpanded(item.label); requestAnimationFrame(() => document.getElementById(id)?.querySelector<HTMLAnchorElement>('a')?.focus()); } }}>
            {item.label}<span aria-hidden="true">⌄</span>
          </button>
          <div id={id} className="navigation-panel" hidden={expanded !== item.label}>
            <Link className="navigation-overview" to={item.href}>Explore {item.label} →</Link>
            <div className="navigation-groups">{item.groups.map(group => <section key={group.label}>
              {item.mega && <h2><Link to={`/projects?status=${group.label}`}>{group.label}</Link></h2>}
              {group.links.map(link => <Link key={link.href} to={link.href} aria-current={location.pathname===link.href.split('?')[0]?'page':undefined}><strong>{link.label}</strong>{link.description && <small>{link.description}</small>}</Link>)}
              {item.mega && !group.links.length && <p>No {group.label.toLowerCase()} projects.</p>}
            </section>)}</div>
          </div>
        </div> : <NavLink key={item.label} to={item.href} end={item.href === '/'}>{item.label}</NavLink>;
      })}
    </nav>
  </div>;
}
