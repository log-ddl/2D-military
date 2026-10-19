import assert from 'node:assert/strict';
import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { activeProjectId, selectProject, repoRoot } from '../server/projects';
const saved = activeProjectId(), stamp = Date.now();
const ids = [`verify_delete_${stamp}_a`, `verify_delete_${stamp}_b`];
const base = 'http://localhost:5173';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
async function api(route: string, data: object) {
  const response = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return { status: response.status, body: await response.json() as any };
}
try {
  for (const id of ids) {
    assert.equal((await api('/api/projects/new', { id, name: id })).status, 200);
    writeFileSync(path.join(repoRoot, 'projects', id, 'out', `${id}.mp4`), 'fixture');
  }
  // B is globally selected, but this tab explicitly opens A.
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/?project=${ids[0]}`);
  await page.locator('#btn-export-modal').click();
  await page.waitForSelector('#recent-exports-list .export-card');
  assert.equal(await page.locator('#export-project-name').innerText(), ids[0]);
  assert.equal(await page.locator('#export-scope').count(), 0);
  assert.equal(await page.locator('#export-to').inputValue(), '15');
  assert.match(await page.locator('#recent-exports-list').innerText(), new RegExp(ids[0]!));
  assert.ok(!(await page.locator('#modal-export').innerText()).includes(ids[1]!));
  await page.locator('#export-to').fill('16'); await page.locator('#start-export').click();
  assert.match(await page.locator('#export-log').innerText(), /Chọn khoảng/);
  await page.locator('#export-to').fill('0.1'); await page.locator('#export-fps').selectOption('25');
  const requestPromise = page.waitForRequest(request => request.url().endsWith('/api/export') && request.method() === 'POST');
  await page.locator('#start-export').click();
  assert.equal((await requestPromise).postDataJSON().projectId, ids[0]);
  await page.waitForFunction(() => document.querySelector('#export-log')?.textContent?.includes('Đã xuất xong'), null, { timeout: 60000 });
  assert.equal(readdirSync(path.join(repoRoot, 'projects', ids[1]!, 'out')).length, 1);
  await page.locator('#close-export-modal').click();
  await page.locator('#btn-projects-modal').click();
  await page.locator('#project-search').fill(ids[1]!);
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator(`[data-delete="${ids[1]}"]`).click();
  assert.ok(existsSync(path.join(repoRoot, 'projects', ids[1]!)));
  page.once('dialog', dialog => dialog.accept());
  await page.locator(`[data-delete="${ids[1]}"]`).click();
  await page.waitForFunction(() => document.querySelector('#new-proj-status')?.textContent?.startsWith('Đã xóa'));
  assert.ok(!existsSync(path.join(repoRoot, 'projects', ids[1]!)));
  assert.ok(page.url().includes(ids[0]!));
  await page.locator('#project-search').fill(ids[0]!);
  page.once('dialog', dialog => dialog.accept());
  await Promise.all([page.waitForNavigation(), page.locator(`[data-delete="${ids[0]}"]`).click()]);
  await page.waitForSelector('#btn-projects-modal');
  assert.ok(!page.url().includes(ids[0]!));
  assert.ok(!existsSync(path.join(repoRoot, 'projects', ids[0]!)));
  for (const id of ids) assert.ok(readdirSync(path.join(repoRoot, '.studio/deleted-projects')).some(name => name.startsWith(id + '-')));
  assert.equal((await api('/api/projects/delete', { id: '../outside' })).status, 400);
  assert.deepEqual(errors, []);
  await page.locator('#btn-export-modal').click();
  await page.screenshot({ path: path.join(repoRoot, 'out/export-current-project.png') });
  console.log('PASS: project-scoped custom export despite another active project, bounds, real MP4, cancel/confirm deletion, active deletion navigation, recoverable files, invalid ID rejected');
} finally {
  await browser.close(); selectProject(saved);
  for (const id of ids) {
    rmSync(path.join(repoRoot, 'projects', id), { recursive: true, force: true });
    const trash = path.join(repoRoot, '.studio/deleted-projects');
    if (existsSync(trash)) for (const name of readdirSync(trash).filter(name => name.startsWith(id + '-'))) rmSync(path.join(trash, name), { recursive: true, force: true });
  }
}
