#!/usr/bin/env node
// Read-only QA/export for the refined Workspace → Atlas → combined reader journey.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const base = process.env.DESIGN_REVIEW_URL || 'http://127.0.0.1:4173';
const exporting = process.argv.includes('--export');
const output = fileURLToPath(new URL('../public/designs/review/connected/', import.meta.url));
const families = ['centres', 'academy', 'projects', 'people', 'resources', 'events'];
const checks = [], failures = [], errors = [], api = [], writes = [];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
if (exporting) await mkdir(output, { recursive: true });
async function check(name, action) {
  try { await action(); checks.push(name); }
  catch (error) { failures.push({ name, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}
async function load(p, query) {
  await p.goto(`${base}/designs/connected.html?${query}`, { waitUntil: 'domcontentloaded' });
  await p.locator('#main-content').waitFor();
}
async function screenshot(p, name) {
  if (!exporting) return;
  await p.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2000))]); });
  await p.evaluate(async () => { await Promise.race([Promise.all([...document.images].filter(i => i.getBoundingClientRect().width > 0).map(i => i.complete ? null : new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }))), new Promise(r => setTimeout(r, 1800))]); });
  await p.screenshot({ path: `${output}/${name}.png`, fullPage: await p.getByRole('dialog').count() === 0 });
}
async function chooseSection(p, id) {
  const root = p.locator('[data-reader]');
  if (await root.locator('[data-reader-select]').isVisible()) await root.locator('[data-reader-select]').selectOption(id);
  else await root.locator(`[data-read-section="${id}"]`).first().click();
}
try {
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const p = await context.newPage(); p.setDefaultTimeout(9000);
    p.on('pageerror', e => errors.push(e.message));
    p.on('request', r => { if (new URL(r.url()).pathname.startsWith('/api/')) api.push(r.url()); if (!['GET', 'HEAD'].includes(r.method())) writes.push(r.url()); });
    for (const family of families) {
      await check(`${family}-index-${width}`, async () => {
        await load(p, `family=${family}&view=index`);
        assert.ok(await p.locator('.connected-browser').isVisible());
        if (width > 700) {
          const bounds = await p.locator('.connected-browser').boundingBox(), heading = await p.locator('main h1').boundingBox();
          assert.ok(bounds.y < heading.y, 'Directory must begin before the overview heading');
          assert.ok(bounds.height >= 999, 'Directory uses full viewport height');
        }
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        await screenshot(p, `${family}-index-${width}`);
        if (family !== 'resources') {
          const slug = await p.locator('.connected-records [data-record]').first().getAttribute('data-record');
          await p.locator('.connected-records [data-record]').first().click();
          assert.match(p.url(), /view=detail/);
          assert.equal(new URL(p.url()).searchParams.get('record'), slug);
          assert.equal(await p.locator('.connected-browser').isVisible(), false, 'Selecting a record collapses its directory');
          await p.getByRole('button', { name: `Show ${family === 'academy' ? 'W2M Academy' : family[0].toUpperCase() + family.slice(1)} sidebar` }).click();
          assert.ok(await p.locator('.connected-browser').isVisible());
          await p.locator('[data-directory-search]').fill('no-record-could-match');
          assert.equal(await p.locator('.connected-records [data-record]:visible').count(), 0);
          await p.locator('[data-browser-close]').click();
          await p.locator('[data-browser-toggle]').click();
          assert.equal(await p.locator('[data-directory-search]').inputValue(), 'no-record-could-match');
        }
      });
      await check(`${family}-detail-${width}`, async () => {
        await load(p, `family=${family}&view=detail`);
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
        assert.equal(await p.locator('main h1').count(), 1);
        if (family === 'people') assert.equal(await p.locator('[data-reader]').count(), 1, 'People open directly as a notebook');
        else if (family !== 'resources') assert.ok(await p.locator('[data-open-section]').count() > 0, 'Atlas is the default detail view');
        await screenshot(p, `${family}-detail-${width}`);
      });
      if (['events', 'academy', 'projects', 'centres'].includes(family)) await check(`${family}-combined-reader-${width}`, async () => {
        await load(p, `family=${family}&view=detail`);
        const card = p.locator('[data-open-section]').first(); await card.click();
        await p.getByRole('dialog').waitFor();
        assert.equal(await p.getByRole('dialog').locator('[data-reader]').count(), 1);
        assert.equal(await p.getByRole('dialog').locator('.connected-glance').count(), 1);
        assert.equal(await p.getByRole('dialog').evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
        assert.ok(await p.locator('[data-loaded="true"]').count() < await p.locator('[data-chapter]').count(), 'Sections are progressively mounted');
        const chapters = p.getByRole('dialog').locator('[data-chapter]');
        const secondId = await chapters.nth(1).getAttribute('data-chapter');
        await chooseSection(p, secondId);
        assert.equal(await p.locator(`[data-chapter="${secondId}"]`).getAttribute('data-loaded'), 'true');
        await screenshot(p, `${family}-reader-${width}`);
        await p.keyboard.press('Escape'); await p.getByRole('dialog').waitFor({ state: 'detached' });
        assert.equal(new URL(p.url()).searchParams.has('section'), false);
        assert.equal(await card.evaluate(el => document.activeElement === el), true);
      });
    }
    await check(`scroll-spy-and-history-${width}`, async () => {
      await load(p, 'family=events&view=detail');
      const first = p.locator('[data-open-section]').first(); await first.click();
      await p.getByRole('dialog').waitFor();
      const secondId = await p.getByRole('dialog').locator('[data-chapter]').nth(1).getAttribute('data-chapter');
      await p.getByRole('dialog').evaluate(el => {
        const second = el.querySelectorAll('[data-chapter]')[1];
        const header = el.querySelector('.reader-toolbar').getBoundingClientRect().height;
        const offset = header + (innerWidth <= 1100 ? 80 : 14);
        el.scrollTop += second.getBoundingClientRect().top - offset + 8;
      });
      await p.waitForFunction(id => document.querySelector('[data-reader-select]').value === id, secondId);
      assert.equal(new URL(p.url()).searchParams.get('section'), secondId);
      assert.equal(await p.locator(`[data-chapter="${secondId}"]`).getAttribute('data-loaded'), 'true');
      await chooseSection(p, 'registration');
      if (width <= 1100) {
        const nav = await p.locator('.reader-mobile-index').boundingBox(), toolbar = await p.locator('.reader-toolbar').boundingBox();
        assert.ok(nav.y >= toolbar.y + toolbar.height - 1 && nav.y + nav.height < 1000, 'Mobile section navigation stays below the header while reading');
      }
      await p.goBack();
      await p.waitForFunction(id => document.querySelector('[data-reader-select]').value === id, secondId);
      await p.reload(); await p.getByRole('dialog').waitFor();
      assert.equal(await p.locator('[data-reader-select]').inputValue(), secondId);
      await p.keyboard.press('Escape'); await p.getByRole('dialog').waitFor({ state: 'detached' });
    });
    await check(`notebook-state-and-lms-handoff-${width}`, async () => {
      await load(p, 'family=people&view=detail&record=ritesh&section=publications');
      await p.getByLabel('Search publications').fill('zz-no-publication');
      assert.equal(await p.locator('[data-publication]:visible').count(), 0);
      await chooseSection(p, 'about'); await chooseSection(p, 'publications');
      assert.equal(await p.getByLabel('Search publications').inputValue(), 'zz-no-publication');
      await load(p, 'family=academy&view=detail');
      const slug = new URL(p.url()).searchParams.get('record') || await p.locator('.connected-records [data-record]').first().getAttribute('data-record');
      assert.ok((await p.locator('.summary-actions .lms-entry').getAttribute('href')).endsWith(`/academy/online/${slug}`));
      assert.ok(!(await p.locator('.summary-actions .lms-entry').getAttribute('href')).includes('simulate'));
      await p.locator('[data-open-section]').first().click();
      assert.ok(await p.getByRole('dialog').locator('.reader-toolbar .lms-entry').isVisible());
      assert.ok((await p.getByRole('dialog').locator('.reader-toolbar .lms-entry').getAttribute('href')).endsWith(`/academy/online/${slug}`));
      await p.keyboard.press('Escape'); await p.getByRole('dialog').waitFor({ state: 'detached' });
      await load(p, 'family=academy&view=index&track=online');
      assert.equal(await p.locator('select[data-track]').inputValue(), 'online');
      await load(p, 'family=academy&view=detail&section=schedule');
      await p.getByRole('dialog').waitFor();
      const day = p.getByRole('dialog').getByLabel('Programme day');
      assert.ok(await day.locator('option').count() > 1, 'Existing multi-day schedule is retained');
      await day.selectOption('1');
      await chooseSection(p, 'overview'); await chooseSection(p, 'schedule');
      assert.equal(await day.inputValue(), '1', 'Programme day survives chapter navigation');
      await p.keyboard.press('Escape'); await p.getByRole('dialog').waitFor({ state: 'detached' });
      await p.locator('[data-open-section="schedule"]').click();
      assert.equal(await p.getByRole('dialog').getByLabel('Programme day').inputValue(), '1', 'Programme day survives closing and reopening');
      await p.keyboard.press('Escape'); await p.getByRole('dialog').waitFor({ state: 'detached' });
    });
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const p = await context.newPage(); p.on('pageerror', e => errors.push(e.message));
  await check('motion-focus-and-rapid-close', async () => {
    await load(p, 'family=events&view=detail');
    const card = p.locator('[data-open-section]').first(); await card.focus(); await p.keyboard.press('Enter');
    await p.getByRole('dialog').waitFor(); await p.keyboard.press('Escape'); await p.getByRole('dialog').waitFor({ state: 'detached' });
    assert.equal(await card.evaluate(el => document.activeElement === el), true);
    await card.click(); await p.getByRole('dialog').waitFor(); await p.keyboard.press('Tab');
    assert.equal(await p.getByRole('dialog').evaluate(el => el.contains(document.activeElement)), true);
    assert.equal(await p.locator('.reader-chapters').evaluate(el => getComputedStyle(el).transform), 'none');
    await p.keyboard.press('Escape'); await p.getByRole('dialog').waitFor({ state: 'detached' });
  });
  await check('resource-notebook-with-browser-only-fixture', async () => {
    await p.route('**/comparison-data.json', async route => { const r = await route.fetch(); const json = await r.json(); json.data.resources = [{ slug: 'browser-only-resource', title: 'Browser-only resource test', body: '## Read this resource\n\nA test of the notebook renderer.', authors: ['QA'], version: '1', licence: 'QA only', url: 'https://example.invalid/qa' }]; await route.fulfill({ response: r, json }); });
    await load(p, 'family=resources&view=index'); await p.locator('.connected-records [data-record]').first().click();
    assert.equal(await p.locator('[data-reader]').count(), 1); assert.equal(await p.locator('[data-open-section]').count(), 0);
    assert.ok((await p.locator('.summary-actions .button').getAttribute('href')).includes('example.invalid'));
    await p.unroute('**/comparison-data.json');
  });
  await check('person-teaching-course-atlas-lms-journey', async () => {
    await load(p, 'family=people&view=detail&record=ritesh&section=courses');
    await p.locator('[data-chapter="courses"] .related-card a').first().click();
    const current = new URL(p.url());
    assert.equal(current.searchParams.get('family'), 'academy');
    assert.equal(current.searchParams.get('view'), 'detail', 'A chapter click must not also trigger index navigation');
    assert.ok(await p.locator('[data-open-section]').count() > 0);
    assert.ok((await p.locator('.summary-actions .lms-entry').getAttribute('href')).endsWith(`/academy/online/${current.searchParams.get('record')}`));
  });
  await check('print-complete-reader', async () => {
    await load(p, 'family=events&view=detail&section=overview');
    await p.getByRole('dialog').waitFor();
    await p.emulateMedia({ media: 'print' });
    await p.evaluate(() => dispatchEvent(new Event('beforeprint')));
    assert.equal(await p.locator('[data-chapter]').count(), await p.locator('[data-loaded="true"]').count());
    await p.emulateMedia({ media: 'screen' });
  });
  await context.close();
  if (exporting) {
    const index = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CoDIN refined design review</title><link rel="stylesheet" href="../../comparison.css"></head><body><main class="review-index"><a href="../../connected.html">← Refined interactive design</a><h1>Workspace → Atlas → Notebook</h1><p>Index pages use a full-height Connected Workspace directory. Selecting a record collapses the directory into a reopenable rail. Centre, event, W2M course and project pages begin with Section Atlas; a card opens a continuous Notebook with a section index and an At a glance card. People and resources open directly as Notebooks.</p><p>The reader progressively mounts sections as they approach the viewport and updates the active contents item. Open LMS uses the existing app route and its sign-in, admission, payment and material-access logic; the prototype does not simulate entitlement.</p><p><a href="connected-pages.pdf">Printable review PDF ↓</a> · <a href="checks.json">Browser verification</a> · <a href="../../compare.html?page=review">Earlier comparison gallery</a></p><table><thead><tr><th>Page</th><th>View</th><th>Desktop</th><th>Tablet</th><th>Phone</th></tr></thead><tbody>${families.flatMap(f => ['index', 'detail', ...(['events', 'academy', 'projects', 'centres'].includes(f) ? ['reader'] : [])].map(view => `<tr><td>${f}</td><td><a href="../../connected.html?family=${f}&view=${view === 'reader' ? 'detail&section=' + ({ events: 'overview', academy: 'overview', projects: 'overview', centres: 'focus' }[f]) : view}">${view}</a></td>${[1440, 768, 390].map(w => `<td><a href="${f}-${view}-${w}.png">${w}px</a></td>`).join('')}</tr>`)).join('')}</tbody></table><section class="print-screens"><h2>Representative compositions</h2>${['centres-index', 'events-detail', 'events-reader', 'people-detail'].map(name => `<figure><img src="${name}-1440.png" alt="${name.replaceAll('-', ' ')}"><figcaption>${name.replaceAll('-', ' ')}</figcaption></figure>`).join('')}</section></main></body></html>`;
    await writeFile(`${output}/index.html`, index);
    const p = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); await p.goto(`${base}/designs/review/connected/`, { waitUntil: 'load' }); await p.emulateMedia({ media: 'print' });
    await p.pdf({ path: `${output}/connected-pages.pdf`, format: 'A4', printBackground: true }); await p.close();
  }
} finally { await browser.close(); }
const report = { passed: checks.length, failures, javascriptErrors: errors, apiRequests: api, writeRequests: writes, exported: exporting, checks };
if (exporting) await writeFile(`${output}/checks.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length || errors.length || api.length || writes.length) process.exitCode = 1;
