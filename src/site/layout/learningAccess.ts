/** UI context only; enrollment and permissions remain with the existing LMS controller. */
export const learningHref = (slug: string, kind: string, origin?: string) => `/academy/online/${encodeURIComponent(slug)}?learn=1${kind==='event'?'&context=event':origin?'&context=course':''}${origin?`&from=${encodeURIComponent(origin)}`:''}`;
export const learningLabel = (kind: string) => kind==='event'?'Access Materials':'Open LMS';
