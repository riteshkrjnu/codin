import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useSearchParams } from 'react-router-dom';

export type RecordSection = { slug: string; title: string; preview?: string; type?: string; [key: string]: any };
function preview(section: RecordSection) {
  const c=section.content;
  if(Array.isArray(c))return `${c.length} entries${c[0]?.name?' · '+c[0].name:''}`;
  if(section.type==='logistics' && c && !Array.isArray(c))return c.venue || Object.keys(c).join(' · ');
  if(c?.scheduleDays?.length)return `${c.scheduleDays.length} programme days · Sessions and speakers`;
  const text=section.preview || (typeof c==='string'?c:c?.teaser||c?.markdown||c?.description||'');
  return text ? text.replace(/<[^>]*>/g,'').replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[#*`]/g,'').slice(0,150) : 'Read the details and explore this section.';
}
type Props<T extends RecordSection> = {
  key?: string;
  title: string; sections: T[]; renderSection: (section: T) => ReactNode;
  glance?: ReactNode; mode?: 'atlas' | 'notebook'; activeSection?: string;
  onActiveSectionChange?: (slug: string) => void;
};

/** Controllers supply actual panels/actions; this component owns navigation, progressive mounting and motion only. */
export default function RecordExperience<T extends RecordSection>({ title, sections: suppliedSections, renderSection, glance, mode = 'atlas', activeSection, onActiveSectionChange }: Props<T>) {
  // Legacy records can repeat a built-in slug in custom sections. Keep both reachable without rewriting records.
  const occurrences = new Map<string, number>();
  const sections = suppliedSections.map(supplied => {
    // MongoDB can omit empty objects. Legacy panels expect their content container to exist.
    const section = supplied.content == null ? { ...supplied, content: ['list','dates','contact','logistics','committees'].includes(supplied.type || '') ? [] : {} } : supplied;
    const count = (occurrences.get(section.slug) || 0) + 1; occurrences.set(section.slug, count);
    return count === 1 ? section : { ...section, slug: `${section.slug}--${count}`, sourceSlug: section.slug };
  });
  const [params, setParams] = useSearchParams(), location = useLocation(), labelId = useId();
  const requested = params.get('section') || params.get('tab') || (params.get('participate') === '1' ? sections.find(s => s.type === 'registration')?.slug : '');
  const initial = sections.find(s => s.slug === requested)?.slug || sections[0]?.slug || '';
  const [active, setActive] = useState(initial), [visited, setVisited] = useState<Set<string>>(() => new Set([initial]));
  const [hasOpened, setHasOpened] = useState(mode === 'notebook' || !!requested);
  const [open, setOpen] = useState(mode === 'notebook' || !!requested);
  const root = useRef<HTMLDivElement>(null), chapters = useRef(new Map<string, HTMLElement>()), source = useRef<HTMLElement | null>(null);
  const latest = useRef({ sections, active, params, onActiveSectionChange }); latest.current = { sections, active, params, onActiveSectionChange };
  const closing = useRef(false), frame = useRef(0), pending = useRef<string | null>(initial), suppress = useRef(false), lastController = useRef(activeSection);
  const animation = useRef<Animation[]>([]), surface = useRef<HTMLDivElement>(null), content = useRef<HTMLDivElement>(null);
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mount = useCallback((slug: string) => setVisited(old => old.has(slug) ? old : new Set([...old, slug])), []);
  const updateURL = useCallback((slug: string | null, replace = false) => {
    setParams(previous => { const next = new URLSearchParams(previous); if (slug) { next.set('section', slug); if(next.has('tab')) next.set('tab',slug); } else { next.delete('section'); next.delete('tab'); next.delete('participate'); } return next; }, { replace, preventScrollReset: true });
  }, [setParams]);
  const activate = useCallback((slug: string, replace = false) => {
    setActive(slug); latest.current.onActiveSectionChange?.(slug); updateURL(slug, replace);
  }, [updateURL]);
  const jump = useCallback((slug: string, writeURL = true) => {
    if (!latest.current.sections.some(s => s.slug === slug)) return;
    pending.current = slug; suppress.current = true; mount(slug); setHasOpened(true); setOpen(true);
    setActive(slug); if (writeURL) activate(slug);
  }, [mount, activate]);
  useEffect(() => {
    if (requested && sections.some(s => s.slug === requested)) {
      if (requested !== active || !open) jump(requested, false);
    } else if (mode === 'atlas') setOpen(false);
  }, [requested, mode]);
  useEffect(() => {
    if (activeSection !== lastController.current) {
      lastController.current = activeSection;
      if (activeSection && activeSection !== active) jump(activeSection);
    }
  }, [activeSection, active, jump]);
  useLayoutEffect(() => {
    if (!open || !pending.current) return;
    const slug = pending.current, el = chapters.current.get(slug); if (!el) return;
    const raf = requestAnimationFrame(() => {
      const header = root.current?.querySelector('.record-reader-toolbar')?.getBoundingClientRect().height || 0;
      root.current?.style.setProperty('--reader-toolbar-height', `${header}px`);
      const offset = header + (innerWidth <= 1100 ? 95 : 24);
      if (mode === 'atlas' && root.current) root.current.scrollTop += el.getBoundingClientRect().top - root.current.getBoundingClientRect().top - offset;
      else if (requested || pending.current !== initial) window.scrollBy({ top: el.getBoundingClientRect().top - offset - 120, behavior: 'instant' });
      pending.current = null; suppress.current = false;
    }); return () => cancelAnimationFrame(raf);
  }, [open, visited, active, mode]);
  useEffect(() => {
    if (!open) return;
    const scrollRoot = mode === 'atlas' ? root.current : window; if (!scrollRoot) return;
    const scan = () => {
      if (frame.current || suppress.current || closing.current) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = 0;
        // A route change may detach the reader before passive effect cleanup cancels this frame.
        if(mode==='atlas'&&!root.current)return;
        const top = mode === 'atlas' ? root.current!.getBoundingClientRect().top + (root.current!.querySelector('.record-reader-toolbar')?.getBoundingClientRect().height || 0) + (innerWidth <= 1100 ? 100 : 30) : 150;
        const bottom = innerHeight + 100;
        const items = latest.current.sections.map(s => ({ slug: s.slug, el: chapters.current.get(s.slug) })).filter(x => !!x.el);
        const next = items.find(x => !x.el!.dataset.loaded && x.el!.getBoundingClientRect().top < bottom && x.el!.getBoundingClientRect().bottom > top);
        if (next) mount(next.slug);
        const current = items.filter(x => x.el!.dataset.loaded && x.el!.getBoundingClientRect().top <= top).at(-1);
        if (current && current.slug !== latest.current.active) activate(current.slug, true);
      });
    };
    scrollRoot.addEventListener('scroll', scan, { passive: true }); window.addEventListener('resize', scan);
    const observer = new ResizeObserver(scan); if (content.current) observer.observe(content.current); scan();
    return () => { scrollRoot.removeEventListener('scroll', scan); window.removeEventListener('resize', scan); observer.disconnect(); cancelAnimationFrame(frame.current); frame.current = 0; };
  }, [open, mode, mount, activate]);
  useEffect(() => {
    if (!open || mode !== 'atlas') return;
    const previous = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const target = root.current!, card = source.current;
    if(!source.current)source.current=document.querySelector<HTMLElement>(`[data-record-section="${CSS.escape(active)}"]`);
    root.current?.querySelector<HTMLButtonElement>('[data-close-reader]')?.focus({ preventScroll: true });
    if (card && target && surface.current && content.current && !reduced()) {
      const a = card.getBoundingClientRect(), b = target.getBoundingClientRect();
      animation.current = [surface.current.animate([{ transform: `translate(${a.x-b.x}px,${a.y-b.y}px) scale(${a.width/b.width},${a.height/b.height})` }, { transform: 'none' }], { duration: 350, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'both' }), content.current.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 230, delay: 120, fill: 'both' })];
    }
    return () => { document.body.style.overflow = previous; animation.current.forEach(a => a.cancel()); animation.current = []; };
  }, [open, mode]);
  useEffect(() => { const print = () => setVisited(new Set(latest.current.sections.map(s => s.slug))); window.addEventListener('beforeprint', print); return () => window.removeEventListener('beforeprint', print); }, []);
  const close = async () => {
    if (closing.current) return; closing.current = true;
    if (root.current && surface.current && content.current && source.current && !reduced()) {
      const transform = getComputedStyle(surface.current).transform, opacity = getComputedStyle(content.current).opacity;
      animation.current.forEach(a => a.cancel()); const a = source.current.getBoundingClientRect(), b = root.current!.getBoundingClientRect();
      animation.current = [surface.current.animate([{ transform, opacity: 1 }, { transform: `translate(${a.x-b.x}px,${a.y-b.y}px) scale(${a.width/b.width},${a.height/b.height})`, opacity: 0 }], { duration: 300, fill: 'both' }), content.current.animate([{ opacity }, { opacity: 0 }], { duration: 130, fill: 'both' })];
      await Promise.all(animation.current.map(a => a.finished.catch(() => {})));
    }
    setOpen(false); updateURL(null); closing.current = false; source.current?.focus({ preventScroll: true });
  };
  const reader = <div ref={root} hidden={!open} className={`record-reader ${mode === 'atlas' ? 'record-reader-expanded functional-page' : 'record-reader-notebook'}`} role={mode === 'atlas' ? 'dialog' : undefined} aria-modal={mode === 'atlas' ? true : undefined} aria-labelledby={labelId} onKeyDown={e => {
    // Nested forms/auth dialogs retain ownership of their keyboard handling.
    if (e.key === 'Escape' && !e.defaultPrevented && e.target === document.activeElement && mode === 'atlas') { e.stopPropagation(); close(); }
    if (e.key === 'Tab' && mode === 'atlas') { const focusable = [...root.current!.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex="0"]')].filter(el => !el.closest('[hidden]') && !el.hasAttribute('disabled')); const first = focusable[0], last = focusable.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
  }}>
    {mode === 'atlas' && <div className="record-reader-surface" ref={surface} aria-hidden="true"/>}
    <div className="record-reader-content" ref={content}>
      {mode === 'atlas' && <header className="record-reader-toolbar"><div><p>{title}</p><h2 id={labelId}>{sections.find(s => s.slug === active)?.title}</h2></div><div><a href={`${location.pathname}?${params}`}>Section link ↗</a><button data-close-reader onClick={close}>Close to Atlas ×</button></div></header>}
      <div className="record-notebook-layout">
        <nav className="record-contents" aria-label="Page sections">{sections.map((s, i) => <a key={s.slug} href={`?${new URLSearchParams({ ...Object.fromEntries(params), section: s.slug })}`} aria-current={active === s.slug ? 'location' : undefined} onClick={e => { e.preventDefault(); jump(s.slug); }}><span>{String(i + 1).padStart(2, '0')}</span>{s.title}</a>)}</nav>
        <label className="record-section-select">Go to section<select value={active} onChange={e => jump(e.target.value)}>{sections.map(s => <option key={s.slug} value={s.slug}>{s.title}</option>)}</select></label>
        <div className="record-chapters">{sections.map(s => <section key={s.slug} ref={el => { if (el) chapters.current.set(s.slug, el); else chapters.current.delete(s.slug); }} data-loaded={visited.has(s.slug) ? 'true' : undefined} className="record-chapter" aria-label={s.title}>
          <h2 id={mode === 'notebook' && s.slug === initial ? labelId : undefined}>{s.title}</h2>{visited.has(s.slug) ? renderSection(s) : <div className="record-chapter-preview"><p>{s.preview || 'Continue reading this section.'}</p><button onClick={() => jump(s.slug)}>Read section ↓</button></div>}
        </section>)}</div>
        {glance && <aside className="record-glance"><details open={typeof window === 'undefined' || window.innerWidth > 950}><summary>At a glance</summary><div>{glance}</div></details></aside>}
      </div>
    </div>
  </div>;
  return <div className="record-experience">{mode === 'atlas' && <div className={`record-atlas ${sections.length<=3?'record-atlas-compact':''}`} aria-label="Explore sections">{sections.map((s, i) => <button key={s.slug} data-record-section={s.slug} className={`record-atlas-card tone-${i % 4}`} aria-haspopup="dialog" onClick={e => { source.current = e.currentTarget; jump(s.slug); }}><small>{String(i + 1).padStart(2, '0')} / Explore</small><h2>{s.title}</h2><p>{preview(s)}</p><span>Open section ↗</span></button>)}</div>}{mode === 'atlas' ? hasOpened && createPortal(reader, document.querySelector('.codin-site') || document.body) : reader}</div>;
}
