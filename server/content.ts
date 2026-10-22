import crypto from 'node:crypto';
export class ContentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
/** Metadata submissions can never replace the LMS tree, including inside eventDetails. */
export function metadataPatch(input: any, allowed: Set<string>) {
  const patch: any = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (allowed.has(key) && value !== undefined && !key.startsWith('$') && !key.includes('.')) patch[key] = value;
  }
  return patch;
}
export function mergeLegacyModules(existing: any[] = [], incoming: any[] = []) {
  // Page editors send lossy projections. Only explicit LMS operations may remove content.
  const result = structuredClone(existing);
  for (const mod of incoming) {
    if (!mod || !mod._id) continue;
    const old = result.find(m => String(m._id) === String(mod._id));
    if (old) { if (mod.title !== undefined) old.title = mod.title; if (mod.description !== undefined) old.description = mod.description; }
    else result.push({ ...mod, materials: Array.isArray(mod.materials) ? mod.materials : [] });
  }
  return result;
}
export function applyModuleOperations(existing: any[], operations: any[]) {
  if (!Array.isArray(operations) || operations.length > 500) throw new ContentError(400, 'Expected at most 500 LMS operations');
  const modules = structuredClone(existing || []).map((m: any) => ({ ...m, materials: Array.isArray(m.materials) ? m.materials : [] }));
  for (const op of operations) {
    if (op.type === 'module.add') {
      const value = { ...op.value, _id: op.value?._id || crypto.randomUUID(), materials: [] };
      if (!value.title || modules.some(m => String(m._id) === String(value._id))) throw new ContentError(400, 'Module title and unique ID required');
      modules.push(value); continue;
    }
    const index = modules.findIndex(m => String(m._id) === String(op.moduleId));
    if (index < 0) throw new ContentError(404, 'Module not found');
    const mod = modules[index];
    if (op.type === 'module.remove') { modules.splice(index, 1); continue; }
    if (op.type === 'module.update') { Object.assign(mod, metadataPatch(op.value, new Set(['title', 'description']))); continue; }
    if (op.type === 'material.add') {
      const value = { ...op.value, _id: op.value?._id || crypto.randomUUID() };
      if (!value.title || !value.type || mod.materials.some((m: any) => String(m._id) === String(value._id))) throw new ContentError(400, 'Material title, type and unique ID required');
      mod.materials.push(value); continue;
    }
    const mi = mod.materials.findIndex((m: any) => String(m._id) === String(op.materialId));
    if (mi < 0) throw new ContentError(404, 'Material not found');
    if (op.type === 'material.remove') mod.materials.splice(mi, 1);
    else if (op.type === 'material.update') Object.assign(mod.materials[mi], metadataPatch(op.value, new Set(['title','type','group','url','driveFileId','date','endDate','text','youtubeVideoId','streamKey','rtmpUrl','streamingMode'])));
    else throw new ContentError(400, 'Unknown LMS operation');
  }
  return modules;
}
