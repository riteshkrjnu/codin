import { navigation } from '../../data/config';
import { getProjectStatus } from '../../lib/courseStatus';
import type { RecordData } from '../data';

export type NavigationLink = { label: string; href: string; description?: string };
export type NavigationGroup = { label: string; links: NavigationLink[] };
export type NavigationItem = { label: string; href: string; groups?: NavigationGroup[]; mega?: boolean };

/** Menu content is separate from presentation and uses the same lifecycle as the feed. */
export function buildNavigation(centres: RecordData[], projects: RecordData[]): NavigationItem[] {
  const items: NavigationItem[] = [{ label: 'Now', href: '/' }];
  for (const item of navigation) {
    if (item.isMegaMenu) {
      items.push({ label: item.label, href: '/projects', mega: true, groups: ['Ongoing', 'Upcoming', 'Completed'].map(status => ({
        label: status,
        links: projects.filter(p => {
          const state = getProjectStatus(p);
          return status === 'Completed' ? ['Completed', 'Archived', 'Suspended'].includes(state) : state === status;
        }).map(p => ({ label: p.title, href: `/projects/${encodeURIComponent(p.slug)}`, description: p.tag })),
      })) });
    } else if (item.children) {
      const href = item.label === 'W2M Academy' ? '/academy' : item.label === 'Centres' ? '/centres' : '/about';
      const links = item.label === 'Centres' && centres.length
        ? centres.map(c => ({ label: c.name, href: `/centres/${encodeURIComponent(c.slug)}`, description: c.tagline }))
        : item.children;
      items.push({ label: item.label, href, groups: [{ label: item.label, links }] });
    } else items.push({ label: item.label, href: item.href || '/' });
  }
  items.splice(items.findIndex(x => x.label === 'About'), 0, { label: 'CoDIN Commons', href: '/resources' });
  return items;
}
