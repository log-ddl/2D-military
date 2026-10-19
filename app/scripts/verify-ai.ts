// Opt-in live test; uses the user's configured CLI accounts.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, rmSync, cpSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';
const base = process.env.STUDIO_URL || 'http://127.0.0.1:5194';
if (process.env.STUDIO_LIVE_AI !== '1') throw new Error('Set STUDIO_LIVE_AI=1 to run two real CLI sessions.');
const root = path.resolve(import.meta.dirname, '../..');
const providers = ['claude', 'agy'];
const ids = providers.map(p => `ai_check_${p}_${Date.now()}`);
async function api(route: string, id?: string, body?: object) {
 const res = await fetch(`${base}/api/ai/${route}${body ? '' : `?projectId=${id || ids[0]}`}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: id, ...body }) } : undefined);
 return { code: res.status, ...await res.json() };
}
async function done(id: string) {
 for (let i = 0; i < 120; i++) { const { session } = await api('session', id); if (!['running', 'queued', 'stopping'].includes(session.status)) return session; await new Promise(r => setTimeout(r, 1000)); }
 throw new Error('CLI timeout');
}
for (const id of ids) {
 const dir = path.join(root, 'projects', id); mkdirSync(path.join(dir, 'scenes'), { recursive: true });
 writeFileSync(path.join(dir, 'project.json'), JSON.stringify({ schemaVersion: 1, id, name: id, duration: 10, hasAudio: false }));
 writeFileSync(path.join(dir, 'timeline.json'), JSON.stringify([{ id: 'blank', scene: 'blank', start: 0, end: 10 }]));
 cpSync(path.join(root, 'app/src/runtime/blank.ts'), path.join(dir, 'scenes/blank.ts'));
}
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
try {
 const starts = await Promise.all(ids.map((id, i) => api('start', id, { provider: providers[i], mode: 'edit', instructions: 'Use file-writing tools only; do not run shell commands. Follow the user requested text exactly.', prompt: `Remember the code word ORCHID_${i}. Create proof.txt in the current project containing exactly ORCHID_${i}, using the file write tool. Do not read or change any other files. Reply DONE after writing.` })));
 starts.forEach(s => assert.equal(s.code, 200));
 assert.equal((await api('start', ids[0], { provider: 'claude', prompt: 'duplicate' })).code, 400);
 const deleting = await fetch(`${base}/api/projects/delete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: ids[0] }) }); assert.equal(deleting.status, 400);
 assert.equal((await api('overview')).sessions.filter((s: any) => ids.includes(s.projectId) && s.status === 'running').length, 2);
 const results = await Promise.all(ids.map(done));
 results.forEach((s, i) => { console.log(providers[i], s.status, s.error || ''); assert.equal(s.status, 'succeeded'); assert.equal(readFileSync(path.join(root, 'projects', ids[i]!, 'proof.txt'), 'utf8').trim(), `ORCHID_${i}`); });
 assert.notEqual(results[0].sessionId, results[1].sessionId);
 await Promise.all(ids.map((id, i) => api('start', id, { provider: providers[i], mode: 'edit', prompt: 'Without tools, repeat the code word I asked you to remember earlier. Reply only that code word.' })));
 const continued = await Promise.all(ids.map(done));
 continued.forEach((s, i) => { assert.equal(s.status, 'succeeded'); assert.equal(s.sessionId, results[i].sessionId); assert.ok(s.events.filter((e: any) => e.kind === 'assistant').at(-1).text.includes(`ORCHID_${i}`)); });
 browser = await chromium.launch({ channel: 'chrome', headless: true });
 const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
 const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
 await page.goto(`${base}/?project=${ids[0]}&panel=ai`); await page.waitForSelector('#ai-panel', { state: 'visible' });
 await page.waitForFunction(() => !document.querySelector<HTMLButtonElement>('#ai-send')?.disabled);
 assert.ok((await page.locator('#ai-log').innerText()).includes('ORCHID_0'));
 assert.equal(await page.locator('#ai-provider').isDisabled(), true);
 await page.locator('#ai-prompt').fill('Draft survives reload'); await page.reload(); await page.waitForSelector('#ai-panel'); assert.equal(await page.locator('#ai-prompt').inputValue(), 'Draft survives reload');
 await page.screenshot({ path: '/tmp/pdoom-ai.png' }); assert.deepEqual(errors, []);
 const badOrigin = await fetch(`${base}/api/ai/start`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.com' }, body: JSON.stringify({ projectId: ids[0], provider: 'claude', prompt: 'blocked' }) }); assert.equal(badOrigin.status, 400);
 await api('start', ids[0], { provider: 'claude', mode: 'plan', prompt: 'Explain the mathematics of Fourier analysis in detail, without using tools.' });
 await api('cancel', ids[0], {}); assert.equal((await done(ids[0]!)).status, 'cancelled');
 console.log('PASS: parallel CLIs, file writes, resume/memory, busy/delete locks, browser/drafts, origin guard, cancel');
} finally {
 await browser?.close();
 for (const id of ids) { const s = await api('session', id); if (['running','queued','stopping'].includes(s.session?.status)) { await api('cancel', id, {}); await done(id); } await api('reset', id, {}); rmSync(path.join(root, 'projects', id), { recursive: true, force: true }); rmSync(path.join(root, '.studio/ai', `${id}.json`), { force: true }); rmSync(path.join(root, '.studio/ai/history', id), { recursive: true, force: true }); }
}
