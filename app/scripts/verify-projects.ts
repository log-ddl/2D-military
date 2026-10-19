import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
import { activeProjectId, repoRoot, projectPath } from '../server/projects';
const port = 5197, base = `http://localhost:${port}`, savedActive = activeProjectId();
const ids = [`verify_${Date.now()}_a`, `verify_${Date.now()}_b`];
const server = Bun.spawn(['bun', 'run', 'dev', '--port', String(port), '--strictPort'], { cwd: path.join(repoRoot, 'app'), stdout: 'ignore', stderr: 'inherit' });
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
async function api(route: string, data?: unknown) {
  const response = await fetch(base + route, data === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  return { response, data: await response.json() };
}
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base)).ok) break; } catch {}
    await Bun.sleep(100);
  }
  for (const id of ids) {
    const created = await api('/api/projects/new', { id, name: id, duration: 2, template: 'empty' });
    assert.equal(created.response.status, 200);
    assert.deepEqual(created.data.project.timeline, []);
    assert.equal(created.data.project.hasAudio, false);
  }
  const source = readFileSync(projectPath('clean_canvas', 'scenes/battlemap.ts'), 'utf8');
  for (const [index, id] of ids.entries()) {
    const saved = await api('/api/save-scene', { projectId: id, id: 'same', code: `// owner ${index}\n` + source, addToTimeline: true, duration: 1 });
    assert.equal(saved.response.status, 200, JSON.stringify(saved.data));
  }
  for (const [index, id] of ids.entries()) {
    assert.ok((await (await fetch(`${base}/api/scene-code?projectId=${id}&id=same`)).text()).startsWith(`// owner ${index}`));
    assert.equal((await api(`/api/project?projectId=${id}`)).data.timeline[0].scene, 'same');
    assert.ok(!('timeline' in JSON.parse(readFileSync(projectPath(id, 'project.json'), 'utf8'))));
  }
  const changed = await api('/api/save-scene', { projectId: ids[0], id: 'same', code: '// changed\n' + source });
  assert.equal(changed.response.status, 200);
  const versions = (await api(`/api/scene-versions?projectId=${ids[0]}&id=same`)).data.versions;
  assert.equal(versions.length, 1);
  const restored = await api('/api/restore-scene', { projectId: ids[0], id: 'same', version: versions[0] });
  assert.equal(restored.response.status, 200);
  assert.ok(restored.data.code.startsWith('// owner 0'));
  for (const data of [
    { projectId: ids[0], id: '../escape', code: source }, { id: 'same', code: source },
    { projectId: ids[0], id: 'same', code: 'export default class Broken extends Scene { !!! }' },
  ]) assert.equal((await api('/api/save-scene', data)).response.status, 400);
  assert.ok(readFileSync(projectPath(ids[0], 'scenes/same.ts'), 'utf8').startsWith('// owner 0'));
  assert.equal((await api('/api/timeline', { projectId: ids[0], timeline: [{ id: 'x', scene: 'same', start: 2, end: 1 }] })).response.status, 400);
  assert.deepEqual((await api('/api/scenes?projectId=test')).data.scenes.map((s: any) => s.id), ['v__tinh_qu____o_qu']);
  console.log('PASS: isolated scene IDs, project ownership, single timeline storage, invalid writes rejected');
  const started = await api('/api/export', { projectId: ids[0], from: 0, to: 0.2, fps: 10, samples: 1, scale: 1 });
  assert.equal(started.response.status, 200);
  await api('/api/projects/switch', { id: ids[1] });
  let renderJob: any;
  for (let i = 0; i < 40; i++) {
    renderJob = (await api(`/api/jobs?projectId=${ids[0]}`)).data.jobs.find((job: any) => job.id === started.data.jobId);
    if (renderJob.status !== 'running') break;
    await Bun.sleep(500);
  }
  assert.equal(renderJob.status, 'succeeded', JSON.stringify(renderJob));
  assert.ok(existsSync(projectPath(ids[0], `out/${started.data.outName}`)));
  const cancellable = await api('/api/export', { projectId: ids[0], from: 0, to: 2, fps: 60, samples: 324, scale: 2 });
  assert.equal(cancellable.response.status, 200);
  await Bun.sleep(2000);
  assert.equal((await api('/api/jobs/cancel', { projectId: ids[0], id: cancellable.data.jobId })).response.status, 200);
  await Bun.sleep(1000);
  assert.equal((await api(`/api/jobs?projectId=${ids[0]}`)).data.jobs.find((job: any) => job.id === cancellable.data.jobId).status, 'cancelled');
  console.log('PASS: source restore, backend render ownership and cancellation');
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=metal', '--ignore-gpu-blocklist'] });
  for (const id of ['test', 'clean_canvas', 'pdoom_original', ids[0]]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors: string[] = [], requests: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', r => requests.push(r.url()));
    await page.goto(`${base}/?export=1&project=${id}`);
    await page.waitForFunction(() => (window as any).__pdoom?.ready || (window as any).__pdoom?.error, null, { timeout: 120000 });
    const result = await page.evaluate(() => {
      const runtime = (window as any).__pdoom;
      if (runtime.error) return { error: runtime.error };
      for (const entry of runtime.timeline) runtime.still((entry.start + entry.end) / 2);
      return { errors: runtime.errors, duration: runtime.duration, scenes: runtime.timeline.length };
    });
    assert.ok(!result.error, result.error); assert.deepEqual(result.errors, []); assert.deepEqual(errors, []);
    if (id !== 'pdoom_original') assert.ok(!requests.some(url => url.includes('/pdoom_original/')), 'Another project asset was requested');
    console.log(`PASS: browser ${id}, ${result.scenes} entries, duration ${result.duration}`);
    if (id === 'test') await page.screenshot({ path: projectPath('test', 'out/project-preview.png') });
    await page.close();
  }
  const page = await browser.newPage();
  await page.goto(`${base}/?project=test`);
  await page.waitForSelector('#btn-save-code');
  await page.waitForFunction(() => (document.querySelector('#code-editor') as HTMLTextAreaElement)?.value.includes('extends Scene'));
  assert.equal(await page.locator('#code-file-title').textContent(), 'projects/test/scenes/v__tinh_qu____o_qu.ts');
  await page.locator('#btn-projects-modal').click();
  await page.waitForSelector('[data-switch="clean_canvas"]');
  await page.locator('[data-switch="clean_canvas"]').click();
  await page.waitForURL('**/?project=clean_canvas');
  await page.waitForSelector('#btn-save-code');
  assert.ok((await page.locator('#code-file-title').textContent())?.startsWith('projects/clean_canvas/'));
  console.log('PASS: editor paths and project switching from explicit URL');
} finally {
  if (browser) await browser.close();
  try { await api('/api/projects/switch', { id: savedActive }); } catch {}
  server.kill(); await server.exited;
  for (const id of ids) { const dir = path.join(repoRoot, 'projects', id); if (existsSync(dir)) rmSync(dir, { recursive: true }); }
}
