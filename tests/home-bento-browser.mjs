import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const origin='http://127.0.0.1:5184';
const front=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','5184','--strictPort'],{env:{...process.env,DISABLE_HMR:'true'},stdio:'ignore'});
const longTitle='Learning with communities: language, memory and responsible technology in practice';
const fixtures={impact:{projects:1,programmes:1,completedActivities:0,asOf:'2026-10-22T00:00:00Z'},projects:{projects:[{slug:'fieldwork',title:'Shared fieldwork',status:'Ongoing',description:'Research in practice.'}]},courses:{courses:[{slug:'methods',title:longTitle,type:'Online Course',status:'Upcoming',startDate:'2099-01-01',description:'A learning programme with a deliberately long title to exercise the entire card.'}]},events:{events:[{slug:'gathering',title:longTitle,status:'Upcoming',startDate:'2099-02-01',description:'A public gathering with communities and researchers.'}]},centres:{centres:[]},people:{people:[]},'activity-feed':{items:[]},resources:{resources:[{slug:'report',title:longTitle,kind:'Project report',publicationState:'published',publishedAt:'2026-01-01',description:'A report from the field.'}]},'homepage-curation':{tiles:{}}};
let browser;
try{
 for(let i=0;i<100;i++){try{if((await fetch(origin)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});await fs.mkdir('/tmp/codin-bento-refinement',{recursive:true});
 for(const width of [1440,1100,768,390]){
  const context=await browser.newContext({viewport:{width,height:1100},reducedMotion:width===1440?'no-preference':'reduce'});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.pathname.startsWith('/api/'))return route.fulfill({json:fixtures[url.pathname.slice(5)]||{}});return url.origin===origin?route.continue():route.abort();});
  await page.goto(origin,{waitUntil:'networkidle'});await page.locator('.bento-w2m h2').waitFor();await page.getByRole('link',{name:'CoDIN Commons',exact:true}).first().waitFor();
  assert.equal(await page.locator('.bento-tile').count(),7);assert.equal(await page.locator('.bento-count').count(),0);
  const geometry=await page.locator('.bento-tile').evaluateAll(tiles=>tiles.map(tile=>{const copy=tile.querySelector('.bento-copy'),button=tile.querySelector('.bento-open'),heading=copy?.querySelector('h2');if(!copy)return null;const c=copy.getBoundingClientRect(),b=button.getBoundingClientRect(),label=tile.querySelector('.bento-label').getBoundingClientRect();return {name:tile.getAttribute('aria-label'),fits:c.top>=b.top-.5&&c.bottom<=b.bottom+.5&&c.top>=label.bottom-.5,bounded:heading.clientHeight<=parseFloat(getComputedStyle(heading).lineHeight)*2+1,clamped:getComputedStyle(heading).webkitLineClamp==='2'};}).filter(Boolean));
  for(const tile of geometry){assert.ok(tile.fits,`${tile.name} text outside card at ${width}px`);assert.ok(tile.bounded&&tile.clamped,`${tile.name} headline must fit within two lines at ${width}px`);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  const tile=page.locator('.bento-upcoming'),before=await tile.boundingBox();await tile.getByRole('button',{name:'Next Upcoming happenings story'}).click();await page.waitForFunction(()=>document.querySelector('.bento-upcoming .eyebrow')?.textContent?.includes('Event'));const after=await tile.boundingBox();assert.equal(Math.round(before.height),Math.round(after.height),'Carousel changes must not resize the tile');assert.equal(Math.round(after.height),310);

  if(width===1440){const positions=await page.evaluate(()=>{const a=document.querySelector('.bento-upcoming').getBoundingClientRect(),b=document.querySelector('.bento-publications').getBoundingClientRect();return {upcomingRight:a.left>b.left,upcomingAbove:a.top<b.top,w2m:getComputedStyle(document.querySelector('.bento-w2m')).borderTopColor,events:getComputedStyle(document.querySelector('.bento-events')).borderTopColor,neutral:[...document.querySelectorAll('.bento-tile')].every(el=>getComputedStyle(el).backgroundColor==='rgba(0, 0, 0, 0)'&&[...el.querySelectorAll('.bento-story,.bento-open,.bento-copy')].every(body=>getComputedStyle(body).backgroundColor==='rgba(0, 0, 0, 0)'&&getComputedStyle(body).backgroundImage==='none')&&[...el.querySelectorAll('.bento-label,.bento-controls')].every(bar=>getComputedStyle(bar).backgroundColor===getComputedStyle(el).borderTopColor))};});assert.ok(positions.upcomingRight&&positions.upcomingAbove);assert.ok(positions.neutral,'Card bodies must be transparent and title/control bars must match the coloured border');assert.equal(positions.w2m,'rgb(168, 237, 69)');assert.equal(positions.events,'rgb(198, 56, 50)');
   await page.locator('.bento-w2m .bento-open').click();await page.getByRole('dialog').waitFor();const durations=await page.locator('.modal-morph-surface').evaluate(el=>el.getAnimations().map(a=>a.effect.getTiming().duration));assert.ok(durations.includes(820));await page.waitForFunction(()=>!document.querySelector('dialog.is-opening'));await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});
  }
  await page.evaluate(()=>document.activeElement?.blur());
  await page.screenshot({path:`/tmp/codin-bento-refinement/home-${width}.png`,fullPage:true});assert.deepEqual(errors,[]);await context.close();
 }
 console.log('Bento refinements passed at 1440, 1100, 768 and 390px; fixed heights and two-line truncation, transparent content areas, coloured title/control bars and borders, positions and slower reveal verified.');
}finally{await browser?.close();front.kill('SIGTERM');}
