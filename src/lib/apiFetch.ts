import { apiUrl } from './apiUrl';
/** Compatibility transport while legacy editors move to field-specific APIs. */
const records = new Map<string, any>();
function remember(value: any, kind?: string) {
  if (Array.isArray(value)) { value.forEach(item => remember(item,kind)); return; }
  if (!value || typeof value !== 'object') return;
  if (value.slug && value._id && Number.isInteger(value.__v) && Array.isArray(value.modulesList) && !('tag' in value)) {
    records.set(String(value._id), structuredClone(value));
    if (kind) records.set(`${kind}:${value.slug}`, structuredClone(value));
  } else Object.values(value).forEach(item => remember(item,kind));
}
export function moduleDiff(previous: any[] = [], next: any[] = []) {
  const ops: any[] = [];
  const same = (a: any, b: any) => String(a._id) === String(b._id);
  for (const old of previous) if (!next.some(n => same(old,n))) ops.push({ type: 'module.remove', moduleId: old._id });
  for (const mod of next) {
    const old = previous.find(m => same(m,mod));
    if (!old) ops.push({ type: 'module.add', value: mod });
    else if (old.title !== mod.title || old.description !== mod.description) ops.push({ type: 'module.update', moduleId: mod._id, value: { title: mod.title, description: mod.description } });
    for (const mat of old?.materials || []) if (!(mod.materials || []).some((m: any) => same(m,mat))) ops.push({ type: 'material.remove', moduleId: mod._id, materialId: mat._id });
    for (const mat of mod.materials || []) {
      const previousMat = old?.materials?.find((m: any) => same(m,mat));
      if (!previousMat) ops.push({ type: 'material.add', moduleId: mod._id, value: mat });
      else if (JSON.stringify(previousMat) !== JSON.stringify(mat)) ops.push({ type: 'material.update', moduleId: mod._id, materialId: mat._id, value: mat });
    }
  }
  return ops;
}
export function installApiTransport() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);
    if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/')) return nativeFetch(input,init);
    const options: RequestInit = { ...init, headers: new Headers(init?.headers || (input instanceof Request ? input.headers : undefined)) };
    const headers = options.headers as Headers;
    let stored: any;
    try { stored = JSON.parse(localStorage.getItem('lms_user') || 'null'); } catch { /* ignore invalid local preferences */ }
    if (stored?.token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${stored.token}`);
    const method = (options.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const match = url.pathname.match(/^\/api\/(?:lms\/)?(courses|events)\/([^/]+)$/);
    let target = url.pathname + url.search;
    if (match && ['PUT','PATCH','DELETE'].includes(method)) {
      if (input instanceof Request && init?.body === undefined && input.body) options.body = await input.clone().text();
      const id = decodeURIComponent(match[2]);
      const baseline = records.get(`${match[1]}:${id}`) || records.get(id);
      const payload = typeof options.body === 'string' ? JSON.parse(options.body) : {};
      payload.__v ??= baseline?.__v;
      if (method !== 'DELETE' && Array.isArray(payload.modulesList) && Object.keys(payload).every(k => ['modulesList','modules','outline','__v'].includes(k))) {
        options.method = 'POST';
        target = `${url.pathname}/lms${url.search}`;
        options.body = JSON.stringify({ __v: payload.__v, operations: moduleDiff(baseline?.modulesList, payload.modulesList) });
      } else options.body = JSON.stringify(payload);
      headers.set('Content-Type','application/json');
    }
    // Preserve Request bodies, signals and credentials while moving API calls to the API host.
    const outgoing = input instanceof Request ? new Request(apiUrl(target), input) : apiUrl(target);
    const response = await nativeFetch(outgoing, { ...options, credentials: 'include' });
    if (response.headers.get('content-type')?.includes('application/json')) {
      const body = await response.clone().json();
      if (response.ok) remember(body, url.pathname.match(/\/(?:admin\/)?(courses|events)(?:\/|$)/)?.[1]);
      if ([409,428].includes(response.status)) window.dispatchEvent(new CustomEvent('codin-save-conflict', { detail: body.error }));
    }
    if (response.ok && ['POST','PUT','PATCH','DELETE'].includes(method) &&
        /^\/api\/(?:lms\/)?(?:courses|events|projects|people|centres|resources|announcements|w2m-notifications)(?:\/|$)/.test(url.pathname)) {
      window.dispatchEvent(new CustomEvent('codin-content-updated'));
    }
    return response;
  };
}
