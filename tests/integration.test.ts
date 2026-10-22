import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
const uri=process.env.QA_MONGODB_URI;
test('HTTP content, access, revision, feed and session regression suite', {skip:!uri,timeout:90000},async()=>{
  const name=`codin_qa_${Date.now()}`;
  assert.ok(uri!.startsWith('mongodb://127.0.0.1:27019/'),'Tests only run against the dedicated local QA replica');
  await mongoose.connect(uri!,{dbName:name});
  const db=mongoose.connection.db!;
  const salt=crypto.randomBytes(16).toString('hex');
  const password=crypto.pbkdf2Sync('qa-password',salt,210000,64,'sha512').toString('hex');
  const admin=new mongoose.Types.ObjectId();
  await db.collection('users').insertOne({_id:admin,email:'qa@example.invalid',password:`v2:${salt}:${password}`,role:'superadmin',name:'QA'});
  const course=new mongoose.Types.ObjectId();
  await db.collection('courses').insertOne({_id:course,__v:0,slug:'qa-course',type:'W2M Residential Course',title:'QA Course',status:'Published',startDate:'2020-01-01',endDate:'2020-01-02',createdBy:admin,modulesList:[{_id:'m1',title:'First',materials:[{_id:'a',title:'Private',type:'text',text:'protected lesson'}]},{_id:'m2',title:'Second',materials:[{_id:'b',title:'Audio',type:'audio',url:'https://example.org/private'}]}]});
  await db.collection('announcements').insertMany([{title:'Linked notice',description:'Same activity',date:'2026-10-19',link:'/academy/online/qa-course',status:'Ongoing',showInBulletin:true},{title:'Expired',description:'Hidden',date:'2026-10-19',expiresAt:'2020-01-01',status:'Ongoing'}]);
  const child=spawn(process.execPath,['--import','tsx','server.ts'],{env:{...process.env,NODE_ENV:'development',MONGODB_URI:uri,MONGODB_DB_NAME:name,PORT:'3099',APP_URL:'http://127.0.0.1:3099',OUTBOUND_ENABLED:'false'},stdio:['ignore','pipe','pipe']});
  let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
  const base='http://127.0.0.1:3099/api';let token='';
  async function request(route:string,method='GET',body?:any,auth=token){
    const response=await fetch(base+route,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
    return {status:response.status,data:response.headers.get("content-type")?.includes("application/json") ? await response.json() : await response.text()};
  }
  try{
    let ready=false;for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3099/health/ready')).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,200));}
    assert.ok(ready,`App failed startup: ${output}`);
    const publicCourse=await request('/courses/qa-course');assert.equal(publicCourse.status,200);assert.equal(publicCourse.data.course.modulesList[0].materials.length,0);assert.equal(publicCourse.data.course.status,'Completed');
    assert.equal((await request(`/courses/${course}`,'PUT',{__v:0,title:'Attack'},String(admin))).status,401);
    const login=await request('/login','POST',{email:'qa@example.invalid',password:'qa-password'});assert.equal(login.status,200);token=login.data.token;assert.match(token,/^[a-f0-9]{64}$/);assert.notEqual(token,String(admin));
    const original=await request('/courses/qa-course');assert.equal(original.data.course.modulesList[0].materials[0].text,'protected lesson');
    const save=await request(`/courses/${course}`,'PUT',{__v:0,title:'Renamed',modulesList:[{_id:'m1',title:'First',materials:[]}]});assert.equal(save.status,200);assert.equal(save.data.course.modulesList.length,2);assert.equal(save.data.course.modulesList[0].materials.length,1);
    const eventProjection = await request('/events');
    const projected = eventProjection.data.events.find((x:any)=>x.slug==='qa-course');
    assert.equal(projected.__v,1); assert.equal(projected.status,'Completed');
    assert.equal((await request(`/courses/${course}`,'PUT',{__v:0,title:'Stale'})).status,409);
    assert.equal((await request(`/courses/${course}`,'PUT',{title:'No revision'})).status,428);
    const remove=await request(`/courses/${course}/lms`,'POST',{__v:1,operations:[{type:'material.remove',moduleId:'m1',materialId:'a'}]});assert.equal(remove.status,200);assert.equal(remove.data.course.modulesList[0].materials.length,0);
    const history=await request(`/courses/${course}/revisions`);assert.equal(history.data.revisions.length,2);assert.equal(history.data.revisions[0].snapshot,undefined);
    const initial=history.data.revisions.find((r:any)=>r.revision===0);
    const restored=await request(`/courses/${course}/restore/${initial._id}`,'POST',{__v:2});assert.equal(restored.status,200);assert.equal(restored.data.course.modulesList[0].materials[0].text,'protected lesson');
    const feed=await request('/activity-feed');assert.equal(feed.data.items.length,2);assert.equal(feed.data.items.find((x:any)=>x.isDynamic).status,'Completed');assert.equal(feed.data.items.find((x:any)=>!x.isDynamic).title,'Linked notice');
    assert.equal((await request('/events','POST',{slug:'qa-course',title:'Duplicate'})).status,409);
    assert.equal((await request(`/courses/${course}?permanent=true`,'DELETE',{__v:3})).status,400);
    const trashed=await request(`/courses/${course}`,'DELETE',{__v:3});assert.equal(trashed.status,200);assert.equal(trashed.data.course.deleted,true);
    assert.equal((await request('/auth/google/mock-simulation')).status,404);
    assert.equal((await request('/auth/google/callback?code=mock_auth_code_for_preview')).status,401);
    assert.equal((await request('/profile','PUT',{userId:'someone-else',name:'Updated'})).status,200);
    assert.equal((await db.collection('users').findOne({_id:admin}))!.name,'Updated');
    const simultaneous = await Promise.all([
      request(`/courses/${course}`,'PUT',{__v:4,title:'Concurrent A',deleted:false}),
      request(`/courses/${course}`,'PUT',{__v:4,title:'Concurrent B',deleted:false})
    ]);
    assert.deepEqual(simultaneous.map(x=>x.status).sort(),[200,409]);
    const student = new mongoose.Types.ObjectId();
    await db.collection('users').insertOne({_id:student,email:'student@example.invalid',password:`v2:${salt}:${password}`,role:'student'});
    const studentLogin=await request('/login','POST',{email:'student@example.invalid',password:'qa-password'});
    const studentToken=studentLogin.data.token;
    assert.equal((await request(`/courses/${course}`,'PUT',{__v:5,title:'Unauthorised'},studentToken)).status,403);
    assert.equal((await request(`/courses/${course}/revisions`,'GET',undefined,studentToken)).status,403);
    assert.equal((await request('/events/qa-course/participants','GET',undefined,studentToken)).status,403);
    assert.equal((await request('/admin/editorial','GET',undefined,studentToken)).status,403);
    await db.collection('projects').insertOne({slug:'qa-project',id:'QA-P',title:'QA Project',tag:'Research',status:'Ongoing',startDate:'2020-01-01',associatedCentres:['qa-centre'],updatedAt:new Date()});
    await db.collection('announcements').insertOne({sourceId:'qa-project',title:'Dated project update',description:'One update, reused in connected views',date:'2026-10-19',status:'Ongoing',link:'/projects/qa-project'});
    const projectFeed=(await request('/activity-feed')).data.items.filter((x:any)=>x.sourceId==='qa-project'&&!x.isDynamic);assert.equal(projectFeed.length,1);assert.equal(projectFeed[0].status,'Ongoing');assert.equal(projectFeed[0].category,'Project');assert.deepEqual(projectFeed[0].associatedProjects,['qa-project']);assert.deepEqual(projectFeed[0].associatedCentres,['qa-centre']);assert.equal(projectFeed[0].title,'Dated project update');
    await db.collection('projects').deleteOne({slug:'qa-project'});await db.collection('announcements').deleteOne({sourceId:'qa-project'});
    // Private notes and progress are tied to the authenticated account and stable material IDs.
    assert.equal((await request('/courses/qa-course/access')).data.hasAccess,true);assert.equal((await request('/courses/qa-course/access','GET',undefined,'')).status,401);assert.equal((await db.collection('learningProgress').countDocuments()),0,'Access checks never create learning records');
    assert.equal((await request('/courses/qa-course/access','GET',undefined,studentToken)).data.hasAccess,false);
    const learning=await request('/courses/qa-course/learning');assert.equal(learning.status,200);assert.equal(learning.data.learning.__v,0);
    const progress=await request('/courses/qa-course/learning','PATCH',{__v:0,materialId:'a',note:'Keep the context.',completed:true});assert.equal(progress.status,200);assert.equal(progress.data.learning.notes.a,'Keep the context.');assert.deepEqual(progress.data.learning.completed,['a']);
    assert.equal((await request('/courses/qa-course/learning','PATCH',{__v:0,materialId:'a',note:'Stale note'})).status,409);
    assert.equal((await request('/courses/qa-course/learning','GET',undefined,studentToken)).status,403);
    await db.collection('registrations').insertOne({eventSlug:'qa-course',email:'student@example.invalid',admissionStatus:'Confirmed',paymentStatus:'Confirmed'});
    assert.equal((await request('/courses/qa-course/access','GET',undefined,studentToken)).data.hasAccess,true);
    const studentLearning=await request('/courses/qa-course/learning','GET',undefined,studentToken);assert.equal(studentLearning.status,200);assert.deepEqual(studentLearning.data.learning.notes,{});
    assert.equal((await request('/courses/qa-course/learning','PATCH',{__v:0,materialId:'missing',note:'invalid'},studentToken)).status,400);
    const privateNote=await request('/courses/qa-course/learning','PATCH',{__v:0,materialId:'a',note:'Student private note'},studentToken);assert.equal(privateNote.status,200);
    assert.equal((await request('/courses/qa-course/learning')).data.learning.notes.a,'Keep the context.');
    await db.collection('registrations').deleteMany({email:'student@example.invalid'});assert.equal((await request('/courses/qa-course/learning','GET',undefined,studentToken)).status,403);
    assert.equal((await request('/courses/qa-course/access','GET',undefined,studentToken)).data.hasAccess,false);
    const resource=await request('/resources','POST',{slug:'qa-resource',title:'QA resource',publicationState:'published',kind:'Dataset',url:'https://example.invalid/data'});assert.equal(resource.status,201);
    assert.equal((await request('/resources','POST',{slug:'qa-resource',title:'Duplicate'})).status,409);
    assert.equal((await request('/resources','POST',{slug:'member-draft',title:'Student draft'},studentToken)).status,201);
    assert.equal((await request('/resources/member-draft','GET',undefined,'')).status,404);
    assert.equal((await request('/resources/qa-resource','PATCH',{__v:0,title:'Updated resource'})).status,200);
    assert.equal((await request('/resources/qa-resource','PATCH',{__v:0,title:'Stale resource'})).status,409);
    assert.equal((await request('/resources/qa-resource','PATCH',{__v:1,deleted:true})).status,200);assert.equal((await request('/resources/qa-resource')).status,404);
    assert.equal((await request('/resources/qa-resource','PATCH',{__v:2,deleted:false})).status,200);assert.equal((await request('/resources/qa-resource')).status,200);

    assert.equal((await request('/resources','POST',{slug:'invalid-shape',title:'Invalid shape',description:{nested:'object'}},studentToken)).status,400);
    assert.equal((await request('/resources','POST',{slug:'invalid-embed',title:'Invalid embed',document:{version:1,blocks:[{id:'video',type:'youtube',url:'https://evil.invalid/embed'}]}},studentToken)).status,400);
    const memberArticle=await request('/resources','POST',{slug:'member-article',title:'First public title',action:'submit',categories:['Reports'],associatedEvents:['qa-course'],document:{version:1,blocks:[{id:'text',type:'paragraph',text:'Member draft'}]}},studentToken);assert.equal(memberArticle.status,201);
    assert.equal((await request('/resources/member-article','GET',undefined,'')).status,404);
    assert.equal((await request('/writing/member-article/preview','GET',undefined,'')).status,401);
    assert.equal((await request('/resources/member-article','PATCH',{__v:0,action:'publish'},studentToken)).status,403);
    const approval=await request('/resources/member-article','PATCH',{__v:0,action:'approve'});assert.equal(approval.status,200);
    assert.equal((await request('/resources/member-article','GET',undefined,'')).data.resource.title,'First public title');
    assert.equal((await request('/resources/member-article','PATCH',{__v:1,action:'submit',title:'PRIVATE PROPOSED TITLE'},studentToken)).status,200);
    assert.equal((await request('/resources/member-article','GET',undefined,'')).data.resource.title,'First public title');
    const publicList=JSON.stringify((await request('/resources','GET',undefined,'')).data);assert.ok(!publicList.includes('PRIVATE PROPOSED TITLE'));
    assert.equal((await request('/resources/member-article','PATCH',{__v:2,action:'return',feedback:'Please add context.'})).status,200);
    const returned=await request('/writing/member-article/preview','GET',undefined,studentToken);assert.equal(returned.data.resource.feedback,'Please add context.');
    assert.equal((await request('/resources/member-article','PATCH',{__v:3,action:'submit',title:'Revised public title'},studentToken)).status,200);
    assert.equal((await request('/resources/member-article','PATCH',{__v:3,action:'approve'})).status,409);
    assert.equal((await request('/resources/member-article','PATCH',{__v:4,action:'approve'})).status,200);
    assert.equal((await request('/resources/member-article','GET',undefined,'')).data.resource.title,'Revised public title');
    assert.equal((await request('/writing/member-article/revisions','GET',undefined,studentToken)).data.revisions.length,5);
    const otherUser=new mongoose.Types.ObjectId();await db.collection('users').insertOne({_id:otherUser,email:'other@example.invalid',password:`v2:${salt}:${password}`,role:'student'});
    const otherToken=(await request('/login','POST',{email:'other@example.invalid',password:'qa-password'})).data.token;
    assert.equal((await request('/writing/member-article/preview','GET',undefined,otherToken)).status,404);
    assert.equal((await request('/resources/member-article','PATCH',{__v:5,action:'draft',title:'Intrusion'},otherToken)).status,404);
    assert.equal((await request('/admin/homepage-curation','PUT',{tiles:{projects:['project:x']}},studentToken)).status,403);
    assert.equal((await request('/admin/homepage-curation','PUT',{tiles:{projects:['project:x']}})).status,200);
    assert.deepEqual((await request('/homepage-curation','GET',undefined,'')).data.tiles.projects,['project:x']);
    assert.equal((await request('/resources/member-article','PATCH',{__v:5,action:'archive'})).status,200);assert.equal((await request('/resources/member-article','GET',undefined,'')).status,404);
    assert.equal((await request('/resources/member-article','PATCH',{__v:6,action:'restore'})).status,200);assert.equal((await request('/resources/member-article','GET',undefined,'')).status,404);
    assert.equal((await request('/writing/member-article/restore/0','POST',{__v:7},studentToken)).status,200);
    assert.equal((await request('/writing/member-article/preview','GET',undefined,studentToken)).data.resource.title,'First public title');

    const joint=await request('/resources','POST',{slug:'joint-article',title:'Joint field notes',articleDate:'2024-03-01',citationMode:'auto',action:'draft'},studentToken);assert.equal(joint.status,201);assert.ok(joint.data.resource.authors);
    assert.equal((await request('/writing/joint-article/collaborators','POST',{__v:0,email:'missing@example.invalid'},studentToken)).status,404);
    const grant=await request('/writing/joint-article/collaborators','POST',{__v:0,email:'OTHER@example.invalid'},studentToken);assert.equal(grant.status,200);assert.equal(grant.data.__v,1);
    assert.equal((await request('/writing/joint-article/preview','GET',undefined,otherToken)).status,200);assert.ok((await request('/writing','GET',undefined,otherToken)).data.resources.some((r:any)=>r.slug==='joint-article'));
    assert.equal((await request('/writing/joint-article/collaborators','GET',undefined,otherToken)).data.canManage,false);
    assert.equal((await request('/writing/joint-article/collaborators','POST',{__v:1,email:'qa@example.invalid'},otherToken)).status,403);
    assert.equal((await request('/resources/joint-article','PATCH',{__v:1,action:'draft',title:'Joint revised notes',collaboratorIds:[String(admin)]},otherToken)).status,200);
    assert.deepEqual((await db.collection('resources').findOne({slug:'joint-article'}))?.collaboratorIds.map(String),[String(otherUser)]);
    assert.equal((await request('/resources/joint-article','PATCH',{__v:1,action:'draft',title:'Stale owner update'},studentToken)).status,409);
    assert.equal((await request('/resources/joint-article','PATCH',{__v:2,action:'publish'},otherToken)).status,403);
    assert.equal((await request('/resources/joint-article','PATCH',{__v:2,action:'publish'})).status,200);
    const publishedJoint=(await request('/resources/joint-article','GET',undefined,'')).data.resource;assert.equal(publishedJoint.collaboratorIds,undefined);assert.match(publishedJoint.citation,/2024/);assert.match(publishedJoint.citation,/Joint revised notes/);
    assert.equal((await request(`/writing/joint-article/collaborators/${otherUser}`,'DELETE',{__v:3},studentToken)).status,200);
    assert.equal((await request('/writing/joint-article/preview','GET',undefined,otherToken)).status,404);assert.equal((await request('/resources/joint-article','PATCH',{__v:4,action:'draft',title:'Access revoked'},otherToken)).status,404);
    assert.equal((await request('/resources/joint-article','PATCH',{__v:4,action:'draft',citationMode:'custom',citation:'A custom reference.'},studentToken)).status,200);assert.equal((await request('/writing/joint-article/preview','GET',undefined,studentToken)).data.resource.citation,'A custom reference.');
    // The Events and Course editors save one public overview, preserving private material.
    await db.collection('courses').insertOne({slug:'qa-shared-overview',title:'Shared course',type:'W2M Residential Course',status:'Ongoing',__v:0,curriculum:['Legacy topic'],eventDetails:{subPages:[]},modulesList:[{_id:'private-module',title:'Private lesson',materials:[{_id:'private-material',title:'Private material',type:'text',text:'Never included in the public overview'}]}]});
    const pages=[{slug:'briefing',title:'Briefing',type:'markdown',content:{markdown:'A public briefing'}},{slug:'course-overview',title:'Study together',type:'course_overview',content:{description:'A public course introduction',modules:[{title:'Listening',description:'Consent and field practice.'}]}}];
    const fromEvent=await request('/events/qa-shared-overview?isCourse=true','PUT',{__v:0,subPages:pages});assert.equal(fromEvent.status,200);
    assert.equal((await request('/courses/qa-shared-overview')).data.course.subPages[1].content.modules[0].description,'Consent and field practice.');
    const reversed=[pages[1],pages[0]];reversed[0].content.modules[0].description='Updated through the course editor.';
    assert.equal((await request('/courses/qa-shared-overview','PUT',{__v:1,subPages:reversed})).status,200);
    const shared=(await request('/events/qa-shared-overview?isCourse=true')).data.event;assert.equal(shared.subPages[0].type,'course_overview');assert.equal(shared.subPages[0].content.modules[0].description,'Updated through the course editor.');
    assert.equal((await db.collection('courses').findOne({slug:'qa-shared-overview'}))?.modulesList[0].materials[0].text,'Never included in the public overview');
    assert.equal((await request('/events/qa-shared-overview','PUT',{__v:2,subPages:[]},studentToken)).status,403);

    // The same phase settings persist through both editors and govern real event/course mutations.
    const openPhase=[{id:'registration',title:'Registration',startDate:'2020-01-01',endDate:'2099-01-01',buttons:[{id:'register',label:'Register now',kind:'registration',audience:'everyone'}]}];
    const closedPhase=[{...openPhase[0],endDate:'2020-01-02'}];
    for(const kind of ['events','courses']){
      const slug=`qa-phases-${kind}`,collection=db.collection(kind);
      await collection.insertOne({slug,title:'QA scheduled registration',type:kind==='courses'?'W2M Residential Course':'Conference',status:'Completed',startDate:'2020-01-01',endDate:'2020-01-02',registrationState:'open',__v:0,modulesList:[],registrationCard:{actionPhases:openPhase}});
      const saved=await request(`/events/${slug}${kind==='courses'?'?isCourse=true':''}`,'PUT',{__v:0,registrationCard:{actionPhases:openPhase}});
      assert.equal(saved.status,200);
      assert.equal((await request(`/courses/${slug}`)).data.course.registrationCard.actionPhases[0].buttons[0].label,'Register now');
      assert.equal((await request(`/${kind}/${slug}`,'PUT',{__v:1,registrationCard:{actionPhases:[{...openPhase[0],endDate:'2019-01-01'}]}})).status,400);
      const fromCourse=await request(`/courses/${slug}`,'PUT',{__v:1,registrationCard:{actionPhases:closedPhase}});assert.equal(fromCourse.status,200);
      assert.equal((await request(`/events/${slug}`)).data.event.registrationCard.actionPhases[0].endDate,'2020-01-02');
      assert.equal((await request('/enroll','POST',{courseSlug:slug},studentToken)).status,403,'Closed phase blocks public enrollment');
      await db.collection('registrations').insertOne({eventSlug:slug,email:'student@example.invalid',admissionStatus:'Confirmed',paymentStatus:'Pending',paymentDeadline:'2099-01-01'});
      assert.equal((await request(`/events/${slug}/pay-fee`,'POST',{},studentToken)).status,403,'Expired phase blocks accepted payment');
      assert.equal((await request(`/events/${slug}/enroll-materials`,'POST',{},studentToken)).status,403,'Materials enrollment cannot bypass the expired phase');
      assert.equal((await request(`/courses/${slug}/access`,'GET',undefined,studentToken)).data.hasAccess,false);
      await collection.updateOne({slug},{$set:{'registrationCard.actionPhases':openPhase}});
      await db.collection('registrations').updateOne({eventSlug:slug},{$set:{paymentDeadline:'2020-01-01'}});
      assert.equal((await request(`/events/${slug}/pay-fee`,'POST',{},studentToken)).status,403,'Personal deadline restricts an open phase');
      assert.equal((await request(`/events/${slug}/enroll-materials`,'POST',{},studentToken)).status,403,'Expired personal deadline cannot be bypassed');
      assert.equal((await db.collection('registrations').findOne({eventSlug:slug}))?.paymentStatus,'Pending');
      await db.collection('registrations').updateOne({eventSlug:slug},{$set:{paymentDeadline:'2099-01-01'}});
      assert.equal((await request(`/events/${slug}/pay-fee`,'POST',{},studentToken)).status,200);
      assert.equal((await request(`/courses/${slug}/access`,'GET',undefined,studentToken)).data.hasAccess,true);
      await collection.updateOne({slug},{$set:{'registrationCard.actionPhases':closedPhase}});
      assert.equal((await request(`/courses/${slug}/access`,'GET',undefined,studentToken)).data.hasAccess,true,'Closing registration preserves approved access');
      assert.equal((await request(`/events/${slug}/pay-fee`,'POST',{},studentToken)).status,200,'Confirmed payments are idempotent');
    }
    await db.collection('courses').insertOne({slug:'qa-phase-online',title:'Online phase enrollment',type:'Online Course',registrationState:'open',registrationCard:{actionPhases:openPhase},fee:0});
    const onlineEnrollment=await request('/enroll','POST',{courseSlug:'qa-phase-online',userId:String(admin)},studentToken);
    assert.equal(onlineEnrollment.status,200);assert.equal(onlineEnrollment.data.participant.email,'student@example.invalid','Enrollment uses the current session rather than a submitted user ID');
    assert.equal((await request('/enroll','POST',{courseSlug:'qa-phase-online'},'')).status,401);
    await request('/logout','POST',{});assert.equal((await request('/session')).status,401);
    const expired=await request('/login','POST',{email:'qa@example.invalid',password:'qa-password'});token=expired.data.token;await db.collection('sessions').updateMany({},{ $set:{expiresAt:new Date(0)} });assert.equal((await request('/session')).status,401);
    // Briefly disconnect the app's DB via failpoint-free server shutdown is covered by separate readiness test.
    assert.equal(await db.collection('projects').countDocuments(),0,'Startup must not seed demo content');
  }finally{child.kill('SIGTERM');await new Promise<void>(resolve=>{child.once('exit',()=>resolve());setTimeout(resolve,2000);});await db.dropDatabase();await mongoose.disconnect();}
});

test('database outage returns 503 instead of accepting temporary writes', {skip:!uri,timeout:30000},async()=>{
  const child=spawn(process.execPath,['--import','tsx','server.ts'],{env:{...process.env,NODE_ENV:'development',MONGODB_URI:'mongodb://127.0.0.1:27029/?directConnection=true',MONGODB_DB_NAME:'codin_qa_offline',PORT:'3098',OUTBOUND_ENABLED:'false'},stdio:'ignore'});
  try{
    let response:Response|undefined;
    for(let i=0;i<100;i++){try{response=await fetch('http://127.0.0.1:3098/health/ready');break;}catch{}await new Promise(r=>setTimeout(r,200));}
    assert.equal(response?.status,503);
    const write=await fetch('http://127.0.0.1:3098/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Must not save'})});
    assert.equal(write.status,503);assert.match((await write.json()).error,/not been saved/);
  }finally{child.kill('SIGTERM');}
});
