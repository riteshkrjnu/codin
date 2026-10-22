import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import crypto from 'node:crypto';import {spawn} from 'node:child_process';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
const root=fileURLToPath(new URL('../',import.meta.url)),uri=process.env.QA_MONGODB_URI,name='codin_qa_design_'+Date.now();
assert.ok(uri && /^mongodb:\/\/127\.0\.0\.1:27019\//.test(uri), 'Browser tests require the isolated local QA replica on port 27019; Atlas is never allowed.');
await mongoose.connect(uri,{dbName:name});const db=mongoose.connection.db,admin=new mongoose.Types.ObjectId(),student=new mongoose.Types.ObjectId();
const salt=crypto.randomBytes(16).toString('hex'),password='design-qa-password',hash='v2:'+salt+':'+crypto.pbkdf2Sync(password,salt,210000,64,'sha512').toString('hex');
await db.collection('users').insertMany([{_id:admin,email:'design-admin@example.invalid',password:hash,name:'QA Editor',role:'superadmin'},{_id:student,email:'design-student@example.invalid',password:hash,name:'QA Learner',role:'student'}]);
await db.collection('projects').insertMany(['tholkudi','kailash','suvadugal'].map((slug,i)=>({slug,id:'QA-'+i,title:['Tholkudi','Project Kailash','Suvadugal'][i],tag:['Culture & archives','Language & technology','Heritage & preservation'][i],description:'QA record for visual and functional checks of real app rendering.',longDescription:'## A question in context\nDocumentation and shared practice.',methodology:'Listen, document and review.',status:i===2?'Archived':'Ongoing',startDate:'2025-01-01',associatedCentres:['digital-preservation'],image:'/designs/assets/landscape.jpg',updatedAt:new Date(),aims:['Keep context alongside a record.'],subPages:slug==='tholkudi'?[{slug:'custom-six',title:'QA custom section six',type:'markdown',content:{markdown:'QA custom content retained.'}},{slug:'custom-seven',title:'QA custom section seven',type:'markdown',content:{markdown:'QA second custom chapter.'}}]:[],openPositions:slug==='tholkudi'?[{title:'QA field researcher',description:'QA opportunity for modal verification.',deadline:'2099-01-01'}]:[]})));
await db.collection('projects').insertOne({slug:'qa-clock-project',id:'QA-CLOCK',tag:'QA dates',title:'QA Scheduled Project',description:'Synthetic date transition record.',status:'Upcoming',startDate:'2098-01-01',endDate:'2098-01-02'});
await db.collection('centres').insertMany([{slug:'digital-preservation',name:'Centre for Digital Preservation of Linguistic and Cultural Heritage',shortName:'CDP-LCH',description:'QA centre: documentation, preservation and access.',aims:['How does context travel with the record?'],projects:['tholkudi','suvadugal'],people:['qa-researcher'],courses:['qa-course'],publications:[{title:'QA publication without link',authors:'QA Researcher',year:'2026'}]}, {slug:'diversity-ai-nlp',name:'Centre for Diversity in AI and NLP',shortName:'CD-AINLP',description:'QA centre: language and technology.',aims:['How do more languages shape technology?'],projects:['kailash']},{slug:'linguistic-cultural-diversity',name:'Centre for Linguistic and Cultural Diversity',shortName:'CL-CD',description:'QA centre: language, place and cultural knowledge.',aims:['What context should fieldwork retain?']}]);
await db.collection('projects').insertOne({slug:'qa-extra-project',id:'QA-EXTRA',tag:'Research',title:'QA Additional Active Project',description:'Fourth active shelf project.',status:'Ongoing'});
await db.collection('people').insertMany([{slug:'qa-staff',name:'QA Staff',fullName:'QA Staff',role:'Research staff',bio:'Staff profile.',boardMemberType:'staff',image:'/designs/assets/landscape.jpg'},{slug:'qa-external',name:'QA External',fullName:'QA External',role:'Collaborator',bio:'External profile.',boardMemberType:'external',image:'/designs/assets/landscape.jpg'}]);
await db.collection('people').insertOne({slug:'qa-researcher',name:'QA Researcher',fullName:'QA Researcher',role:'Researcher',bio:'QA biography for layout checks. '.repeat(40),bannerImages:['/designs/assets/landscape.jpg','/designs/assets/landscape.jpg?cover=2'],scholarStats:{citations:12,hIndex:3,i10Index:1},boardMemberType:'board',centres:['digital-preservation'],image:'/designs/assets/landscape.jpg',publications:['[Shared community archives](https://example.invalid/paper) (2025) [Citations: 3]', 'Earlier fieldwork (2022)'],scholarPublications:[{title:'Shared community archives',year:'2025',citationCount:5,link:'https://example.invalid/paper'},{title:'Language documentation',year:'2026',citationCount:1}],email:'design-admin@example.invalid'});
const courseId=new mongoose.Types.ObjectId();
await db.collection('courses').insertMany([{_id:courseId,__v:0,slug:'qa-course',title:'QA Field Methods',type:'Online Course',status:'Ongoing',startDate:'2020-01-01',endDate:'2099-01-01',description:'QA learning programme.',createdBy:admin,modules:1,outline:['Listening'],subPages:[{slug:'venue',title:'Venue information',type:'logistics',content:{venue:'QA local field station',travel:'QA travel instructions.'}},{slug:'programme',title:'Programme',type:'schedule',content:{scheduleDays:[{name:'Day one',sessions:[{sessionName:'QA public listening session',timeLabel:'09:00',entries:[{topic:'QA public demonstration',speaker:'QA Researcher'}]}]},{name:'Day two',sessions:[{sessionName:'QA public review',timeLabel:'10:00'}]}]}}],associatedCentres:['digital-preservation'],image:'/designs/assets/landscape.jpg',instructors:[],tas:[],fee:0,modulesList:[{_id:'m1',title:'Listening before recording',description:'QA module',materials:[{_id:'a',title:'Protected QA lesson',type:'text',text:'PRIVATE QA CONTENT MUST BE PROTECTED',group:'Readings'}]}]},{slug:'qa-residential',__v:0,title:'QA Residential Practice',type:'W2M Residential Course',status:'Upcoming',startDate:'2099-01-01',endDate:'2099-01-05',description:'QA residential programme.',curriculum:['Listening in context'],modulesList:[]}]);
await db.collection('events').insertMany([{slug:'qa-event',__v:0,title:'QA Language Working Week',type:'Working week',status:'Ongoing',startDate:'2020-01-01',endDate:'2099-01-01',description:'QA event description.',registrationCard:{buttonText:'Submit Paper',buttonLink:'https://example.invalid/submit-paper'},longDescription:'QA event details.',location:'QA Event Venue',modulesList:[{_id:'event-module',title:'Event materials',materials:[{_id:'event-reading',title:'QA event reading',type:'text',text:'PRIVATE QA EVENT MATERIAL'}]}],collaborators:[{name:'QA Organiser',logo:'/designs/assets/landscape.jpg',website:'https://example.invalid/organiser'}],sponsors:[{name:'QA Funder',logo:'/designs/assets/landscape.jpg',website:'https://example.invalid/funder'}],associatedCentres:['digital-preservation'],associatedProjects:['tholkudi'],subPages:[{slug:'overview',title:'Overview',type:'markdown',content:{markdown:'QA event overview'}},{slug:'registration',title:'Registration',type:'registration',content:{}},{slug:'mentors',title:'Mentors',type:'list',content:[{name:'QA Researcher',staffSlug:'qa-researcher',photoUrl:'/images/old-portrait.jpg'}]},{slug:'papers',title:'Accepted papers',type:'list',content:[{title:'QA paper with legacy title field',authors:'QA Researcher',abstract:'QA paper abstract.'}]}]}, {slug:'qa-archive',title:'QA Archived Workshop',type:'Workshop',status:'Archived',description:'QA event archive.',startDate:'2020-01-01',endDate:'2020-01-02'}]);
await db.collection('announcements').insertMany([{title:'QA Project announcement',description:'A dated project update.',date:'2026-10-20',status:'Ongoing',sourceId:'tholkudi',link:'/projects/tholkudi'},{title:'QA Custom council announcement',description:'A public custom announcement.',date:'2026-10-21',status:'Upcoming'}]);
await db.collection('resources').insertOne({slug:'qa-project-paper',title:'QA Project Publication',kind:'Publication',description:'A project research paper.',publicationState:'published',publishedAt:'2026-10-19',associatedProjects:['tholkudi'],url:'https://example.invalid/project-paper'});
await db.collection('events').insertMany(Array.from({length:4},(_,i)=>({slug:`qa-upcoming-${i}`,title:`QA Upcoming gathering ${i+1}`,type:'Workshop',status:'Upcoming',startDate:new Date(Date.now()+(i+1)*86400000).toISOString().slice(0,10),endDate:new Date(Date.now()+(i+1)*86400000).toISOString().slice(0,10),associatedProjects:['tholkudi']})));
await db.collection('resources').insertOne({slug:'qa-showcase',__v:0,title:'QA Photo Essay',kind:'Blog',categories:['Photo Essays'],publicationState:'published',publishedAt:'2026-01-01',associatedEvents:['qa-event'],document:{version:1,blocks:[{id:'photo',type:'image',url:'http://127.0.0.1:5173/designs/assets/landscape.jpg',alt:'QA field landscape',caption:'A place in context.'}]}});
await db.collection('resources').insertOne({slug:'qa-toolkit',__v:0,title:'QA Documentation Toolkit',kind:'Toolkit',description:'QA reusable material.',body:'## Read and reuse\nQA documentation.',publicationState:'published',publishedAt:new Date().toISOString(),associatedProjects:['tholkudi'],associatedCentres:['digital-preservation'],url:'https://example.invalid/qa-toolkit',licence:'QA only'});
const env={...process.env,NODE_ENV:'development',MONGODB_URI:uri,MONGODB_DB_NAME:name,PORT:'3097',APP_URL:'http://127.0.0.1:5173',PUBLIC_API_URL:'http://127.0.0.1:3097',CORS_ORIGINS:'http://127.0.0.1:5173',SERVE_FRONTEND:'false',OUTBOUND_ENABLED:'false'};
const api=spawn(process.execPath,['--import','tsx','server.ts'],{cwd:root,env,stdio:'ignore'});
const front=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5173','--strictPort'],{cwd:root,env:{...process.env,DISABLE_HMR:'true',VITE_API_BASE_URL:'http://127.0.0.1:3097'},stdio:'ignore'});
let browser;const errors=[],checks=[];const screenshots=process.env.QA_SCREENSHOTS || '/tmp/codin-regression-review';await fs.mkdir(screenshots,{recursive:true});
async function ready(url){for(let i=0;i<100;i++){try{if((await fetch(url)).ok)return;}catch{}await new Promise(r=>setTimeout(r,200));}throw Error('Server did not become ready: '+url);}
try{
 await Promise.all([ready('http://127.0.0.1:3097/health/ready'),ready('http://127.0.0.1:5173')]);
 assert.equal((await fetch('http://127.0.0.1:3097/')).status,404,'API-only server must not serve React');
 const pre=await fetch('http://127.0.0.1:3097/api/courses',{method:'OPTIONS',headers:{Origin:'http://127.0.0.1:5173','Access-Control-Request-Method':'PATCH','Access-Control-Request-Headers':'authorization,content-type'}});assert.equal(pre.headers.get('access-control-allow-origin'),'http://127.0.0.1:5173');assert.equal(pre.headers.get('access-control-allow-credentials'),'true');
 assert.equal((await fetch('http://127.0.0.1:3097/api/projects',{headers:{Origin:'https://untrusted.invalid'}})).headers.get('access-control-allow-origin'),null);
 const pub=await fetch('http://127.0.0.1:3097/api/courses/qa-course').then(r=>r.json());assert.equal(pub.course.modulesList[0].materials.length,0);
 assert.equal((await fetch('http://127.0.0.1:3097/api/projects').then(r=>r.json())).projects.find(p=>p.slug==='tholkudi').status,'Ongoing');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const width of (process.env.QA_LAYOUT_ONLY ? [] : [1440,390])){
 const c=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});await c.route('**/*',route=>['http://127.0.0.1:5173','http://127.0.0.1:3097'].some(origin=>route.request().url().startsWith(origin))?route.continue():route.abort());const p=await c.newPage();p.setDefaultTimeout(10000);p.on('pageerror',e=>errors.push(e.message));p.on('dialog',dialog=>dialog.accept());
 for(const [path,screen] of [['/','home'],['/academy','academy'],['/academy/online','online-list'],['/academy/residential','residential-list'],['/academy/online/qa-course','course'],['/academy/residential/qa-residential','residential'],['/centres','centres'],['/centres/digital-preservation','centre'],['/events','events'],['/events/qa-event','event'],['/projects','projects'],['/projects/tholkudi','project'],['/resources','resources'],['/resources/qa-toolkit','resource'],['/people','people'],['/people/qa-researcher','person'],['/about/vision-mission','about'],['/about/board','board'],['/about/rab','rab'],['/academy/custom','custom']]){
  await p.goto('http://127.0.0.1:5173'+path,{waitUntil:'networkidle'});await p.locator('h1').first().waitFor();assert.equal(await p.locator('h1').count(),1,screen);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`Overflow: ${screen} ${width}`);
  assert.ok(!(await p.locator('main').textContent()).includes('PRIVATE QA CONTENT'),screen);
  if(screen==='home'){const labels=p.locator('[aria-label="Filter by area"]');await labels.getByRole('button',{name:'Events',exact:true}).click();await p.getByLabel('Activity status').selectOption('Archived');assert.equal(await p.locator('.activity-feed .feed-row').count(),1);await labels.getByRole('button',{name:'CoDIN Commons'}).click();assert.equal(await p.locator('.desk-toolbar select').count(),0);await labels.getByRole('button',{name:'All activities',exact:true}).click();const b=p.locator('.story-title').first();await b.click();await p.getByRole('dialog').waitFor();await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'detached'});assert.equal(await b.evaluate(el=>document.activeElement===el),true);}
  if(screen==='resources'){await p.getByPlaceholder('Search by title or topic').fill('nothingmatches');assert.equal(await p.locator('.library-card').count(),0);await p.getByPlaceholder('Search by title or topic').clear();}
  if(['academy','centres','projects','events','people','resources'].includes(screen)){
   const directory=p.locator('.workspace-directory');await directory.waitFor({state:'visible'});
   if(width>700){const geometry=await p.evaluate(()=>{const d=document.querySelector('.workspace-directory').getBoundingClientRect(),body=document.querySelector('.workspace-page').getBoundingClientRect(),main=document.querySelector('#main-content').getBoundingClientRect();return {right:d.right,left:body.left,mainLeft:main.left,mainWidth:main.width,clientWidth:document.body.getBoundingClientRect().width};});assert.ok(geometry.right<=geometry.left+1,'Directory overlaps the page');assert.equal(geometry.mainLeft,0,'Workspace has inherited page margins');assert.equal(geometry.mainWidth,geometry.clientWidth);}
  }
  if(screen==='person'){assert.equal(await p.getByRole('heading',{name:'Research & biography',exact:true}).count(),0);assert.equal(await p.locator('.profile-cover').count(),1,'Separate cover gallery restored');assert.equal(await p.locator('.record-chapter').first().getAttribute('aria-label'),'Publications');await p.getByRole('button',{name:'Read full biography'}).click();assert.equal(await p.locator('.person-biography').evaluate(el=>el.scrollHeight<=el.clientHeight+1),true);await p.getByRole('button',{name:'Show less',exact:false}).click();await p.getByRole('button',{name:'Next cover'}).click();assert.match(await p.locator('.profile-cover figcaption').innerText(),/Cover 2 of \d+/);assert.equal(await p.locator('.person-summary .person-portrait').count(),1);}
  if(screen==='event'){assert.equal(await p.locator('.record-partner-strip').getByRole('heading',{name:'Organisers & collaborators',exact:true}).count(),1);assert.equal(await p.locator('.record-partner-strip').getByRole('heading',{name:'Sponsors & funders',exact:true}).count(),1);assert.equal(await p.locator('.event-record-heading').getByRole('link',{name:'QA Organiser',exact:true}).count(),1,'Event credits appear once');assert.equal(await p.locator('.event-record-heading').getByRole('link',{name:'Submit Paper',exact:true}).getAttribute('href'),'https://example.invalid/submit-paper');assert.equal(await p.locator('.event-record-heading').getByRole('link',{name:/Registration/}).count(),0);if(width===1440){const logoRows=await p.locator('.record-partner-strip .organisation-tile').evaluateAll(items=>items.map(el=>Math.round(el.getBoundingClientRect().top)));assert.equal(new Set(logoRows).size,1,'Partner logos share one row when space permits');}assert.equal(await p.getByText('Event Collaborators',{exact:true}).count(),0);}
  await p.evaluate(()=>{document.activeElement?.blur();scrollTo(0,0)});await p.screenshot({path:`${screenshots}/${screen}-${width}.png`,fullPage:true});checks.push(screen+'-'+width);
 }
 // The landing desk defaults to both live lifecycle states and project-related work.
 await p.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});
 await p.getByRole('heading',{name:'Empowering Communities. Supporting Diversity.',exact:true}).waitFor();
 assert.equal(await p.getByLabel('Activity status').inputValue(),'Active');
 assert.equal(await p.locator('.bento-tile').count(),7);
 const projectTile=p.locator('.bento-projects');const oldStory=await projectTile.locator('h2').innerText();await projectTile.getByRole('button',{name:'Next Projects story'}).click();await p.waitForFunction(old=>document.querySelector('.bento-projects h2')?.textContent!==old,oldStory);
 const opener=projectTile.locator('.bento-open');await opener.click();await p.getByRole('dialog').waitFor();assert.equal(await p.getByRole('dialog').evaluate(d=>Math.round(d.getBoundingClientRect().width)),width);await p.keyboard.press('Escape');await p.getByRole('dialog').waitFor({state:'detached'});assert.equal(await opener.evaluate(el=>document.activeElement===el),true);

 assert.equal(await p.locator('.sidebar-purpose').count(),0);
 assert.ok(await p.locator('.follow-grid .follow-card:not(.academy-card)').count()>=4);
 assert.ok(await p.locator('.diary-list .diary-event').count()>=6);
 assert.equal(await p.getByRole('button',{name:'All upcoming',exact:true}).getAttribute('aria-pressed'),'true');
 await p.getByRole('button',{name:'Next 7 days',exact:true}).click();assert.equal(await p.locator('.diary-event').count(),4);await p.getByRole('button',{name:'All upcoming',exact:true}).click();
 const feedDates=await p.locator('.activity-feed time').evaluateAll(rows=>rows.map(row=>Date.parse(row.getAttribute('datetime'))).filter(Number.isFinite));
 assert.deepEqual(feedDates,[...feedDates].sort((a,b)=>a-b));
 await p.locator('.activity-main [aria-label="Filter by area"]').getByRole('button',{name:'Projects',exact:true}).click();
 await p.locator('.activity-feed').getByRole('button',{name:'QA Project announcement',exact:true}).waitFor();
 await p.locator('.activity-feed').getByRole('button',{name:'QA Project Publication',exact:true}).waitFor();
 assert.equal(await p.locator('.activity-feed').getByRole('button',{name:'Tholkudi',exact:true}).count(),0);
 await p.goto('http://127.0.0.1:5173/events',{waitUntil:'networkidle'});assert.match(await p.locator('.event-date-range').first().innerText(),/2020.*2099/);
 await p.goto('http://127.0.0.1:5173/projects',{waitUntil:'networkidle'});await p.locator('.project-directory').waitFor();
 // Academy bookmarks and Events links share the same residential controller.
 await p.goto('http://127.0.0.1:5173/academy/residential/qa-residential',{waitUntil:'networkidle'});
 await p.waitForURL(url=>url.pathname==='/events/qa-residential'&&url.searchParams.get('from')==='academy');
 await p.getByRole('button',{name:'Show W2M Academy sidebar'}).waitFor();assert.equal(await p.getByRole('link',{name:'Back to W2M Academy',exact:true}).getAttribute('href'),'/academy/residential');
 await p.locator('[data-record-section="course-overview"]').click();await p.getByRole('dialog').getByRole('heading',{name:'Listening in context',exact:true}).waitFor();
 await p.getByRole('button',{name:'Close to Atlas ×'}).click();
 await p.goto('http://127.0.0.1:5173/events/qa-residential?isCourse=true&from=events',{waitUntil:'networkidle'});
 await p.getByRole('button',{name:'Show Events sidebar'}).waitFor();
 assert.equal(await p.getByRole('link',{name:/Access Materials/i}).count(),0,'Anonymous visitors cannot enter the LMS');
 await p.goto('http://127.0.0.1:5173/events/qa-event?section=mentors',{waitUntil:'networkidle'});
 assert.equal(await p.getByRole('dialog').locator('.record-chapter[aria-label="Mentors"] img').getAttribute('src'),'/designs/assets/landscape.jpg');
 // A slow request must show loading, never a false missing-profile message.
 await p.route('**/api/people',async route=>{await new Promise(resolve=>setTimeout(resolve,900));await route.continue();});
 await p.goto('http://127.0.0.1:5173/people/qa-researcher',{waitUntil:'domcontentloaded'});
 await p.getByText('Loading profile…',{exact:true}).waitFor();assert.equal(await p.getByText('Profile Not Found',{exact:true}).count(),0);
 await p.getByRole('heading',{name:'QA Researcher',exact:true}).waitFor();await p.unroute('**/api/people');
 // Affiliation filters agree across the main directory and its sidebar.
 await p.goto('http://127.0.0.1:5173/people',{waitUntil:'networkidle'});
 await p.getByLabel('People affiliation',{exact:true}).selectOption('staff');await p.waitForFunction(()=>document.querySelectorAll('.person-card').length===1&&document.querySelector('.person-card')?.textContent.includes('QA Staff'));
 assert.equal(await p.locator('.person-card').count(),1);assert.match(await p.locator('.person-card').innerText(),/QA Staff/);
 assert.equal(await p.getByLabel('Sidebar affiliation').inputValue(),'staff');
 await p.getByLabel('Sidebar affiliation').selectOption('external');await p.waitForFunction(()=>document.querySelectorAll('.person-card').length===1&&document.querySelector('.person-card')?.textContent.includes('QA External'));assert.equal(await p.locator('.person-card').count(),1);assert.match(await p.locator('.person-card').innerText(),/QA External/);
 assert.equal(await p.locator('.person-photo img').evaluate(el=>getComputedStyle(el).objectFit),'contain');
 // Materials remain hidden for anonymous visitors, including in At a Glance.
 await p.goto('http://127.0.0.1:5173/events/qa-event?section=overview',{waitUntil:'networkidle'});
 if(!await p.locator('.record-glance details').evaluate(el=>el.open))await p.locator('.record-glance summary').click();
 const organiser=p.locator('.record-glance .organisation-grid a').filter({has:p.getByRole('img',{name:'QA Organiser',exact:true})});
 assert.equal(await organiser.getAttribute('href'),'https://example.invalid/organiser');
 assert.equal(await p.locator('.record-glance').getByText('Research homes',{exact:true}).count(),0);
 // The live presentation retains section history, mounted form state and directory navigation.
 await p.goto('http://127.0.0.1:5173/projects',{waitUntil:'networkidle'});
 const directory=p.getByRole('complementary',{name:'Projects directory'});
 await directory.getByRole('searchbox').fill('Tholkudi');
 await directory.getByRole('link',{name:/Tholkudi/}).click();
 await p.waitForURL('**/projects/tholkudi');await directory.waitFor({state:'hidden'});
 await p.getByRole('button',{name:'Show Projects sidebar'}).click();
 assert.equal(await directory.getByRole('searchbox').inputValue(),'Tholkudi');
 await p.getByRole('button',{name:'Collapse Projects sidebar'}).click();
 const atlas=p.locator('[data-record-section="methodology"]');await atlas.click();
 const reader=p.getByRole('dialog');await reader.waitFor();await p.waitForURL('**section=methodology');
 assert.equal(await reader.locator('[aria-label="Methodology"]').getAttribute('data-loaded'),'true');
 assert.equal(await reader.locator('.record-glance .glance-fact-list').count(),1);assert.equal(await reader.getByText('Project Phase Status',{exact:true}).count(),0,'Glance must not embed the former sidebar');
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'Expanded reader overflow');
 async function section(slug){if(width<=1100)await reader.getByRole('combobox').selectOption(slug);else await reader.getByRole('navigation',{name:'Page sections'}).locator(`a[href*="section=${slug}"]`).click();}
 await section('aims');await p.waitForURL('**section=aims');await p.goBack();await p.waitForURL('**section=methodology');
 await p.reload({waitUntil:'networkidle'});await reader.waitFor();
 await reader.locator('[aria-label="Methodology"][data-loaded=true]').waitFor();
 await p.keyboard.press('Escape');await reader.waitFor({state:'hidden'});
 assert.equal(await atlas.evaluate(el=>document.activeElement===el),true,'Deep-link Close returns focus to Atlas');
 await atlas.click();await reader.getByRole('button',{name:'Close to Atlas ×'}).click();await reader.waitFor({state:'hidden'});
 await p.screenshot({path:`${screenshots}/atlas-${width}.png`,fullPage:true});
 await p.locator('[data-record-section="overview"]').click();await reader.waitFor();
 await p.screenshot({path:`${screenshots}/reader-${width}.png`,fullPage:true});
 // Scroll actually mounts the next chapter, rather than only changing the contents highlight.
 await reader.evaluate(el=>el.scrollTop=el.scrollHeight);
 await p.waitForFunction(()=>document.querySelector('.record-reader [aria-label="Methodology"]')?.dataset.loaded==='true');
 await reader.getByRole('button',{name:'Close to Atlas ×'}).click();
 await p.goto('http://127.0.0.1:5173/people/qa-researcher?section=publications',{waitUntil:'networkidle'});
 await p.getByLabel('Search publications').fill('Earlier');
 const notebook=p.locator('.record-reader-notebook');
 if(width<=1100){await notebook.getByRole('combobox').first().selectOption('background');await notebook.getByRole('combobox').first().selectOption('publications');}
 else {await notebook.getByRole('navigation',{name:'Page sections'}).locator('a[href*="section=background"]').click();await notebook.getByRole('navigation',{name:'Page sections'}).locator('a[href*="section=publications"]').click();}
 assert.equal(await p.getByLabel('Search publications').inputValue(),'Earlier','Mounted chapter retains filter state');
 checks.push('record-layout-interactions-'+width);
 // Disclosure navigation works with keyboard on desktop and touch-sized viewports.
 await p.goto('http://127.0.0.1:5173',{waitUntil:'networkidle'});
 const nav=p.getByRole('navigation',{name:'Website',exact:true});
 if(width<1150) await p.getByRole('button',{name:'Menu',exact:true}).click();
 const about=nav.getByRole('button',{name:'About',exact:true});
 await about.focus();await p.keyboard.press('ArrowDown');
 await nav.getByRole('link',{name:/^Vision and Mission/}).waitFor();
 assert.equal(await p.evaluate(()=>document.activeElement?.textContent),'Explore About →');
 await p.keyboard.press('Escape');assert.equal(await about.getAttribute('aria-expanded'),'false');
 await about.click();await nav.getByRole('link',{name:/^The Board & Leadership/}).click();
 await p.waitForURL('**/about/board');await p.locator('main h1').waitFor();await p.waitForLoadState('networkidle');
 if(width<1150) await p.getByRole('button',{name:'Menu',exact:true}).click();
 await nav.getByRole('button',{name:'Projects',exact:true}).click();
 await nav.getByRole('heading',{name:'Ongoing',exact:true}).waitFor();
 await nav.getByRole('link',{name:/^Tholkudi/}).click();await p.waitForURL('**/projects/tholkudi');
 if(width<1150) assert.equal(await p.getByRole('button',{name:'Menu',exact:true}).getAttribute('aria-expanded'),'false');
 await p.goto('http://127.0.0.1:5173/people/qa-researcher?section=publications',{waitUntil:'networkidle'});
 assert.equal(await p.locator('.publication-records > li').count(),3);
 await p.getByLabel('Year',{exact:true}).selectOption('2025');assert.equal(await p.locator('.publication-records > li').count(),1);
 assert.match(await p.locator('.publication-meta').textContent(),/5 citations/);
 await p.getByLabel('Year',{exact:true}).selectOption('all');await p.getByLabel('Search publications').fill('Earlier');
 assert.equal(await p.locator('.publication-records > li').count(),1);await p.getByLabel('Search publications').clear();
 assert.equal(await p.locator('.publication-citation a').first().getAttribute('href'),'https://example.invalid/paper');
 // Project career actions still open the existing controller-owned application form.
 await p.goto('http://127.0.0.1:5173/projects/tholkudi?section=staff',{waitUntil:'networkidle'});
 await p.getByRole('button',{name:'Apply through CoDIN ↗',exact:true}).click();await p.getByPlaceholder('e.g. Dr. Ramesh Kumar',{exact:true}).waitFor();
 await p.getByPlaceholder('e.g. Dr. Ramesh Kumar',{exact:true}).fill('QA unsent applicant draft');
 await p.getByRole('button',{name:'Close',exact:true}).click();
 // Anonymous readers must not receive editing controls on the real routes.
 for(const path of ['/projects','/events','/people']){await p.goto('http://127.0.0.1:5173'+path,{waitUntil:'networkidle'});assert.equal(await p.getByRole('button',{name:/Add New Research Project|Create New Event|^Edit$/}).count(),0);}
 checks.push('navigation-keyboard-and-publications-'+width);
 // Real API login and legacy LMS access on a separate origin.
 await p.goto('http://127.0.0.1:5173');
 await p.evaluate(async({password})=>{const r=await fetch('/api/lms/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'design-admin@example.invalid',password})});if(!r.ok)throw Error('Login failed');localStorage.setItem('lms_user',JSON.stringify(await r.json()));},{password});
 // Authenticated staff enter the event classroom directly, preserving its Events directory.
 await p.goto('http://127.0.0.1:5173/events/qa-event',{waitUntil:'networkidle'});
 await p.getByRole('link',{name:/Access Materials/i}).first().click();await p.waitForURL('**context=event');
 await p.locator('.learning-viewer').waitFor();assert.equal(await p.locator('.course-public-detail').count(),0);
 await p.getByRole('button',{name:'Show Events sidebar'}).click();await p.getByRole('navigation',{name:'Events records'}).getByRole('link',{name:/QA Language Working Week/}).waitFor();
 assert.equal(await p.getByRole('navigation',{name:'Course formats'}).count(),0);await p.reload({waitUntil:'networkidle'});await p.getByRole('button',{name:'Show Events sidebar'}).waitFor();
 if(width===1440){
  const learnerContext=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});
  await learnerContext.route('**/*',route=>['http://127.0.0.1:5173','http://127.0.0.1:3097'].some(origin=>route.request().url().startsWith(origin))?route.continue():route.abort());
  const learner=await learnerContext.newPage();learner.on('pageerror',e=>errors.push(e.message));
  await learner.addInitScript(()=>{window.__qaPublicLmsFlash=false;new MutationObserver(()=>{if(new URLSearchParams(location.search).get('learn')==='1'&&document.querySelector('.course-public-detail'))window.__qaPublicLmsFlash=true;}).observe(document,{childList:true,subtree:true});});
  await learner.goto('http://127.0.0.1:5173/',{waitUntil:'networkidle'});await learner.evaluate(async password=>{const response=await fetch('/api/lms/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'design-student@example.invalid',password})});localStorage.setItem('lms_user',JSON.stringify(await response.json()));},password);
  await learner.goto('http://127.0.0.1:5173/events/qa-event?simulate=enrolled',{waitUntil:'networkidle'});assert.equal(await learner.getByRole('link',{name:/Access Materials/i}).count(),0,'An unapproved account or preview cannot unlock materials');
  await db.collection('registrations').insertOne({eventSlug:'qa-event',email:'design-student@example.invalid',admissionStatus:'Confirmed',paymentStatus:'Pending'});
  await learner.goto('http://127.0.0.1:5173/events/qa-event',{waitUntil:'networkidle'});assert.equal(await learner.getByRole('link',{name:/Access Materials/i}).count(),0,'Pending payment does not unlock materials');assert.equal(await learner.locator('.event-record-heading').getByRole('link',{name:/Complete payment/}).count(),1);
  await db.collection('registrations').updateOne({eventSlug:'qa-event',email:'design-student@example.invalid'},{$set:{paymentStatus:'Confirmed'}});
  await learner.goto('http://127.0.0.1:5173/events/qa-event',{waitUntil:'networkidle'});
  const eventHeader=learner.locator('.event-record-heading');assert.ok(await eventHeader.locator('.event-heading-meta').evaluate(el=>!!(el.compareDocumentPosition(el.parentElement.querySelector('h1'))&Node.DOCUMENT_POSITION_FOLLOWING)));
  assert.match(await eventHeader.locator('.event-heading-venue a').getAttribute('href'),/maps/);assert.equal(await eventHeader.getByRole('link',{name:/Registration|Submit Paper/}).count(),0,'Materials access replaces registration or submission');
  await eventHeader.getByRole('link',{name:/Access Materials/i}).click();await learner.waitForFunction(()=>document.body.textContent.includes('PRIVATE QA EVENT MATERIAL'));assert.equal(await learner.evaluate(()=>window.__qaPublicLmsFlash),false,'Direct LMS entry never renders the public overview');
  await db.collection('registrations').deleteMany({eventSlug:'qa-event',email:'design-student@example.invalid'});await learner.goto('http://127.0.0.1:5173/events/qa-event',{waitUntil:'networkidle'});assert.equal(await learner.getByRole('link',{name:/Access Materials/i}).count(),0,'Revoked access is reflected on reload');await learnerContext.close();
 }
 // Participation controls are in the registration chapter; summary facts stay compact.
 await p.goto('http://127.0.0.1:5173/events/qa-event?section=registration',{waitUntil:'networkidle'});
 const eventReader=p.getByRole('dialog');await eventReader.locator('.event-participation').waitFor();
 assert.equal(await eventReader.locator('.record-glance .record-registration-sidebar').count(),0);
 await eventReader.getByRole('button',{name:'Edit RSVP',exact:true}).click();
 const supportDraft=p.getByPlaceholder('e.g. Need logistical assistance, boarding passes, fee waivers, or travel sponsorships?');
 await supportDraft.fill('QA support instructions '+width);
 await eventReader.getByRole('button',{name:'Close to Atlas ×'}).click();await eventReader.waitFor({state:'hidden'});
 await p.locator('[data-record-section="registration"]').click();await eventReader.waitFor();
 assert.equal(await supportDraft.inputValue(),'QA support instructions '+width,'Participation draft survives closing');
 const supportSaved=p.waitForResponse(r=>r.url().includes('/api/events/')&&r.request().method()==='PUT');
 await eventReader.getByRole('button',{name:'Save RSVP',exact:true}).click();assert.equal((await supportSaved).status(),200);
 assert.equal((await db.collection('events').findOne({slug:'qa-event'})).supportOfficeText,'QA support instructions '+width);
 // Real project/event forms save through the API directly from their public routes.
 await p.goto('http://127.0.0.1:5173/projects',{waitUntil:'networkidle'});
 await p.getByRole('button',{name:'Add New Research Project'}).click();
 await p.getByPlaceholder('e.g. PROJ-001',{exact:true}).fill('QA-UI-'+width);
 await p.getByPlaceholder('e.g. Project Kailash',{exact:true}).fill('QA UI Project '+width);
 await p.getByPlaceholder('e.g. kailash',{exact:true}).fill('qa-ui-project-'+width);
 await p.getByPlaceholder('e.g. Flagship AI Initiative',{exact:true}).fill('QA only');
 await p.getByPlaceholder('e.g. 2024',{exact:true}).fill('2026');
 const projectCreated=p.waitForResponse(r=>r.url().endsWith('/api/projects')&&r.request().method()==='POST').catch(()=>null);
 await p.getByRole('button',{name:'Instantiate Research Project',exact:true}).click();assert.equal((await projectCreated).status(),200);
 await p.getByPlaceholder('e.g. PROJ-001',{exact:true}).waitFor({state:'detached'});
 await p.getByPlaceholder('Search by title or topic').fill('QA UI Project '+width);
 await p.getByRole('button',{name:'Edit',exact:true}).click();
 await p.getByPlaceholder('e.g. Project Kailash',{exact:true}).fill('QA UI Project Updated '+width);
 const projectUpdated=p.waitForResponse(r=>r.url().includes('/api/projects/qa-ui-project-')&&r.request().method()==='PUT').catch(()=>null);
 await p.getByRole('button',{name:'Save Pipeline Dossier',exact:true}).click();assert.equal((await projectUpdated).status(),200);
 await p.getByPlaceholder('e.g. PROJ-001',{exact:true}).waitFor({state:'detached'});
 assert.equal((await db.collection('projects').findOne({slug:'qa-ui-project-'+width})).title,'QA UI Project Updated '+width);
 // Provider-backed menus and homepage refresh when the existing editors save.
 await p.getByPlaceholder('Search by title or topic').clear();
 await p.goto('http://127.0.0.1:5173/events',{waitUntil:'networkidle'});
 await p.getByRole('button',{name:'Create New Event',exact:true}).click();
 await p.getByPlaceholder('e.g. Diversity AI NLP Summit 2026').fill('QA UI Event '+width);
 await p.getByPlaceholder('e.g. IIIT Delhi, Okhla Phase III').fill('QA local venue');
 await p.getByPlaceholder('Shorthand summary displayed on listings...').fill('QA event form creation.');
 await p.locator('input[type=date]').nth(0).fill('2020-01-01');await p.locator('input[type=date]').nth(1).fill('2099-01-01');
 const eventCreated=p.waitForResponse(r=>r.url().includes('/api/events?')&&r.request().method()==='POST').catch(()=>null);
 await p.getByRole('button',{name:/Publish Agenda Event/}).first().click();{const response=await eventCreated;assert.ok(response,'No event creation response');assert.equal(response.status(),200,await response.text());}
 await p.getByPlaceholder('e.g. Diversity AI NLP Summit 2026').waitFor({state:'detached'});
 // Default event filter is Ongoing; selecting All exposes the new upcoming event too.
 await p.getByLabel('Activity status').selectOption('All');
 await p.getByPlaceholder('Search by title or topic').fill('QA UI Event '+width);
 await p.locator('.event-entry').filter({has:p.getByRole('heading',{name:'QA UI Event '+width,exact:true})}).getByRole('button',{name:'Edit',exact:true}).click();
 await p.getByPlaceholder('e.g. Diversity AI NLP Summit 2026').fill('QA UI Event Updated '+width);
 const eventUpdated=p.waitForResponse(r=>r.url().includes('/api/events/')&&r.request().method()==='PUT').catch(()=>null);
 await p.getByRole('button',{name:/Save Modifications/}).first().click();{const response=await eventUpdated;assert.ok(response,'No event edit response');assert.equal(response.status(),200,await response.text());}
 await p.getByPlaceholder('e.g. Diversity AI NLP Summit 2026').waitFor({state:'detached'});
 const savedEvent=await db.collection('events').findOne({title:'QA UI Event Updated '+width});assert.ok(savedEvent);
 await p.reload({waitUntil:'networkidle'});await p.getByLabel('Activity status').selectOption('All');
 await p.getByPlaceholder('Search by title or topic').fill('QA UI Event Updated '+width);
 await p.getByRole('button',{name:'Delete',exact:true}).click();
 // The legacy delete confirmation is explicit; the record must be recoverable.
 const confirmDelete=p.getByRole('button',{name:'Move to Trash',exact:true}).last();
 if(await confirmDelete.count()) await confirmDelete.click();
 await p.waitForTimeout(500);
 assert.equal((await db.collection('events').findOne({_id:savedEvent._id})).deleted,true);
 await p.getByLabel('Activity status').selectOption('Trash');await p.getByRole('button',{name:'Restore',exact:true}).click();await p.waitForTimeout(500);assert.equal((await db.collection('events').findOne({_id:savedEvent._id})).deleted,false);
 await p.goto('http://127.0.0.1:5173/people',{waitUntil:'networkidle'});
 await p.getByRole('button',{name:'Add New Person',exact:true}).click();await p.getByRole('button',{name:'Register Profile',exact:true}).waitFor();
 await p.goto('http://127.0.0.1:5173/people/qa-researcher',{waitUntil:'networkidle'});
 await p.getByRole('button',{name:'Modify Scholar Profile',exact:true}).click();await p.getByRole('button',{name:'Cancel Edits',exact:true}).waitFor();
 await p.getByPlaceholder('Senior Instructor of Quantitative Phonetics').fill('QA Researcher Updated '+width);
 let coverUploads=0;
 await p.route('**/api/upload-cloudinary',route=>{coverUploads++;return route.fulfill({json:{success:true,url:`/designs/assets/landscape.jpg?uploaded=${width}-${coverUploads}`}});});
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aPioAAAAASUVORK5CYII=','base64');
 await p.getByLabel('Upload cover images').setInputFiles([{name:'cover-one.png',mimeType:'image/png',buffer:png},{name:'cover-two.png',mimeType:'image/png',buffer:png}]);
 await p.waitForFunction(()=>document.querySelector('[aria-label="Upload cover images"]')?.disabled===false);
 assert.equal(coverUploads,2);
 const profileSaved=p.waitForResponse(r=>r.url().includes('/api/people/qa-researcher')&&r.request().method()==='PUT');
 await p.getByRole('button',{name:'Save Overrides',exact:true}).click();assert.equal((await profileSaved).status(),200);
 assert.equal((await db.collection('people').findOne({slug:'qa-researcher'})).role,'QA Researcher Updated '+width);
 assert.ok((await db.collection('people').findOne({slug:'qa-researcher'})).bannerImages.some(url=>url.includes(`uploaded=${width}-2`)));
 await p.unroute('**/api/upload-cloudinary');
 await p.goto('http://127.0.0.1:5173/centres/digital-preservation',{waitUntil:'networkidle'});
 await p.getByRole('button',{name:'Modify Centre Dossier',exact:true}).click();await p.getByRole('button',{name:'Save Dossier & Synchronize DB',exact:true}).waitFor();
 await p.getByText('Executive Summary Description',{exact:true}).locator('..').locator('textarea').fill('QA centre summary updated '+width);
 const centreSaved=p.waitForResponse(r=>r.url().includes('/api/centres/digital-preservation')&&r.request().method()==='PUT');
 await p.getByRole('button',{name:'Save Dossier & Synchronize DB',exact:true}).click();assert.equal((await centreSaved).status(),200);
 assert.equal((await db.collection('centres').findOne({slug:'digital-preservation'})).description,'QA centre summary updated '+width);
 await p.goto('http://127.0.0.1:5173/projects/tholkudi',{waitUntil:'networkidle'});
 await p.getByRole('button',{name:'CMS // Edit Project Details',exact:true}).click();await p.getByPlaceholder('e.g. Project Kailash',{exact:true}).waitFor();
 await p.goto('http://127.0.0.1:5173/admin',{waitUntil:'networkidle'});
 await p.getByRole('button',{name:'Courses',exact:true}).click();await p.getByRole('button',{name:'+ New Course',exact:true}).click();
 await p.getByRole('button',{name:'Create Course',exact:true}).waitFor();
 await p.getByText('Course Title',{exact:true}).locator('..').locator('input').fill('QA UI Course '+width);
 await p.getByText('Description',{exact:true}).locator('..').locator('textarea').fill('A synthetic QA course, created through the existing course form.');
 const courseCreated=p.waitForResponse(r=>r.url().includes('/api/lms/courses')&&r.request().method()==='POST').catch(()=>null);
 await p.getByRole('button',{name:'Create Course',exact:true}).click();
 {const response=await courseCreated;assert.ok(response,'Course creation response');assert.equal(response.status(),200,await response.text());}
 assert.ok(await db.collection('courses').findOne({title:'QA UI Course '+width}));
 // Both public editors update the same residential overview and its order.
 await p.goto('http://127.0.0.1:5173/events/qa-residential?isCourse=true&from=events',{waitUntil:'networkidle'});
 await p.getByRole('button',{name:'Edit Event',exact:true}).click();await p.getByRole('button',{name:'5. Dossier Pages, Schedules & Resources',exact:true}).click();
 await p.getByLabel('Module 1 details',{exact:true}).fill('QA overview edited through Events '+width);
 await p.getByLabel('Course overview position',{exact:true}).selectOption('0');
 const residentialEventSaved=p.waitForResponse(r=>r.url().includes('/api/events/')&&r.request().method()==='PUT');
 await p.getByRole('button',{name:'Save Modifications 💾',exact:true}).click();assert.equal((await residentialEventSaved).status(),200);
 let residential=await db.collection('courses').findOne({slug:'qa-residential'});assert.equal(residential.subPages[0].type,'course_overview');assert.equal(residential.subPages[0].content.modules[0].description,'QA overview edited through Events '+width);
 await p.goto('http://127.0.0.1:5173/admin?tab=courses',{waitUntil:'networkidle'});await p.getByRole('button',{name:'Courses',exact:true}).click();await p.getByRole('button',{name:/^Upcoming \(/}).click();
 const residentialCard=p.getByRole('heading',{name:'QA Residential Practice',exact:true}).locator('../..');await residentialCard.getByRole('button',{name:'Edit / Manage',exact:true}).click();
 assert.equal(await p.getByLabel('Module 1 details',{exact:true}).inputValue(),'QA overview edited through Events '+width);
 await p.getByLabel('Module 1 details',{exact:true}).fill('QA overview edited through Course '+width);
 const residentialCourseSaved=p.waitForResponse(r=>r.url().includes('/api/lms/courses/')&&r.request().method()==='PUT');
 await p.getByRole('button',{name:'Update Course',exact:true}).click();assert.equal((await residentialCourseSaved).status(),200);
 residential=await db.collection('courses').findOne({slug:'qa-residential'});assert.equal(residential.subPages[0].content.modules[0].description,'QA overview edited through Course '+width);
 await p.goto('http://127.0.0.1:5173/events/qa-residential?isCourse=true&from=events&section=course-overview',{waitUntil:'networkidle'});await p.getByRole('dialog').getByText('QA overview edited through Course '+width,{exact:true}).waitFor();
 // Date changes propagate through the new layouts without saving/reloading records.
 await p.goto('http://127.0.0.1:5173/projects',{waitUntil:'networkidle'});
 await p.evaluate(()=>{window.__qaOriginalNow=Date.now;Date.now=()=>Date.parse('2098-01-01T12:00:00Z');window.dispatchEvent(new Event('focus'));});
 await p.getByLabel('Activity status').selectOption('Ongoing');await p.getByPlaceholder('Search by title or topic').fill('QA Scheduled Project');
 await p.getByRole('heading',{name:'QA Scheduled Project',exact:true}).waitFor();
 await p.getByRole('button',{name:'Edit',exact:true}).click();await p.getByPlaceholder('e.g. Project Kailash',{exact:true}).fill('An unsaved editor draft');
 await p.evaluate(()=>{Date.now=()=>Date.parse('2098-01-03T12:00:00Z');window.dispatchEvent(new Event('focus'));});
 assert.equal(await p.getByPlaceholder('e.g. Project Kailash',{exact:true}).inputValue(),'An unsaved editor draft');
 await p.getByRole('button',{name:'Cancel',exact:true}).click();await p.getByLabel('Activity status').selectOption('Completed');
 await p.getByRole('heading',{name:'QA Scheduled Project',exact:true}).waitFor();
 assert.equal((await db.collection('projects').findOne({slug:'qa-clock-project'})).status,'Upcoming');
 await p.evaluate(()=>{Date.now=window.__qaOriginalNow;window.dispatchEvent(new Event('focus'));});
 checks.push('project-event-crud-and-all-management-controls-'+width);console.log('Passed menus, publications and management forms at '+width+'px');
 await p.goto('http://127.0.0.1:5173/academy/online/qa-course',{waitUntil:'networkidle'});
 await p.locator('.record-atlas').waitFor();assert.ok(!(await p.locator('main').textContent()).includes('PRIVATE QA CONTENT'));
 await p.locator('[data-record-section="programme"]').click();
 const courseReader=p.getByRole('dialog');await courseReader.getByText('QA public listening session',{exact:true}).waitFor();
 await courseReader.getByLabel('Programme day').selectOption('1');await courseReader.getByText('QA public review',{exact:true}).waitFor();
 if(width<=1100)await courseReader.locator('.record-section-select select').selectOption('venue');else await courseReader.getByRole('navigation',{name:'Page sections'}).locator('a[href*="section=venue"]').click();
 await courseReader.getByText('QA travel instructions.',{exact:true}).waitFor();
 if(width<=1100)await courseReader.locator('.record-section-select select').selectOption('programme');else await courseReader.getByRole('navigation',{name:'Page sections'}).locator('a[href*="section=programme"]').click();
 assert.equal(await courseReader.getByLabel('Programme day').inputValue(),'1','Programme day survives section changes');
 await courseReader.getByRole('button',{name:'Close to Atlas ×'}).click();await courseReader.waitFor({state:'hidden'});
 await p.getByRole('link',{name:/Open LMS/}).first().click();await p.waitForURL('**learn=1');
 await p.waitForFunction(()=>document.body.textContent.includes('PRIVATE QA CONTENT MUST BE PROTECTED'));
 await p.goto('http://127.0.0.1:5173/academy/online/qa-course?simulate=true',{waitUntil:'networkidle'});await p.waitForFunction(()=>document.body.textContent.includes('PRIVATE QA CONTENT MUST BE PROTECTED'),{timeout:15000});
 await p.getByLabel('Your practice notes',{exact:true}).fill('A saved practice note '+width);await p.getByRole('button',{name:'Save note',exact:true}).click();await p.getByText('Your note and progress have been saved.',{exact:true}).waitFor();
 if(width===1440){await p.getByRole('button',{name:'Mark lesson complete',exact:true}).click();await p.getByText('1 / 1',{exact:true}).waitFor();}
 await p.reload({waitUntil:'networkidle'});await p.waitForFunction(width=>document.querySelector('#saved-practice-note')?.value==='A saved practice note '+width,width);assert.ok((await p.locator('.live-learning-notes').textContent()).includes('1 / 1'));
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`LMS overflow ${width}`);await p.screenshot({path:`${screenshots}/lms-${width}.png`,fullPage:true});
 // Revision transport remains intact across API origins and stale tab writes conflict.
 const p2=await c.newPage();await p2.goto('http://127.0.0.1:5173/academy/online/qa-course',{waitUntil:'networkidle'});
 await Promise.all([p,p2].map(page=>page.evaluate(()=>fetch('/api/lms/courses/qa-course').then(r=>r.json()))));
 const save=await p.evaluate(async()=>{const r=await fetch('/api/lms/courses/qa-course',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'QA Field Methods Updated'})});return {status:r.status,body:await r.json()};});assert.equal(save.status,200);assert.equal(save.body.course.modulesList[0].materials[0].text,'PRIVATE QA CONTENT MUST BE PROTECTED');
 const stale=await p2.evaluate(async()=>{const r=await fetch('/api/lms/courses/qa-course',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Stale rename'})});return r.status;});assert.equal(stale,409);await p2.getByRole('alert').filter({hasText:'Changes were not saved'}).waitFor();await p2.close();
 await p.goto('http://127.0.0.1:5173/admin/resources',{waitUntil:'networkidle'});await p.getByLabel('Title',{exact:true}).fill('QA Published Blog');await p.getByLabel('Public URL slug').fill('qa-blog-'+width);await p.getByLabel('Introduction',{exact:true}).fill('QA resource editor creation.');await p.getByRole('tab',{name:'Content & Media',exact:true}).click();await p.getByRole('button',{name:'+ paragraph',exact:true}).click();await p.getByLabel('Text',{exact:true}).fill('A published block article.');await p.getByRole('tab',{name:'Overview',exact:true}).click();await p.getByRole('checkbox',{name:'Reports',exact:true}).check();await p.getByRole('tab',{name:'Connections',exact:true}).click();await p.getByRole('checkbox',{name:'QA Language Working Week',exact:true}).check();await p.getByRole('button',{name:'Publish',exact:true}).click();await p.getByText('Published.',{exact:true}).waitFor();
 await p.goto('http://127.0.0.1:5173/resources/qa-blog-'+width,{waitUntil:'networkidle'});assert.equal(await p.getByRole('heading',{name:'QA Published Blog',exact:true}).count(),1);
 await c.close();
 }
 // Tablet and 200% desktop reflow equivalent (720 CSS px at 2x density).
 for(const [width,scale] of [[768,1],[720,2]]){
  const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:scale});
  await context.route('**/*',route=>['http://127.0.0.1:5173','http://127.0.0.1:3097'].some(origin=>route.request().url().startsWith(origin))?route.continue():route.abort());
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(const path of ['/','/notices','/academy','/academy/online/qa-course','/centres','/centres/digital-preservation','/projects','/projects/tholkudi','/events/qa-event','/people/qa-researcher','/resources/qa-toolkit']){
   await page.goto('http://127.0.0.1:5173'+path,{waitUntil:'networkidle'});await page.locator('h1').waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`Reflow ${width} ${path}`);
   if(await page.locator('.record-atlas').count()){
    const card=page.locator('[data-record-section]').first();await card.click();
    const panel=page.getByRole('dialog');await panel.getByRole('button',{name:'Close to Atlas ×'}).click();await panel.waitFor({state:'hidden'});
    assert.equal(await card.evaluate(el=>document.activeElement===el),true,'Rapid animated close restores focus');
    await card.click();await panel.waitFor();await page.waitForTimeout(400);
    assert.equal(await panel.evaluate(el=>el.scrollWidth>el.clientWidth+1),false,'Expanded reflow');
    const nav=page.getByRole('navigation',{name:'Website',exact:true});await page.getByRole('button',{name:'Menu',exact:true}).click();
    await nav.getByRole('button',{name:'About',exact:true}).click();await nav.getByRole('link',{name:/^Vision and Mission/}).waitFor();
    await page.getByRole('button',{name:'Close menu',exact:true}).click();
    await panel.getByRole('button',{name:'Close to Atlas ×'}).click();await panel.waitFor({state:'hidden'});
   }
  }
  await context.close();
 }
 console.log('Passed tablet, 200% reflow and animated reader/menu checks');
 // Resource permissions, CAS conflicts, recoverable trash and scheduling.
 const login=await fetch('http://127.0.0.1:3097/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'design-admin@example.invalid',password})}).then(r=>r.json());
 async function req(path,method,body,token=login.token){const r=await fetch('http://127.0.0.1:3097/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
 assert.equal((await req('/resources','POST',{title:'No',slug:'no'},'')).status,401);
 const studentLogin=await req('/login','POST',{email:'design-student@example.invalid',password});assert.equal((await req('/resources','POST',{title:'Member draft',slug:'member-browser-draft'},studentLogin.data.token)).status,201);assert.equal((await req('/resources/member-browser-draft','GET')).status,404);
 for(const path of ['/projects','/events','/lms/courses'])assert.equal((await req(path,'POST',{title:'Forbidden student creation',slug:'forbidden-student-'+path.slice(1).replaceAll('/','-')},studentLogin.data.token)).status,403);
 assert.equal((await req('/resources/qa-toolkit','PATCH',{__v:0,title:'Updated toolkit'})).status,200);
 assert.equal((await req('/resources/qa-toolkit','PATCH',{__v:0,title:'Stale toolkit'})).status,409);
 assert.equal((await req('/resources/qa-toolkit','PATCH',{__v:1,deleted:true})).status,200);assert.equal((await req('/resources/qa-toolkit','GET')).status,404);assert.equal((await req('/resources/qa-toolkit','PATCH',{__v:2,deleted:false})).status,200);
 assert.equal((await req('/resources','POST',{title:'Future',slug:'future-resource',publicationState:'published',publishedAt:'2099-01-01T00:00:00Z'})).status,201);assert.equal((await req('/resources/future-resource','GET')).status,404);
 assert.equal((await req('/resources','POST',{title:'Unsafe',slug:'unsafe-resource',mediaUrl:'javascript:alert(1)'})).status,400);
 assert.equal(await db.collection('contentRevisions').countDocuments({collection:'resources'}),3);

 const writingContext=await browser.newContext({viewport:{width:1200,height:900},reducedMotion:'reduce'});const writingPage=await writingContext.newPage();writingPage.on('pageerror',e=>errors.push(e.message));
 await writingPage.goto('http://127.0.0.1:5173/writing',{waitUntil:'networkidle'});
 await writingPage.evaluate(async({password})=>{const r=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'design-student@example.invalid',password})});const identity=await r.json();localStorage.setItem('lms_user',JSON.stringify(identity));},{password});
 await writingPage.reload({waitUntil:'networkidle'});await writingPage.getByLabel('Title',{exact:true}).fill('Member browser report');await writingPage.getByLabel('Public URL slug').fill('member-ui-report');await writingPage.getByRole('tab',{name:'Content & Media',exact:true}).click();await writingPage.getByRole('button',{name:'+ paragraph',exact:true}).click();await writingPage.getByLabel('Text',{exact:true}).fill('A member report with context.');await writingPage.getByRole('tab',{name:'Overview',exact:true}).click();await writingPage.getByRole('checkbox',{name:'Reports',exact:true}).check();await writingPage.getByRole('tab',{name:'Connections',exact:true}).click();await writingPage.getByRole('checkbox',{name:'QA Language Working Week',exact:true}).check();await writingPage.getByRole('tab',{name:'Content & Media',exact:true}).click();await writingPage.locator('input[type=file]').first().setInputFiles({name:'qa-photo.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aY1cAAAAASUVORK5CYII=','base64')});await writingPage.waitForFunction(()=>/disabled/.test(document.querySelector('.photo-upload [role=status]')?.textContent||''));await writingPage.getByRole('button',{name:'Save draft',exact:true}).click();await writingPage.getByText('Changes saved.',{exact:true}).waitFor();assert.equal((await req('/resources/member-ui-report','GET')).status,404);
 await writingPage.getByRole('button',{name:'Submit for review',exact:true}).click();await writingPage.getByText('Submitted for review.',{exact:true}).waitFor();
 const submitted=(await req('/admin/resources')).data.resources.find(r=>r.slug==='member-ui-report');assert.equal(submitted.reviewState,'submitted');assert.equal((await req('/resources/member-ui-report','PATCH',{__v:submitted.__v,action:'approve'})).status,200);
 await writingPage.goto('http://127.0.0.1:5173/resources/member-ui-report',{waitUntil:'networkidle'});await writingPage.getByText('A member report with context.',{exact:true}).waitFor();
 for(const path of ['/events/qa-event','/projects/tholkudi','/centres/digital-preservation']){await writingPage.goto('http://127.0.0.1:5173'+path+'?section=writing-media',{waitUntil:'networkidle'});await writingPage.locator('.record-chapter[aria-label="Writing & media"]').getByRole('link',{name:'Member browser report ↗',exact:true}).waitFor();}
 await writingContext.close();
 assert.deepEqual(errors,[]);console.log(JSON.stringify(process.env.QA_LAYOUT_ONLY?{tabletAndZoomReflow:'passed',animatedReaderAndMenus:'passed',resourcePermissionsAndRecovery:'passed',productionTouched:false}:{publicScreens:40,recordLayouts:'passed',tabletAndZoomReflow:'passed',workflowGroups:4,crossOrigin:'passed',LMS:'passed',metadataPreservation:'passed',staleSave:'passed',resourceEditor:'passed',resourcePermissionsAndRecovery:'passed',productionTouched:false}));
}catch(error){console.error('Browser regression failed:',error.message,errors);if(browser){for(const context of browser.contexts()){for(const page of context.pages()){await page.screenshot({path:screenshots+'/failure.png',fullPage:true}).catch(()=>{});console.error('Failed page:',page.url());}}}throw error;}finally{if(browser)await browser.close();api.kill('SIGTERM');front.kill('SIGTERM');await new Promise(r=>setTimeout(r,500));await db.dropDatabase();await mongoose.disconnect();}
