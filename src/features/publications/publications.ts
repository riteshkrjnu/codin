export type Publication = {
  title: string; year?: string; citationCount?: number; link?: string;
  authors?: string; venue?: string; scholar: boolean;
};
const text = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const safeLink = (value: unknown) => /^https?:\/\//i.test(text(value)) ? text(value) : undefined;

/** Accept legacy citation strings and imported records without changing stored data. */
export function normalizePublications(manual: unknown = [], synced: unknown = []): Publication[] {
  const list: Publication[] = [];
  const add = (entry: unknown, scholar: boolean) => {
    if (!entry) return;
    let publication: Publication;
    if (typeof entry === 'string') {
      const markdownLink = entry.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      const url = entry.match(/https?:\/\/[^\s<>]+/);
      const year = entry.match(/\b((?:19|20)\d{2})\b/)?.[1];
      const citations = entry.match(/\[Citations:\s*(\d+)\]/i)?.[1];
      const title = entry.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '$1')
        .replace(/\[Citations:\s*\d+\]/gi, '').replace(/\((?:19|20)\d{2}\)/g, '')
        .replace(/https?:\/\/[^\s<>]+/g, '').trim();
      publication = { title, year, citationCount: citations === undefined ? undefined : Number(citations), link: safeLink(markdownLink?.[2] || url?.[0]), scholar };
    } else if (typeof entry === 'object') {
      const value = entry as Record<string, unknown>;
      publication = { title: text(value.title || value.name || value.citation), year: text(value.year) || undefined,
        authors: text(value.authors) || undefined, venue: text(value.venue || value.journal) || undefined,
        link: safeLink(value.link || value.url || (value.doi ? `https://doi.org/${text(value.doi)}` : '')),
        citationCount: value.citationCount != null && Number.isFinite(Number(value.citationCount)) ? Number(value.citationCount) : undefined, scholar };
    } else return;
    if (!publication.title) return;
    const duplicate = list.find(item => item.title.toLocaleLowerCase().replace(/\W/g, '') === publication.title.toLocaleLowerCase().replace(/\W/g, ''));
    if (duplicate) {
      for (const field of ['year', 'citationCount', 'link', 'authors', 'venue'] as const) {
        if (publication[field] !== undefined) Object.assign(duplicate, { [field]: publication[field] });
      }
      duplicate.scholar ||= scholar;
    } else list.push(publication);
  };
  if (Array.isArray(manual)) manual.forEach(entry => add(entry, false));
  if (Array.isArray(synced)) synced.forEach(entry => add(entry, true));
  return list.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
}
