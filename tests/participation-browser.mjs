import {chromium} from 'playwright';
import mongoose from 'mongoose';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('../',import.meta.url)),uri=process.env.QA_MONGODB_URI;
assert.ok(/^mongodb:\/\/127\.0\.0\.1:27019\//.test(uri||''),'Use the isolated local QA replica only.');
await mongoose.connect(uri,{dbName:`codin_qa_phases_${Date.now()}`});const db=mongoose.connection.db;
const salt=crypto.randomBytes(16).toString('hex'),password='phase-qa-password',hash=`v2:${salt}:${crypto.pbkdf2Sync(password,salt,210000,64,'sha512').toString('hex')}`;
await db.collection('users').insertMany([{email:'phase-admin@example.invalid',name:'QA Admin',role:'superadmin',password:hash},{email:'phase-student@example.invalid',name:'QA Learner',role:'student',password:hash}]);
const phases=[{id:'abstract',title:'Abstract submission',startDate:'2026-10-01',endDate:'2026-10-20',buttons:[{id:'abstract',label:'Submit Abstract',kind:'submission',href:'https://example.invalid/submit',audience:'unregistered'}]},{id:'registration',title:'Registration',startDate:'2026-10-21',endDate:'2099-01-01',buttons:[{id:'register',label:'Registration',kind:'registration',audience:'unregistered'},{id:'pay',label:'Complete Registration',kind:'payment',audience:'accepted'}]}];
const baseRecord={__v:0,location:'Online',courseCode:'QA-PHASE',status:'Ongoing',registrationState:'open',startDate:'2020-01-01',endDate:'2099-01-01',description:'Synthetic phase regression record.',registrationCard:{actionPhases:phases,paymentMsgChoice:'link',paymentGatewayLink:'https://example.invalid/payment'},modulesList:[{_id:'m',title:'QA module',materials:[{_id:'material',title:'QA material',type:'text',text:'PRIVATE PHASE MATERIAL'}]}],subPages:[{slug:'overview',title:'Overview',type:'markdown',content:{markdown:'QA phase overview'}},{slug:'registration',title:'Registration',type:'registration',content:{}}]};
await db.collection('events').insertOne({...baseRecord,slug:'qa-phase-event',title:'QA Phase Event',type:'Conference'});
await db.collection('courses').insertMany([{...baseRecord,slug:'qa-phase-course',title:'QA Phase Course',type:'W2M Residential Course',isCourse:true},{...baseRecord,slug:'qa-phase-online',title:'QA Phase Online',type:'Online Course'}]);
const env={...process.env,NODE_ENV:'development',MONGODB_URI:uri,MONGODB_DB_NAME:db.databaseName,PORT:'3095',APP_URL:'http://127.0.0.1:5175',PUBLIC_API_URL:'http://127.0.0.1:3095',CORS_ORIGINS:'http://127.0.0.1:5175',SERVE_FRONTEND:'false',OUTBOUND_ENABLED:'false'};
const api=spawn(process.execPath,['--import','tsx','server.ts'],{cwd:root,env,stdio:'ignore'});
const front=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5175','--strictPort'],{cwd:root,env:{...process.env,DISABLE_HMR:'true',VITE_API_BASE_URL:'http://127.0.0.1:3095'},stdio:'ignore'});
let browser;const errors=[];
const before=Date.parse('2026-10-20T23:59:59.999+05:30'),after=before+1;
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error(`Not ready: ${url}`);}
async function context(width,identity,instant=after){const c=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});c.on('page',page=>page.setDefaultTimeout(15000));await c.route('**/*',r=>['http://127.0.0.1:5175','http://127.0.0.1:3095'].some(origin=>r.request().url().startsWith(origin))?r.continue():r.abort());await c.addInitScript(({identity,instant})=>{Date.now=()=>instant;if(identity)localStorage.setItem('lms_user',JSON.stringify(identity));},{identity,instant});return c;}
async function login(email){const response=await fetch('http://127.0.0.1:3095/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});assert.equal(response.status,200);return response.json();}
try{
 await Promise.all([ready('http://127.0.0.1:3095/health/ready'),ready('http://127.0.0.1:5175')]);browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const paths=['/events/qa-phase-event','/events/qa-phase-course?isCourse=true','/academy/online/qa-phase-online'];
 for(const width of (process.env.QA_PHASE_EDITOR_ONLY?[]:[1440,390])){
  const guest=await context(width,null,before),page=await guest.newPage();page.on('pageerror',e=>errors.push(e.stack||e.message));
  for(const path of paths){
   await page.goto('http://127.0.0.1:5175'+path,{waitUntil:'networkidle'});
   const actions=page.locator('.record-heading-actions').first();await actions.getByRole('link',{name:'Submit Abstract',exact:true}).waitFor();assert.equal(await actions.getByRole('link',{name:/Registration/}).count(),0);
   await page.evaluate(instant=>{Date.now=()=>instant;window.dispatchEvent(new Event('focus'));},after);
   await actions.getByRole('link',{name:/Registration/}).waitFor();assert.equal(await actions.getByRole('link',{name:'Submit Abstract',exact:true}).count(),0);
   await actions.getByRole('link',{name:/Registration/}).click();await page.getByRole('dialog').waitFor();
   if(!await page.locator('.record-glance details').evaluate(el=>el.open))await page.locator('.record-glance summary').click();
   assert.equal(await page.locator('.record-glance').getByRole('link',{name:/Registration/}).count(),1);
   assert.equal(await page.locator('.record-glance').getByRole('link',{name:/Submit Abstract|Complete Registration|Access Materials/}).count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  }
  await guest.close();console.log(`Passed scheduled public actions at ${width}px`);
 }
 const student=await login('phase-student@example.invalid');
 for(const [index,path] of (process.env.QA_PHASE_EDITOR_ONLY?[]:paths.entries())){
  const slug=['qa-phase-event','qa-phase-course','qa-phase-online'][index];
  await db.collection('registrations').insertOne({eventSlug:slug,email:student.email,admissionStatus:'Confirmed',paymentStatus:'Pending',paymentDeadline:'2026-10-20'});
  const c=await context(390,student),page=await c.newPage();page.on('pageerror',e=>errors.push(e.stack||e.message));
  await page.goto('http://127.0.0.1:5175'+path,{waitUntil:'networkidle'});
  const actions=page.locator('.record-heading-actions').first();assert.equal(await actions.getByRole('link',{name:/Registration|Materials|Open LMS/}).count(),0);
  await page.goto('http://127.0.0.1:5175'+path+(path.includes('?')?'&':'?')+'section=registration',{waitUntil:'networkidle'});
  await page.getByRole('dialog').waitFor();assert.equal(await page.getByRole('link',{name:/Proceed to Payment Gateway/}).count(),0);
  await db.collection('registrations').updateOne({eventSlug:slug},{$set:{paymentDeadline:'2099-01-01'}});
  await page.goto('http://127.0.0.1:5175'+path,{waitUntil:'networkidle'});await actions.getByRole('link',{name:/Complete Registration/}).waitFor();
  await db.collection('registrations').updateOne({eventSlug:slug},{$set:{paymentStatus:'Confirmed',admissionStatus:'Pending'}});
  await page.reload({waitUntil:'networkidle'});assert.equal(await actions.getByRole('link',{name:/Registration|Materials|Open LMS/}).count(),0);await actions.getByText('Admission under review',{exact:true}).waitFor();
  await db.collection('registrations').updateOne({eventSlug:slug},{$set:{admissionStatus:'Confirmed'}});
  if(index<2){await page.reload({waitUntil:'networkidle'});await actions.getByRole('link',{name:/Access Materials/}).waitFor();assert.equal(await actions.getByRole('link',{name:/Registration/}).count(),0);await actions.getByRole('link',{name:/Access Materials/}).click();await page.waitForFunction(()=>document.body.textContent.includes('PRIVATE PHASE MATERIAL'));}
  else{await page.reload({waitUntil:'networkidle'});await actions.getByRole('link',{name:/Open LMS/}).click();await page.waitForFunction(()=>document.body.textContent.includes('PRIVATE PHASE MATERIAL'));}
  await c.close();console.log(`Passed participant/payment/materials states: ${slug}`);
 }
 // Verify both existing full editors load, edit, save and reopen phase buttons.
 const admin=await login('phase-admin@example.invalid'),c=await context(1440,admin),page=await c.newPage();page.on('dialog',d=>{void d.accept().catch(()=>{});});page.on('pageerror',e=>errors.push(e.stack||e.message));
 await page.goto('http://127.0.0.1:5175/events/qa-phase-event',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Edit Event',exact:true}).click();await page.getByRole('button',{name:'2. Admissions & Fees',exact:true}).click();
 const editor=page.getByRole('region',{name:'Phase buttons'});await editor.getByLabel('Phase / deadline title').first().fill('Abstract deadline');await editor.getByRole('button',{name:'Add button',exact:true}).last().click();
 const button=editor.locator('.phase-button').last();await button.getByLabel('Button label',{exact:true}).fill('Phase guidance');await button.getByLabel('Action',{exact:true}).selectOption('link');await button.getByLabel('Show to',{exact:true}).selectOption('everyone');await button.getByLabel(/Destination/).fill('https://example.invalid/guidance');
 const saved=page.waitForResponse(r=>r.url().includes('/api/events/')&&r.request().method()==='PUT');await page.getByRole('button',{name:/Save Event Modifications/}).first().click();{const response=await saved;assert.equal(response.status(),200,await response.text());}console.log('Event phase settings saved');
 assert.equal((await db.collection('events').findOne({slug:'qa-phase-event'})).registrationCard.actionPhases[1].buttons[2].label,'Phase guidance');
 await page.goto('http://127.0.0.1:5175/admin?tab=courses',{waitUntil:'networkidle'});await page.getByRole('button',{name:'Courses',exact:true}).click();await page.getByRole('button',{name:/^Ongoing \(/}).click();await page.getByRole('heading',{name:'[QA-PHASE] QA Phase Course',exact:true}).locator('../..').getByRole('button',{name:'Edit / Manage',exact:true}).click();
 const courseEditor=page.getByRole('region',{name:'Phase buttons'});await courseEditor.getByLabel('Phase / deadline title').last().fill('Registration period');
 const courseSaved=page.waitForResponse(r=>r.url().includes('/api/lms/courses/')&&r.request().method()==='PUT');await page.getByRole('button',{name:/Save Changes|Update Course/}).first().click();{const response=await courseSaved;assert.equal(response.status(),200,await response.text());}
 assert.equal((await db.collection('courses').findOne({slug:'qa-phase-course'})).registrationCard.actionPhases[1].title,'Registration period');
 await c.close();assert.deepEqual(errors,[]);console.log(process.env.QA_PHASE_EDITOR_ONLY?'Passed saving and preserving phase buttons in both editors.':'Passed phase transitions, eligible buttons, expired payments, paid access, desktop/mobile views, and both phase editors.');
}catch(error){console.error(error);if(browser)for(const c of browser.contexts())for(const p of c.pages())await p.screenshot({path:'/tmp/codin-phase-editor-failure.png',fullPage:true}).catch(()=>{});throw error;}finally{if(browser)await browser.close();api.kill('SIGTERM');front.kill('SIGTERM');await new Promise(r=>setTimeout(r,500));await db.dropDatabase();await mongoose.disconnect();}
