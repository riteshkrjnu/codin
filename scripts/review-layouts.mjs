#!/usr/bin/env node
// Browser checks and optional artifacts for the independent, read-only mockups.
// Never starts the app or connects to MongoDB.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const base = process.env.DESIGN_REVIEW_URL || 'http://127.0.0.1:4173';
const exporting = process.argv.includes('--export');
const output = fileURLToPath(new URL('../public/designs/review/laboratory/', import.meta.url));
const reports = [];
const failures = [], errors = [], writes = [], apiRequests = [];
const variants = [
  ['events', 'desk'], ['events', 'vertical'], ['events', 'cards'], ['events', 'notebook'], ['events', 'atlas'],
  ['people', 'workspace'], ['people', 'vertical'], ['people', 'cards'],
  ['projects', 'notebook'], ['projects', 'ledger'], ['projects', 'vertical'], ['projects', 'cards'],
  ['centres', 'atlas'], ['centres', 'workspace'], ['centres', 'ledger'], ['centres', 'vertical'],
  ['academy', 'notebook'], ['academy', 'desk'], ['academy', 'cards'],
  ['classroom', 'vertical'], ['resources', 'workspace'], ['about', 'notebook'], ['custom', 'desk'],
];
if (exporting) await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
async function check(name, run) {
  try { await run(); reports.push(name); }
  catch (error) { failures.push({ name, error: error.message }); console.error(`FAIL ${name}: ${error.message}`); }
}
async function load(page, query) {
  await page.goto(`${base}/designs/compare.html?${query}`, { waitUntil: 'domcontentloaded' });
  await page.locator('#record-content').waitFor();
}
try {
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); page.setDefaultTimeout(8000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url());
      if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url());
    });
    for (const [family, layout] of variants) {
      await check(`${family}/${layout}/${width}`, async () => {
        await load(page, `family=${family}&layout=${layout}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, 'Horizontal page overflow');
        assert.equal(await page.locator('main h1').count(), 1, 'One page title');
        assert.ok(await page.locator('#record-content').textContent());
        if (exporting) {
          await page.evaluate(async () => { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]); });
          await page.evaluate(async () => { await Promise.race([Promise.all([...document.images].map(i => i.complete ? null : new Promise(r => { i.addEventListener('load', r); i.addEventListener('error', r); }))), new Promise(r => setTimeout(r, 2000))]); });
          await page.locator('#review-tools-toggle').click();
          await page.screenshot({ path: `${output}/${family}-${layout}-${width}.png`, fullPage: true });
          await page.locator('#review-tools-toggle').click();
        }
      });
    }
    await check(`event-section-parity-and-venue/${width}`, async () => {
      await load(page, 'family=events&layout=desk');
      const source = await page.evaluate(async () => (await (await fetch('comparison-data.json')).json()).data.events.find(e => e.slug.startsWith('voices-')));
      for (const section of source.subPages) assert.ok(await page.locator(`[data-section="${section.slug}"]`).count(), section.slug);
      assert.ok((await page.locator('.facts a').getAttribute('href')).startsWith('https://maps.app.goo.gl/'));
      assert.equal(await page.locator('.partner').count(), 6);
      assert.equal(await page.locator('.partner a').count(), 6);
      const selected = await page.locator('#record').inputValue();
      for (const layout of ['vertical', 'cards', 'notebook', 'atlas']) {
        await page.locator('#layout').selectOption(layout);
        assert.equal(await page.locator('#record').inputValue(), selected);
      }
    });
    await check(`expansion-history-focus/${width}`, async () => {
      await load(page, 'family=events&layout=atlas');
      const trigger = page.locator('[data-expand="registration"]');
      await trigger.click();
      await page.getByRole('dialog').waitFor();
      assert.match(page.url(), /section=registration/);
      assert.equal(await page.getByRole('dialog').getByRole('table').count(), 1);
      assert.equal(await page.getByRole('dialog').evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
      if (width <= 800) await page.getByRole('dialog').locator('[data-section-select]').selectOption('logistics');
      else await page.getByRole('dialog').locator('[data-section="logistics"]').click();
      assert.match(page.url(), /section=logistics/);
      await page.goBack();
      await page.getByRole('dialog').getByRole('heading', { name: 'Registration', exact: true }).first().waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
      assert.equal(new URL(page.url()).searchParams.has('section'), false);
      await load(page, 'family=events&layout=cards&section=logistics');
      await page.getByRole('dialog').waitFor();
      await page.reload(); await page.getByRole('dialog').waitFor();
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'detached' });
    });
    await check(`directory-publications-drafts/${width}`, async () => {
      await load(page, 'family=people&layout=workspace&section=publications');
      const search = page.getByLabel('Search publications');
      await search.fill('no-publication-matches-this');
      assert.equal(await page.locator('[data-publication]:visible').count(), 0);
      assert.ok(await page.locator('[data-publication-empty]').isVisible());
      await search.fill('language');
      const before = await page.locator('[data-publication]:visible').count();
      if (width <= 800) await page.locator('[data-section-select]').selectOption('about');
      else await page.locator('[data-section="about"]').click();
      if (width <= 800) await page.locator('[data-section-select]').selectOption('publications');
      else await page.locator('[data-section="publications"]').click();
      assert.equal(await page.getByLabel('Search publications').inputValue(), 'language');
      assert.equal(await page.locator('[data-publication]:visible').count(), before);
      await page.getByLabel('Find a person').fill('no-person-matches');
      assert.equal(await page.locator('[data-record][data-search]:visible').count(), 0);
      assert.ok(await page.locator('[data-directory-empty]').isVisible());
      await page.getByLabel('Find a person').fill('dr');
      const nextPerson = page.locator('.record-browser-list [data-record]:visible').nth(1);
      const nextSlug = await nextPerson.getAttribute('data-record');
      await nextPerson.click();
      assert.equal(await page.getByLabel('Find a person').inputValue(), 'dr', 'Directory query survives record selection');
      assert.equal(await page.locator('#record').inputValue(), nextSlug);
      await load(page, 'family=events&layout=cards&role=organiser&section=overview');
      await page.getByRole('dialog').getByLabel('Practice announcement draft').fill('Preserve this unfinished note');
      if (width <= 800) await page.getByRole('dialog').locator('[data-section-select]').selectOption('registration');
      else await page.getByRole('dialog').locator('[data-section="registration"]').click();
      assert.equal(await page.getByRole('dialog').getByLabel('Practice announcement draft').inputValue(), 'Preserve this unfinished note');
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      assert.equal(await page.getByLabel('Practice announcement draft').inputValue(), 'Preserve this unfinished note');
      await load(page, 'family=events&layout=desk&view=directory');
      await page.getByLabel('Search events', { exact: true }).fill('zz-nothing-matches');
      assert.ok(await page.locator('[data-list-empty]').isVisible());
    });
    await context.close();
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(); page.setDefaultTimeout(8000);
  page.on('pageerror', error => errors.push(error.message));
  await check('motion-rapid-close-and-tab-focus', async () => {
    await load(page, 'family=events&layout=cards');
    const source = page.locator('[data-expand]').first(); await source.focus(); await page.keyboard.press('Enter');
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' });
    assert.equal(await source.evaluate(el => document.activeElement === el), true);
    await source.click(); await page.getByRole('dialog').waitFor();
    assert.equal(await page.getByRole('dialog').locator('.reading').evaluate(el => getComputedStyle(el).transform), 'none', 'Text must not scale');
    await page.keyboard.press('Tab');
    assert.ok(await page.getByRole('dialog').evaluate(el => el.contains(document.activeElement)), 'Focus stays inside dialog');
    if (exporting) {
      await page.waitForFunction(() => document.getAnimations().every(animation => animation.playState !== 'running'));
      await page.screenshot({ path: `${output}/events-cards-expanded-1440.png`, fullPage: true });
    }
    await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' });
  });
  await check('offline-images-and-untrusted-content', async () => {
    await page.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
    await load(page, 'family=events&layout=desk');
    assert.equal(await page.locator('.partner').count(), 6);
    assert.ok(await page.locator('.partner').first().textContent());
    const safe = await page.evaluate(async () => {
      const { rich, safeUrl } = await import('./comparison-content.js');
      const output = rich('<script>window.__unsafe=true</script><img src="x" onerror="window.__unsafe=true"><a href="javascript:alert(1)">unsafe</a>');
      return !/onerror|javascript:|<script/i.test(output) && safeUrl('javascript:alert(1)') === '';
    }); assert.ok(safe);
    await page.unroute('**/*');
  });
  await check('200-percent-equivalent-reflow', async () => {
    await page.setViewportSize({ width: 720, height: 500 });
    await load(page, 'family=events&layout=desk');
    await page.evaluate(() => document.documentElement.style.fontSize = '200%');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    assert.ok(await page.locator('[data-section-select]').isVisible());
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await check('all-public-records-and-sections', async () => {
    for (const family of ['events', 'people', 'projects', 'centres']) {
      await load(page, `family=${family}&layout=vertical`);
      const slugs = await page.locator('#record option').evaluateAll(els => els.map(el => el.value));
      for (const slug of slugs) {
        await page.locator('#record').selectOption(slug);
        const ids = await page.locator('.section-nav [data-section]').evaluateAll(els => els.map(el => el.dataset.section));
        for (const id of ids) {
          await page.locator(`.section-nav [data-section="${id}"]`).click();
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${family}/${slug}/${id}`);
          assert.equal(await page.locator('.reading').count(), 1);
        }
      }
    }
  });
  await check('schedule-days-sparse-content-and-many-partners', async () => {
    await page.route('**/comparison-data.json', async route => {
      const response = await route.fetch(); const body = await response.json();
      const example = structuredClone(body.data.events.find(x => x.slug.startsWith('voices-')));
      example.slug = 'browser-only-stress-record'; example.title = 'Browser-only layout stress record: a deliberately long title with many partners and no image';
      example.image = '';
      example.sponsors = Array.from({ length: 20 }, (_, i) => ({ name: `Browser-only partner ${i + 1}` }));
      example.subPages = [{ slug: 'programme', title: 'Programme', type: 'schedule', content: [{ day: 'Day 1', sessions: [{ time: '09:00', title: 'First test session' }] }, { day: 'Day 2', sessions: [{ time: '10:00', title: 'Second test session' }] }] }, { slug: 'empty', title: 'Unpublished details', type: 'markdown', content: null }];
      body.data.events.push(example);
      await route.fulfill({ response, json: body });
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await load(page, 'family=events&layout=cards&record=browser-only-stress-record');
    assert.equal(await page.locator('.partner').count(), 22);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    await page.locator('[data-expand="programme"]').click();
    await page.getByLabel('Programme day').selectOption('1');
    assert.ok(await page.getByRole('heading', { name: 'Second test session' }).isVisible());
    await page.getByRole('dialog').locator('[data-section-select]').selectOption('empty');
    await page.getByRole('dialog').locator('[data-section-select]').selectOption('programme');
    assert.equal(await page.getByLabel('Programme day').inputValue(), '1');
    await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'detached' });
    await page.unroute('**/comparison-data.json');
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await check('gallery-and-print', async () => {
    await page.goto(`${base}/designs/`);
    await page.getByRole('link', { name: 'Open the layout laboratory' }).click();
    await page.locator('.direction-gallery').waitFor();
    assert.equal(await page.locator('.direction-gallery>article').count(), 7);
    assert.equal(await page.locator('a[href="combined.html"]').count(), 1);
    if (exporting) {
      const labels = { vertical: 'Vertical navigation', cards: 'Expanding cards', desk: 'Programme desk', notebook: 'Open notebook', atlas: 'Section atlas', workspace: 'Connected workspace', ledger: 'Activity ledger' };
      await writeFile(`${output}/index.html`, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CoDIN comparison screenshots</title><link rel="stylesheet" href="../../comparison.css"></head><body><main class="review-index"><a href="../../compare.html?page=review">← Layout laboratory</a><h1>Every composition, at three sizes.</h1><p>Screenshots hide the review controls so you can assess the page itself. The interactive views include a Show / Hide review tools button.</p><table><thead><tr><th>Page / direction</th><th>Desktop</th><th>Tablet</th><th>Phone</th></tr></thead><tbody>${variants.map(([f, d]) => `<tr><td><a href="../../compare.html?family=${f}&layout=${d}">${f} / ${labels[d]}</a></td>${[1440, 768, 390].map(w => `<td><a href="${f}-${d}-${w}.png">${w}px</a></td>`).join('')}</tr>`).join('')}</tbody></table><p><a href="events-cards-expanded-1440.png">Expanded event card</a> · <a href="../layout-laboratory.pdf">Printable comparison PDF</a> · <a href="checks.json">Browser verification report</a></p></main></body></html>`);
      await page.emulateMedia({ media: 'print' });
      await page.pdf({ path: `${output}/../layout-laboratory.pdf`, format: 'A4', printBackground: true });
    }
  });
  await context.close();
  assert.deepEqual(errors, [], 'Browser JavaScript errors');
  assert.deepEqual(writes, [], 'Mockups must not make write requests');
  assert.deepEqual(apiRequests, [], 'Independent previews must not depend on a running API');
} finally { await browser.close(); }
const report = { passed: reports.length, failures, javascriptErrors: errors, writes, apiRequests, exported: exporting, checks: reports };
if (exporting) await writeFile(`${output}/checks.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
