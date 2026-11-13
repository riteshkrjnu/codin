import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin='http://127.0.0.1:5185';
const front=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5185','--strictPort'],{env:{...process.env,DISABLE_HMR:'true'},stdio:'ignore'});
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 for(const role of (process.env.QA_SINGLE?['student']:['student','admin']))for(const scenario of (process.env.QA_SINGLE?['unavailable']:['unavailable','malformed','healthy'])){
  const context=await browser.newContext();const identity={token:'a'.repeat(64),id:'qa-user',email:'qa@example.invalid',name:'QA Writer',role};
  await context.addInitScript(user=>localStorage.setItem('lms_user',JSON.stringify(user)),identity);
  let recovered=false,sharingVersion=0,collaborators=[];const sharedRecord=()=>({slug:'shared-article',title:'A saved shared article',authors:'QA Writer',createdBy:identity.id,reviewState:'draft',publicationState:'draft',__v:sharingVersion,document:{version:1,blocks:[]}});const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await page.route('**/*',route=>{const url=new URL(route.request().url()),path=url.pathname.slice(5);if(url.pathname.startsWith('/api/')){
   if(path.startsWith('writing/shared-article/collaborators')){const method=route.request().method();if(method!=='GET'){const body=route.request().postDataJSON();if(body.__v!==sharingVersion)return route.fulfill({status:409,json:{error:'Revision conflict'}});collaborators=method==='DELETE'?[]:[{id:'other',name:'Other Writer',email:body.email}];sharingVersion++;return route.fulfill({json:{__v:sharingVersion}});}return route.fulfill({json:{collaborators,canManage:true,__v:sharingVersion}});}
   if(path==='lms/session')return route.fulfill({json:identity});
   const editorial=['writing','resource-categories','homepage-curation'].includes(path);
   if(editorial&&!recovered&&scenario==='unavailable')return route.fulfill({status:503,json:{error:'Temporarily unavailable'}});
   if(editorial&&!recovered&&scenario==='malformed')return route.fulfill({json:{resources:null,categories:null,tiles:null}});
   return route.fulfill({json:path==='resource-categories'?{categories:['Articles','Reports']}:path==='homepage-curation'?{tiles:{}}:path==='writing'?{resources:[sharedRecord(),...(role==='admin'?[{slug:'member-report',title:'A member submission',createdBy:'other-member',authors:'Member Writer',reviewState:'submitted',publicationState:'draft',__v:0,document:{version:1,blocks:[{id:'a',type:'paragraph',text:'A report for review.'}]}}]:[])]}:{[path==='activity-feed'?'items':path]:[]}});
  }return url.origin===origin?route.continue():route.abort();});
  await page.goto(origin+'/writing',{waitUntil:'networkidle'});
  assert.deepEqual(errors,[],`${role} ${scenario}: rendering errors`);
  await page.getByLabel('Title',{exact:true}).fill('A draft that stays visible');
  await page.getByRole('tab',{name:'Content & Media',exact:true}).click();await page.getByRole('button',{name:'+ paragraph',exact:true}).click();await page.getByLabel('Text',{exact:true}).fill('Keep writing even when optional editorial services fail.');
  await page.getByRole('link',{name:'CoDIN',exact:false}).first().waitFor();
  if(scenario!=='healthy'){await page.getByRole('tab',{name:'Overview',exact:true}).click();assert.match(await page.locator('main').innerText(),/could not|unavailable|try again/i);recovered=true;await page.getByRole('button',{name:'Try again',exact:true}).click();await page.getByRole('checkbox',{name:'Reports',exact:true}).waitFor();assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'A draft that stays visible');await page.getByRole('tab',{name:'Content & Media',exact:true}).click();assert.equal(await page.locator('.editor-block textarea').first().inputValue(),'Keep writing even when optional editorial services fail.');}

  if(scenario==='healthy'){
   await page.getByRole('tab',{name:'Overview',exact:true}).click();await page.locator('.account-menu summary').click();assert.equal(await page.locator('.account-menu a[href="/writing"]').count(),1);assert.equal(await page.locator('.account-menu a[href="/admin/resources"]').count(),0);await page.locator('.account-menu summary').click();
   assert.equal(await page.locator('.writing-tabs [role=tab]').count(),role==='admin'?4:1);
   if(role==='admin'){
    await page.getByRole('tab',{name:'Manage Categories',exact:true}).click();await page.getByRole('tabpanel',{name:'Manage Categories',exact:true}).waitFor();assert.equal(await page.getByLabel('Title',{exact:true}).isVisible(),false);
    await page.getByRole('tab',{name:'Homepage Highlights',exact:true}).click();await page.getByLabel('Pin Projects',{exact:true}).waitFor();
    await page.getByRole('tab',{name:'Articles',exact:true}).click();await page.getByRole('tab',{name:'Overview',exact:true}).click();assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'A draft that stays visible');assert.equal(await page.locator('.editor-block textarea').first().inputValue(),'Keep writing even when optional editorial services fail.');
    await page.getByRole('tab',{name:/Admin Control/}).click();await page.getByRole('button',{name:'A member submission',exact:false}).click();await page.getByRole('button',{name:'Approve & publish',exact:true}).waitFor();await page.getByRole('button',{name:'Return for changes',exact:true}).waitFor();assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'A member submission');
   }

   await page.getByRole('tab',{name:'Articles',exact:true}).click();await page.getByRole('tab',{name:'Overview',exact:true}).click();assert.equal(await page.getByLabel('Authors / contributors',{exact:true}).inputValue(),'QA Writer');
   await page.getByRole('tab',{name:'Licence & Citation',exact:true}).click();await page.getByLabel('Licence',{exact:true}).selectOption('CC BY-SA 4.0');assert.match(await page.locator('.suggested-citation').innerText(),/QA Writer/);await page.getByLabel('Licence',{exact:true}).selectOption('other');await page.getByLabel('Custom licence name or terms').fill('Community reuse agreement');await page.getByLabel('Use the automatically generated citation').uncheck();await page.getByLabel('Custom citation',{exact:true}).fill('A custom citation.');
   await page.getByRole('tab',{name:'Content & Media',exact:true}).click();await page.getByLabel('Cover image URL',{exact:true}).fill('https://example.invalid/cover.jpg');assert.equal(await page.locator('.cover-image-fields input[type=file]').count(),1);await page.getByRole('button',{name:'+ image',exact:true}).click();await page.getByLabel('Photo URL',{exact:true}).fill('https://example.invalid/photo.jpg');assert.equal(await page.locator('.editor-block input[type=file]').count(),1);
   await page.getByRole('tab',{name:'Sharing',exact:true}).click();await page.getByRole('button',{name:'Save draft to enable sharing',exact:true}).waitFor();
   await fs.mkdir('/tmp/codin-writing-workspace',{recursive:true});
   for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.getByRole('tab',{name:'Articles',exact:true}).click();await page.getByRole('tab',{name:'Overview',exact:true}).click();assert.equal(await page.getByLabel('Title',{exact:true}).inputValue(),'A draft that stays visible');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`Writing/nav overflow at ${width}`);if(width===390)await page.locator('.navigation-toggle').click();const academy=page.locator('.navigation-item>button').filter({hasText:'W2M Academy'});await academy.focus();await page.keyboard.press('ArrowDown');assert.equal(await academy.getAttribute('aria-expanded'),'true');await page.keyboard.press('Escape');assert.equal(await academy.getAttribute('aria-expanded'),'false');if(width===390)await page.keyboard.press('Escape');await page.screenshot({path:`/tmp/codin-writing-workspace/${role}-${width}.png`,fullPage:true});}
  }

  if(scenario==='healthy'){await page.getByRole('button',{name:'A saved shared article',exact:false}).click();await page.getByRole('tab',{name:'Sharing',exact:true}).click();await page.getByLabel('Collaborator email').fill('other@example.invalid');await page.getByRole('button',{name:'Give edit access',exact:true}).click();await page.getByText('Editing access granted.',{exact:true}).waitFor();await page.getByRole('button',{name:'Remove editor',exact:true}).click();await page.getByText('Editing access removed.',{exact:true}).waitFor();assert.equal(collaborators.length,0);assert.equal(sharingVersion,2);}
  assert.deepEqual(errors,[]);await context.close();console.log(`${role} ${scenario}: writing workspace remains usable`);
 }
}finally{await browser?.close();front.kill('SIGTERM');}
