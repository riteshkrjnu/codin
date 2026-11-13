import express from 'express';
import mongoose from 'mongoose';
import { applyModuleOperations, ContentError, metadataPatch, mergeLegacyModules } from './content';
import { dateBoundary, getEffectiveStatus, getProjectStatus, isNoticeVisible } from '../src/lib/courseStatus';
const metadataFields = new Set(['title','courseCode','slug','description','type','credits','fee','completedFee','duration','startDate','endDate','status','publicationState','lifecycle','registrationState','deleted','outline','hasMicrocert','microcertFee','certIds','linkedCerts','prerequisites','prerequisiteDiscounts','instructors','tas','dates','location','longDescription','image','associatedCentres','associatedPeople','associatedProjects','collaborators','sponsors','schedule','subPages','supportOfficeText','supportOfficeEmail','iteration','tagline','highlights','materials','curriculum','youtubeDesignatedChannel','presenters']);
const materialPermissions = ['edit_course_details','materials_add','materials_delete','classes_add','classes_delete'];
export function mayEdit(user: any, record: any, materials = false) {
  if (!user) return false;
  if (['admin','superadmin'].includes(user.role) || String(record.createdBy) === String(user._id)) return true;
  const member = [...(record.instructors || []), ...(record.tas || [])].find((i: any) => String(i.user) === String(user._id));
  return member && (materials ? materialPermissions : ['edit_course_details']).some(p => member.permissions?.includes(p));
}
export function installReliability(router: express.Router, auth: any, models: any, onUpdate: any) {
  const revisions = () => mongoose.connection.collection('contentRevisions');
  async function locate(kind: string, id: string) {
    const order = kind === 'courses' ? [models.Course, models.EventModel] : [models.EventModel, models.Course];
    for (const model of order) {
      const found = await model.findOne(mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { slug: id }).lean();
      if (found) return { model, found: found as any };
    }
    throw new ContentError(404, 'Activity not found');
  }
  async function commit(model: any, found: any, patch: any, expected: any, user: any, action: string) {
    if (!Number.isInteger(expected)) throw new ContentError(428, 'Reload this editor before saving: a revision is required. Your changes have not been saved.');
    if ((found.__v || 0) !== expected) throw new ContentError(409, 'This content changed in another editor. Keep your changes and reload a separate tab to compare.');
    // One transaction makes the audit snapshot and compare-and-swap indivisible.
    return mongoose.connection.transaction(async session => {
      await revisions().insertOne({ collection: model.collection.name, recordId: found._id, revision: expected, snapshot: found, actorId: user._id, action, createdAt: new Date() }, { session });
      const filter: any = { _id: found._id, ...(expected === 0 ? { $or: [{ __v: 0 }, { __v: { $exists: false } }] } : { __v: expected }) };
      const updated = await model.findOneAndUpdate(filter, { $set: { ...patch, updatedBy: user._id }, $inc: { __v: 1 } }, { new: true, runValidators: true, session }).lean();
      if (!updated) throw new ContentError(409, 'Another editor saved first. Your changes remain in this editor.');
      return updated;
    });
  }
  const route = (fn: any) => async (req: any, res: any) => {
    try { await fn(req, res); } catch (e: any) {
      const status = e.status || (e.name === 'ValidationError' || e.name === 'CastError' ? 400 : 500);
      res.status(status).json({ error: status === 500 ? 'Content operation failed; no partial save was committed.' : e.message });
    }
  };
  router.get('/impact', route(async (_req: any, res: any) => {
    const [projects, courses, events] = await Promise.all([mongoose.model('Project').countDocuments({ deleted: { $ne: true }, status: { $nin: ['Draft','Trash'] } }), models.Course.find({ deleted: { $ne: true }, status: { $ne: 'Draft' } }).lean(), models.EventModel.find({ deleted: { $ne: true }, status: { $ne: 'Draft' } }).lean()]);
    const activity = new Map([...events, ...courses].map((x: any)=>[x.slug,x]));
    res.json({ projects, programmes: courses.length, completedActivities: [...activity.values()].filter(x=>getEffectiveStatus(x)==='Completed').length, asOf: new Date().toISOString() });
  }));
  router.get('/activity-feed', route(async (_req: any, res: any) => {
    const [courses, events, notices, notifications, projects] = await Promise.all([models.Course.find({ deleted: { $ne: true } }).lean(), models.EventModel.find({ deleted: { $ne: true } }).lean(), models.Announcement.find({ deleted: { $ne: true } }).lean(), models.W2MNotification.find({ deleted: { $ne: true } }).lean(), mongoose.model('Project').find({ deleted: { $ne: true } }).lean()]);
    const activities = new Map<string, any>();
    for (const x of [...events, ...courses, ...projects] as any[]) {
      const project = projects.some((p: any) => String(p._id) === String(x._id));
      if ((project ? getProjectStatus(x) : getEffectiveStatus(x)) === 'Draft') continue;
      const course = courses.some((c: any) => String(c._id) === String(x._id));
      activities.set(project ? `project:${x.slug}` : x.slug, { _id: `activity-${project ? "project-" : ""}${x.slug}`, sourceId: x.slug, title: x.title, description: x.description, associatedProjects: project ? [x.slug] : x.associatedProjects || [], associatedCentres: x.associatedCentres || [], date: x.updatedAt || x.startDate, updatedAt: x.updatedAt, status: project ? getProjectStatus(x) : getEffectiveStatus(x), category: project ? 'Project' : course ? 'Academy' : 'Event', link: project ? `/projects/${x.slug}` : course ? `/academy/${/residential/i.test(x.type) ? 'residential' : 'online'}/${x.slug}` : `/events/${x.slug}`, isDynamic: true });
    }
    const items = new Map<string, any>(activities);
    for (const n of [...notices, ...notifications] as any[]) {
      if (!isNoticeVisible(n)) continue;
      const sourceId = n.sourceId || [...activities.values()].find(a => (n.link || n.actionLink || '').split(/[?#]/)[0].split('/').filter(Boolean).at(-1) === a.sourceId)?.sourceId;
      const projectLink = /^\/projects\//.test(n.link || n.actionLink || '');
      const linkedKey = sourceId && (projectLink && activities.has(`project:${sourceId}`) ? `project:${sourceId}` : activities.has(sourceId) ? sourceId : activities.has(`project:${sourceId}`) ? `project:${sourceId}` : undefined);
      const linked = linkedKey && activities.get(linkedKey);
      if (sourceId && !linked) continue;
      const sourceCollection = notifications.some((x: any) => String(x._id) === String(n._id)) ? 'w2mnotifications' : 'announcements';
      // Announcements are distinct dated updates, even when several point to one activity.
      items.set(`notice:${sourceCollection}:${n._id}`, { ...n, category: n.category || linked?.category, link: n.link || n.actionLink || linked?.link, associatedProjects: [...new Set([...(n.associatedProjects || []), ...(linked?.associatedProjects || [])])], associatedCentres: [...new Set([...(n.associatedCentres || []), ...(linked?.associatedCentres || [])])], sourceId: linked?.sourceId || sourceId, sourceCollection, activityKind: 'announcement', isDynamic: false });
    }
    res.json({ items: [...items.values()].sort((a, b) => Number(b.pinned || b.highlighted || false) - Number(a.pinned || a.highlighted || false) || (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)) });
  }));
  router.get('/admin/editorial', auth, route(async (req: any, res: any) => {
    if (!['admin','superadmin'].includes(req.user.role)) throw new ContentError(403, 'Admin required');
    const activities = [...await models.Course.find().lean(), ...await models.EventModel.find().lean()] as any[];
    const notices = [...await models.Announcement.find().lean(), ...await models.W2MNotification.find().lean()] as any[];
    res.json({ missingDates: activities.filter(x => !x.deleted && (!x.startDate || !x.endDate)), awaitingReports: activities.filter(x => !x.deleted && getEffectiveStatus(x) === 'Completed' && !(x.subPages || []).some((p: any) => /report|outcome/i.test(p.title || ''))), expiredNotices: notices.filter(x => !x.deleted && dateBoundary(x.expiresAt, true) !== undefined && dateBoundary(x.expiresAt, true)! < Date.now()) });
  }));
  router.all('/:kind(courses|events)/:id', (req, _res, next) => ['PUT','PATCH','DELETE'].includes(req.method) ? next() : next('route'), auth, route(async (req: any, res: any) => {
    // Installed using method-specific wrappers below, so public GETs use existing readers.
    const { model, found } = await locate(req.params.kind, req.params.id);
    if (!mayEdit(req.user, found)) throw new ContentError(403, 'Insufficient permissions');
    let patch: any;
    const expected = req.body?.__v ?? (req.get('If-Match') ? Number(req.get('If-Match').replaceAll('"', '')) : undefined);
    if (req.method === 'DELETE') {
      if (req.query.permanent === 'true') throw new ContentError(400, 'Permanent deletion is disabled. Use trash and revision history.');
      patch = { deleted: true };
    } else {
      patch = metadataPatch(req.body, metadataFields);
      const privileged = ['admin','superadmin'].includes(req.user.role) || String(found.createdBy) === String(req.user._id);
      if (!privileged) for (const field of ['instructors','tas','fee','completedFee','deleted','status','publicationState']) delete patch[field];
      if (req.body.registrationCard) patch.registrationCard = { ...(found.registrationCard || {}), ...metadataPatch(req.body.registrationCard, new Set(['title','description','buttonText','buttonLink','highlights','paymentMsgChoice','paymentMarkdown','paymentGatewayLink','paymentDeadline','actionPhases','fee','fees'])) };
      if (req.body.modulesList && mayEdit(req.user, found, true)) patch.modulesList = mergeLegacyModules(found.modulesList || found.eventDetails?.modulesList, req.body.modulesList);
      if (patch.status === 'Draft') patch.publicationState = 'draft';
      else if (patch.status === 'Archived' || patch.status === 'Closed') patch.publicationState = 'archived';
      else if (patch.status) { patch.publicationState = 'published'; patch.lifecycle = getEffectiveStatus({ status: patch.status }); }
      for (const field of ['startDate','endDate']) if (patch[field] && dateBoundary(patch[field], field === 'endDate') === undefined) throw new ContentError(400, 'Use a valid ISO date');
      if (patch.startDate && patch.endDate && dateBoundary(patch.endDate, true)! < dateBoundary(patch.startDate)!) throw new ContentError(400, 'End date must follow start date');
      // Stop eventDetails copies overriding the canonical root fields on reads.
      if (found.eventDetails) patch.eventDetails = { ...found.eventDetails, ...patch, modulesList: patch.modulesList || found.modulesList || found.eventDetails.modulesList };
    }
    const updated = await commit(model, found, patch, expected, req.user, req.method === 'DELETE' ? 'trash' : 'metadata');
    await onUpdate(found, updated, model).catch(() => console.error('Activity saved; participation sync requires retry'));
    res.json({ success: true, [req.params.kind === 'courses' ? 'course' : 'event']: updated });
  }));
  router.post('/:kind(courses|events)/:id/lms', auth, route(async (req: any, res: any) => {
    const { model, found } = await locate(req.params.kind, req.params.id);
    if (!mayEdit(req.user, found, true)) throw new ContentError(403, 'Materials permission required');
    const operations = req.body.operations;
    const member = [...(found.instructors || []), ...(found.tas || [])].find((i: any) => String(i.user) === String(req.user._id));
    const owner = ['admin','superadmin'].includes(req.user.role) || String(found.createdBy) === String(req.user._id);
    if (!owner && Array.isArray(operations) && operations.some((o: any) => o.type.endsWith('.remove')) && !member?.permissions?.some((p: string) => ['materials_delete','classes_delete','edit_course_details'].includes(p))) throw new ContentError(403, 'Delete permission required');
    const modulesList = applyModuleOperations(found.modulesList?.length ? found.modulesList : found.eventDetails?.modulesList || [], operations);
    const patch: any = { modulesList, modules: modulesList.length, outline: modulesList.map((m: any) => m.title) };
    if (found.eventDetails) patch.eventDetails = { ...found.eventDetails, modulesList };
    const updated = await commit(model, found, patch, req.body.__v, req.user, 'lms');
    res.json({ success: true, course: updated, event: updated });
  }));
  router.get('/:kind(courses|events)/:id/revisions', auth, route(async (req: any, res: any) => {
    const { model, found } = await locate(req.params.kind, req.params.id);
    if (!mayEdit(req.user, found)) throw new ContentError(403, 'Insufficient permissions');
    res.json({ revisions: await revisions().find({ collection: model.collection.name, recordId: found._id }, { projection: { snapshot: 0 } }).sort({ createdAt: -1 }).limit(100).toArray() });
  }));
  router.post('/:kind(courses|events)/:id/restore/:revisionId', auth, route(async (req: any, res: any) => {
    if (!['admin','superadmin'].includes(req.user.role)) throw new ContentError(403, 'Admin required');
    const { model, found } = await locate(req.params.kind, req.params.id);
    const history = await revisions().findOne({ _id: new mongoose.Types.ObjectId(req.params.revisionId), collection: model.collection.name, recordId: found._id });
    if (!history) throw new ContentError(404, 'Revision not found');
    const { _id, __v, createdAt, updatedAt, ...snapshot } = history.snapshot;
    res.json({ success: true, course: await commit(model, found, snapshot, req.body.__v, req.user, 'restore') });
  }));
}
