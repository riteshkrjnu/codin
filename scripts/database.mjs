#!/usr/bin/env node
import 'dotenv/config';
import mongoose from 'mongoose';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, writeFile, chmod, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
const [command = 'check', ...args] = process.argv.slice(2);
const uri = process.env.MONGODB_URI;
const name = process.env.MONGODB_DB_NAME;
const allowed = /^[a-zA-Z0-9_-]+$/;
const backupDir = path.resolve(process.env.BACKUP_DIR || 'backups');
let temporary;
function fail(message) { throw new Error(message); }
async function tool(binary, argv) {
  await new Promise((resolve, reject) => {
    const child = spawn(binary, argv, { stdio: ['ignore', 'ignore', 'pipe'] });
    let failed = false;
    child.stderr.on('data', () => { /* Database tool errors may contain credentials: never echo. */ });
    child.on('error', () => { failed = true; reject(new Error(`${binary} unavailable. Install MongoDB Database Tools.`)); });
    child.on('close', code => { if (!failed) code === 0 ? resolve() : reject(new Error(`${binary} failed (exit ${code}); check Atlas permissions and network access.`)); });
  });
}
async function manifest(dbName) {
  const db = mongoose.connection.useDb(dbName).db;
  const result = {};
  for (const c of await db.listCollections({}, { nameOnly: true }).toArray()) {
    if (c.name.startsWith('system.')) continue;
    const collection = db.collection(c.name);
    const indexes = (await collection.indexes()).map(({ ns, v, ...i }) => i).sort((a,b) => a.name.localeCompare(b.name));
    const hash = crypto.createHash('sha256');
    let modules = 0, materials = 0, count = 0;
    // Full BSON-aware digest verifies IDs, enrolment references and material contents, not just counts.
    for await (const doc of collection.find().sort({ _id: 1 })) {
      count++;
      hash.update(mongoose.mongo.BSON.EJSON.stringify(doc, { relaxed: false }));
      for (const module of doc.modulesList || []) { modules++; materials += module.materials?.length || 0; }
    }
    result[c.name] = { count, indexes, modules, materials, digest: hash.digest('hex') };
  }
  return Object.fromEntries(Object.entries(result).sort(([a],[b])=>a.localeCompare(b)));
}
async function dump(dbName) {
  const file = path.join(backupDir, `${dbName}-${new Date().toISOString().replaceAll(':','-')}-${crypto.randomBytes(3).toString('hex')}.archive.gz`);
  await tool('mongodump', ['--config', path.join(temporary, 'tools.yml'), '--db', dbName, '--archive=' + file, '--gzip']);
  await chmod(file, 0o600);
  console.log(`Backup saved: ${file}`); return file;
}
async function restore(file, source, target) {
  if (!allowed.test(target) || target === 'codin' && command !== 'copy' || target === source) fail('Restore target must be a separate non-production database');
  const existing = await mongoose.connection.useDb(target).db.listCollections({}, { nameOnly: true }).toArray();
  if (existing.length) fail(`Refusing to overwrite existing ${target}; use a new restore target`);
  await tool('mongorestore', ['--config', path.join(temporary, 'tools.yml'), '--archive=' + path.resolve(file), '--gzip', '--nsInclude=' + source + '.*', '--nsFrom=' + source + '.*', '--nsTo=' + target + '.*', '--stopOnError']);
}
async function isolateDevelopment() {
  const db = mongoose.connection.useDb('test').db;
  // Real users cannot log into the dev clone with production credentials.
  for await (const user of db.collection('users').find({}, { projection: { _id: 1 } })) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(crypto.randomBytes(32), salt, 210000, 64, 'sha512').toString('hex');
    await db.collection('users').updateOne({ _id: user._id }, { $set: { password: `v2:${salt}:${hash}`, role: 'student' }, $unset: { resetToken: '', resetTokenExpiry: '' } });
  }
  for (const c of ['sessions','otpverifications']) await db.collection(c).deleteMany({});
}
try {
  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) fail('Set MONGODB_URI in .env');
  if (!name || !allowed.test(name)) fail('Set MONGODB_DB_NAME explicitly');
  await mongoose.connect(uri, { dbName: name, serverSelectionTimeoutMS: 15000, autoIndex: false });
  if (command === 'check') {
    await mongoose.connection.db.command({ ping: 1 });
    console.log(`Atlas connection verified; configured database: ${name}`);
  } else {
    await mkdir(backupDir, { recursive: true, mode: 0o700 });
    await chmod(backupDir, 0o700);
    temporary = await mkdtemp(path.join(os.tmpdir(), 'codin-db-'));
    await writeFile(path.join(temporary, 'tools.yml'), `uri: ${JSON.stringify(uri)}\n`, { mode: 0o600 });
    if (command === 'copy') {
      if (name !== 'test') fail('Initial copy requires MONGODB_DB_NAME=test');
      if (!args.includes('--verify-stable-source')) fail('Use copy --verify-stable-source; source and restored data must match full digests');
      const target = mongoose.connection.useDb('codin').db;
      if ((await target.listCollections({}, { nameOnly: true }).toArray()).length) fail('codin already exists; production is never overwritten');
      const before = await manifest('test');
      const archive = await dump('test');
      const after = await manifest('test');
      if (JSON.stringify(before) !== JSON.stringify(after)) fail('Source changed during backup. Retry during a quiet write window.');
      await restore(archive, 'test', 'codin');
      const copied = await manifest('codin');
      const sourceAfterRestore = await manifest('test');
      if (JSON.stringify(before) !== JSON.stringify(copied) || JSON.stringify(before) !== JSON.stringify(sourceAfterRestore)) fail('Copy verification failed. Do not cut over; preserve both databases and reconcile during a quiet window.');
      await writeFile(path.join(backupDir, 'copy-verification.json'), JSON.stringify({ checkedAt: new Date(), source: 'test', target: 'codin', verified: true, collections: copied }, null, 2), { mode: 0o600 });
      console.log('Verified test → codin: counts, indexes, full-document digests, module/material totals and references match. Accounts preserved. Source unchanged.');
    } else if (command === 'refresh') {
      if (name !== 'test' || !args.includes('--replace-test') || !args.includes('--production-cutover-complete')) fail('Refresh requires test configuration, --replace-test and --production-cutover-complete');
      await dump('test');
      const before = await manifest('codin');
      const archive = await dump('codin');
      if (JSON.stringify(before) !== JSON.stringify(await manifest('codin'))) fail('Production changed; retry during a quiet window');
      await mongoose.connection.useDb('test').db.dropDatabase();
      await restore(archive, 'codin', 'test');
      if (JSON.stringify(before) !== JSON.stringify(await manifest('test'))) fail('Refresh verification failed; restore the prior test backup');
      await isolateDevelopment();
      console.log('Development test refreshed, verified and isolated; production codin unchanged.');
    } else if (command === 'isolate-development') {
      if (name !== 'test' || !args.includes('--production-cutover-complete')) fail('Only isolate test after production has switched to codin; pass --production-cutover-complete');
      await dump('test');
      await isolateDevelopment();
      console.log('Development accounts and sessions isolated in test.');
    } else if (command === 'backup') {
      if (name === 'codin' && !args.includes('--production')) fail('Production backup requires --production');
      await dump(name);
    } else if (command === 'restore') {
      const [file, source, target] = args;
      if (!file || !allowed.test(source || '') || !target) fail('Usage: database.mjs restore ARCHIVE SOURCE_DB NEW_TARGET_DB');
      await restore(file, source, target);
      // Restored credentials are preserved; development isolation is an explicit post-cutover action.
      console.log(`Restored into ${target}; production was not modified.`);
    } else if (command === 'admin') {
      if (name !== 'test') fail('Development administrator command only works in test');
      const email = args[0]?.trim().toLowerCase();
      if (!email?.includes('@')) fail('Usage: database.mjs admin YOUR_DEV_EMAIL');
      const password = crypto.randomBytes(18).toString('base64url');
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 210000, 64, 'sha512').toString('hex');
      await mongoose.connection.db.collection('users').updateOne({ email }, { $set: { name: 'Development administrator', password: `v2:${salt}:${hash}`, role: 'superadmin', emails: [email] } }, { upsert: true });
      console.log(`Development administrator: ${email}\nOne-time password: ${password}\nStore this password securely; it is not written to disk.`);
    } else if (command === 'verify') {
      const report = await manifest(name);
      await writeFile(path.join(backupDir, `${name}-verification.json`), JSON.stringify(report,null,2), { mode: 0o600 });
      console.log(`Verified ${Object.keys(report).length} collections; report saved in backups.`);
    } else fail('Unknown database command');
  }
} catch (e) {
  // Never expose driver errors: URIs can appear in them.
  console.error(e instanceof Error && !/Mongo|querySrv|ENOTFOUND|ECONN/.test(e.name) ? e.message.replace(/mongodb(?:\+srv)?:\/\/\S+/g, '[redacted]') : 'Atlas operation failed. Check network access, database privileges and credentials.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
  if (temporary) await rm(temporary, { recursive: true, force: true });
}
