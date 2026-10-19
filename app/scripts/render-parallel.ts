#!/usr/bin/env bun
// Xuất video song song: chia khoảng thời gian thành N phần (mặc định 1: encoder đã dùng hết CPU, thêm phần chỉ tốn thêm RAM), mỗi phần một tiến trình render.ts,
// rồi nối bằng ffmpeg và ghép âm thanh. Ghi tiến độ vào <out>.progress (JSON) để Studio hiện phần trăm.
//   bun scripts/render-parallel.ts --project id --from 0 --to 120 --fps 60 --scale 1 --samples 1 --out file.mp4 [--parts 2] [--url ..] [--only ..]
import { mkdirSync, readFileSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { activeProjectId, readProject, projectPath } from '../server/projects';
import { audioPlan } from './audio-plan';

const argv = process.argv.slice(2);
const opt = (k: string, d?: string) => { const i = argv.indexOf(`--${k}`); return i >= 0 ? argv[i + 1] : d; };
const projectId = opt('project') || activeProjectId();
const project = readProject(projectId);
const from = +opt('from', '0')!, to = +opt('to', String(project.duration))!, fps = +opt('fps', '60')!;
const N = Math.max(1, Math.min(4, Math.round(+opt('parts', '1')!)));
const out = path.resolve(opt('out', projectPath(projectId, `out/${projectId}.mp4`))!);
mkdirSync(path.dirname(out), { recursive: true });

const f0 = Math.round(from * fps), f1 = Math.round(to * fps), total = f1 - f0;
const cut = (i: number) => (f0 + Math.round((total * i) / N)) / fps;
const parts = Array.from({ length: N }, (_, i) => ({ from: cut(i), to: cut(i + 1), file: out.replace(/\.mp4$/i, '') + `.part${i}.mp4` }));
const progressFile = out + '.progress';
const t0 = performance.now();
const children: ReturnType<typeof Bun.spawn>[] = [];
const cleanup = () => { for (const p of parts) for (const f of [p.file, p.file + '.progress']) if (existsSync(f)) rmSync(f); };
const stop = () => { for (const c of children) c.kill(); cleanup(); if (existsSync(progressFile)) rmSync(progressFile); process.exit(143); };
process.once('SIGTERM', stop); process.once('SIGINT', stop);

const read = (f: string) => { try { return JSON.parse(readFileSync(f, 'utf8')) as { frames: number; total: number }; } catch { return { frames: 0, total: 0 }; } };
function report(stage: string) {
  const frames = parts.reduce((s, p) => s + read(p.file + '.progress').frames, 0);
  const el = (performance.now() - t0) / 1000;
  const pct = stage === 'render' ? Math.min(99, (frames / total) * 100) : stage === 'done' ? 100 : 99;
  const eta = frames > 0 ? ((total - frames) / (frames / el)) : null;
  writeFileSync(progressFile, JSON.stringify({ pct: +pct.toFixed(1), frames, total, eta, stage }));
  process.stdout.write(`\r${pct.toFixed(1)}%  ${frames}/${total} frames  ${stage}   `);
}

const base = ['bun', 'scripts/render.ts', 'video', '--project', projectId, '--fps', String(fps), '--scale', opt('scale', '1')!, '--samples', opt('samples', '1')!, '--noaudio'];
if (opt('url')) base.push('--url', opt('url')!);
if (opt('only')) base.push('--only', opt('only')!);
for (const p of parts) children.push(Bun.spawn([...base, '--from', String(p.from), '--to', String(p.to), '--out', p.file], { cwd: path.resolve(import.meta.dir, '..'), stdout: 'ignore', stderr: 'inherit' }));
const timer = setInterval(() => report('render'), 1000);
const codes = await Promise.all(children.map((c) => c.exited));
clearInterval(timer);
if (codes.some((c) => c !== 0)) { cleanup(); if (existsSync(progressFile)) rmSync(progressFile); throw new Error(`Render failed (${codes.join(',')})`); }

// nối các phần và ghép âm thanh
report('mux');
const list = out + '.txt';
writeFileSync(list, parts.map((p) => `file '${p.file.replace(/'/g, "'\\''")}'`).join('\n'));
const plan = audioPlan(project, projectId, from, to, opt('sfx', 'on') !== 'off', opt('sfx-gain') ? +opt('sfx-gain')! : undefined);
const args = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list];
if (plan) args.push(...plan.input, ...plan.filter, ...plan.map, '-c:a', 'aac', '-b:a', '320k', '-shortest');
args.push('-c:v', 'copy', '-movflags', '+faststart', out);
const code = await Bun.spawn(args, { stdout: 'inherit', stderr: 'inherit' }).exited;
rmSync(list); cleanup();
if (code !== 0) { if (existsSync(progressFile)) rmSync(progressFile); throw new Error(`ffmpeg concat failed (${code})`); }
report('done');
console.log(`\nwrote ${out} (${((performance.now() - t0) / 1000).toFixed(1)}s, ${N} processes)`);
setTimeout(() => { if (existsSync(progressFile)) rmSync(progressFile); }, 5000);
