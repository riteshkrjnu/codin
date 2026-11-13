import test from 'node:test';
import assert from 'node:assert/strict';
import { applyModuleOperations, mergeLegacyModules, metadataPatch } from '../server/content';
import { getEffectiveStatus, isNoticeVisible, dateBoundary } from '../src/lib/courseStatus';
import { databaseConfig } from '../server/config';
import { moduleDiff } from '../src/lib/apiFetch';
const modules: any[] = [{_id:'m1',title:'First',materials:[{_id:'a',title:'Reading',type:'text',text:'Keep me'}]},{_id:'m2',title:'Second',materials:[{_id:'b',title:'Audio',type:'audio',url:'https://example.org/audio'}]}];
test('lossy page projection cannot discard omitted modules or materials',()=>{
  const merged=mergeLegacyModules(modules,[{_id:'m1',title:'Renamed',materials:[]}]);
  assert.equal(merged.length,2); assert.equal(merged[0].materials[0].text,'Keep me'); assert.equal(merged[0].title,'Renamed');
  assert.deepEqual(mergeLegacyModules(modules,[]),modules);
  assert.deepEqual(metadataPatch({title:'New',modulesList:[],eventDetails:{modulesList:[]},$set:{deleted:true}},new Set(['title'])),{title:'New'});
});
test('explicit operations delete exactly the requested material and support clearing',()=>{
  const next=applyModuleOperations(modules,[{type:'material.remove',moduleId:'m1',materialId:'a'}]);
  assert.equal(next[0].materials.length,0); assert.equal(next[1].materials.length,1); assert.equal(modules[0].materials.length,1);
  assert.equal(applyModuleOperations(modules,[{type:'module.remove',moduleId:'m1'},{type:'module.remove',moduleId:'m2'}]).length,0);
  assert.throws(()=>applyModuleOperations(modules,[{type:'material.remove',moduleId:'missing',materialId:'a'}]));
});
test('editor diff yields explicit operations and round-trips material edits and additions',()=>{
  const next=structuredClone(modules);next[0].materials[0].text='Updated';next.pop();next.push({_id:'m3',title:'New',materials:[{_id:'c',title:'New reading',type:'text',text:'New text'}]});
  assert.deepEqual(applyModuleOperations(modules,moduleDiff(modules,next)),next);
});
test('all day dates end at the end of the day in Kolkata',()=>{
  const record={status:'Ongoing',startDate:'2026-10-19',endDate:'2026-10-19'};
  assert.equal(getEffectiveStatus(record,Date.parse('2026-10-18T18:29:59Z')),'Upcoming');
  assert.equal(getEffectiveStatus(record,Date.parse('2026-10-18T18:30:00Z')),'Ongoing');
  assert.equal(getEffectiveStatus(record,Date.parse('2026-10-19T18:29:59.999Z')),'Ongoing');
  assert.equal(getEffectiveStatus(record,Date.parse('2026-10-19T18:30:00Z')),'Completed');
  assert.equal(getEffectiveStatus({...record,status:'Archived'}),'Archived');
  assert.equal(getEffectiveStatus({...record,status:'Draft'}),'Draft');
  assert.equal(getEffectiveStatus({status:'Published'}),'Upcoming');
  assert.equal(dateBoundary('invalid'),undefined);
});
test('notice schedule respects dates, visibility and expiry',()=>{
  const now=Date.parse('2026-10-19T10:00:00Z');
  assert.equal(isNoticeVisible({status:'Ongoing',publishAt:'2026-10-20'},now),false);
  assert.equal(isNoticeVisible({status:'Ongoing',expiresAt:'2026-10-18'},now),false);
  assert.equal(isNoticeVisible({status:'Ongoing',expiresAt:'2026-10-19'},now),true);
  assert.equal(isNoticeVisible({status:'Draft'},now),false);
  assert.equal(isNoticeVisible({showInBulletin:false},now),false);
});
test('database selection cannot silently swap development and production',()=>{
  const env={MONGODB_URI:'mongodb://localhost',MONGODB_DB_NAME:'test',NODE_ENV:'development'};
  assert.equal(databaseConfig(env).dbName,'test');
  assert.throws(()=>databaseConfig({...env,MONGODB_DB_NAME:'codin'}));
  assert.throws(()=>databaseConfig({...env,NODE_ENV:'production'}));
  assert.equal(databaseConfig({...env,NODE_ENV:'production',MONGODB_DB_NAME:'codin'}).dbName,'codin');
  assert.throws(()=>databaseConfig({...env,MONGODB_DB_NAME:''}));
});

test('projects and events advance through date boundaries without changing stored publication state', async () => {
  const { getProjectStatus } = await import('../src/lib/courseStatus');
  const record = { status:'Upcoming',startDate:'2026-10-19',endDate:'2026-10-21' };
  for (const policy of [getEffectiveStatus,getProjectStatus]) {
    assert.equal(policy(record,Date.parse('2026-10-18T18:29:59Z')),'Upcoming');
    assert.equal(policy(record,Date.parse('2026-10-19T07:00:00Z')),'Ongoing');
    assert.equal(policy(record,Date.parse('2026-10-21T18:29:59.999Z')),'Ongoing');
    assert.equal(policy(record,Date.parse('2026-10-21T18:30:00Z')),'Completed');
    assert.equal(policy({...record,status:'Draft'},Date.parse('2026-11-01')),'Draft');
    assert.equal(policy({...record,status:'Archived'},Date.parse('2026-10-19T07:00:00Z')),'Archived');
    assert.equal(policy({...record,status:'Completed'},Date.parse('2026-10-19T07:00:00Z')),'Ongoing');
  }
  assert.equal(getProjectStatus({status:'Upcoming',startDate:'2026-10-19'},Date.parse('2026-12-01')),'Ongoing');
  assert.equal(getProjectStatus({...record,status:'Suspended'},Date.parse('2026-10-19T07:00:00Z')),'Suspended');
  assert.equal(record.status,'Upcoming');
});
