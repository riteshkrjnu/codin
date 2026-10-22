import 'dotenv/config';
import mongoose from 'mongoose';
import { databaseConfig } from '../server/config';
import { getEffectiveStatus, dateBoundary } from '../src/lib/courseStatus';
const { uri, dbName } = databaseConfig();
const apply = process.argv.includes('--apply');
if (apply && dbName === 'codin' && !process.argv.includes('--allow-production')) throw new Error('Production migration requires --allow-production and a verified backup');
try {
  await mongoose.connect(uri, { dbName, autoIndex: false });
  const report: any[] = [];
  for (const collection of ['courses','events']) {
    for await (const doc of mongoose.connection.db!.collection(collection).find()) {
      const ambiguous = dateBoundary(doc.startDate) === undefined || dateBoundary(doc.endDate, true) === undefined || !['Draft','Upcoming','Ongoing','Completed','Archived','Published','Enrollment Open','Closed'].includes(doc.status);
      const patch = { publicationState: doc.status === 'Draft' ? 'draft' : ['Closed','Archived'].includes(doc.status) ? 'archived' : 'published', lifecycle: ['Draft','Archived'].includes(getEffectiveStatus(doc)) ? undefined : getEffectiveStatus(doc), registrationState: doc.status === 'Enrollment Open' ? 'open' : 'closed' };
      report.push({ collection, id: String(doc._id), title: doc.title, ambiguous, proposed: patch });
      if (apply && !ambiguous && !doc.publicationState) await mongoose.connection.db!.collection(collection).updateOne({ _id: doc._id, publicationState: { $exists: false } }, { $set: patch, $inc: { __v: 1 } });
    }
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', report }, null, 2));
} catch { console.error('Migration failed. Check Atlas access; no automatic retry was attempted.'); process.exitCode = 1; }
finally { await mongoose.disconnect(); }
