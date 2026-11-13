#!/usr/bin/env node
// Capture unauthenticated public presentation data only. Never connect to MongoDB.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const value = key => args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
const source = value('--source') || 'http://localhost:3000';
const input = value('--input-dir');
const fields = {
  events: 'slug title type dates startDate endDate location description longDescription image status storedStatus associatedCentres associatedPeople associatedProjects collaborators sponsors schedule subPages presenters registrationCard supportOfficeText supportOfficeEmail fee completedFee isCourse',
  projects: 'slug title id tag description longDescription methodology impact aims status storedStatus image relatedLinks associatedCentres projectDirectors projectStaffs fundingAgency fundingAgencies supportingAgencies collaboratingAgency collaborators year startDate endDate keywords subPages openPositions outputLabel outputUrl',
  people: 'slug name fullName role email image bio education experience publications scholarPublications researchInterests centres socials otherLinks otherSections manualCourses manualEvents',
  centres: 'slug name shortName tagline description image aims projects people courses publications relevantCards subPages',
  courses: 'slug title code type description longDescription tagline image dates startDate endDate location status storedStatus duration credits fee completedFee curriculum highlights outline associatedCentres associatedPeople associatedProjects instructors tas collaborators sponsors subPages registrationCard',
  resources: 'slug title kind description body authors year publishedAt url licence version associatedProjects associatedCentres',
  activity: 'title description associatedProjects associatedCentres date updatedAt status category link isDynamic',
};
export const isPublic = x => !x.deleted && !['Draft', 'Trash'].includes(x.status) && x.publicationState !== 'draft';
export function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !/^(_id|__v|token|password|participants|modulesList|createdBy|updatedBy|paymentGatewayLink)$/i.test(key)).map(([key, item]) => [key, clean(item)]));
}
export function projectPublic(key, records) {
  if (!Array.isArray(records)) throw Error(`Invalid public response: ${key}`);
  const allowed = fields[key].split(' ');
  return records.filter(isPublic).map(record => clean(Object.fromEntries(allowed.filter(k => record[k] !== undefined).map(k => [k, record[k]]))));
}
const snapshot = { provenance: { source, capturedAt: new Date().toISOString(), access: 'Unauthenticated public API; presentation fields only. This is a dated snapshot, not a live view.', endpoints: {} }, data: {} };
for (const key of Object.keys(fields)) {
  const endpoint = key === 'activity' ? 'activity-feed' : key;
  try {
    let body;
    if (input) body = JSON.parse(await readFile(`${input}/codin-mockup-${key}.json`, 'utf8'));
    else {
      const response = await fetch(`${source}/api/${endpoint}`, { credentials: 'omit', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw Error(`HTTP ${response.status}`);
      body = await response.json();
    }
    snapshot.data[key] = projectPublic(key, body[key === 'activity' ? 'items' : key]);
    snapshot.provenance.endpoints[key] = { path: `/api/${endpoint}`, state: 'captured', count: snapshot.data[key].length };
  } catch (error) {
    snapshot.data[key] = [];
    snapshot.provenance.endpoints[key] = { path: `/api/${endpoint}`, state: 'unavailable', reason: error.message };
  }
}
const output = fileURLToPath(new URL('../public/designs/comparison-data.json', import.meta.url));
await writeFile(output, JSON.stringify(snapshot, null, 2) + '\n');
console.log(JSON.stringify(snapshot.provenance, null, 2));
