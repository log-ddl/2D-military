#!/usr/bin/env bun
// Chuẩn hoá cấu trúc mọi project: docs/ data/ assets/audio/ tools/ scenes/ out/, docs/SHOT_PLAN.md,
// tools/sheet.py, và voiceFile/sfxFile trong project.json nếu đã có voice.mp3 / sfx.wav. An toàn chạy lại.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import { projectsRoot, repoRoot, shotPlanTemplate } from '../server/projects';

for (const d of readdirSync(projectsRoot, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const dir = path.join(projectsRoot, d.name);
  const pj = path.join(dir, 'project.json');
  if (!existsSync(pj)) continue;
  for (const s of ['scenes', 'assets/audio', 'data', 'docs', 'tools', 'out']) mkdirSync(path.join(dir, s), { recursive: true });
  const meta = JSON.parse(readFileSync(pj, 'utf8'));
  const plan = path.join(dir, 'docs/SHOT_PLAN.md');
  if (!existsSync(plan)) writeFileSync(plan, shotPlanTemplate(d.name));
  if (!existsSync(path.join(dir, 'tools/sheet.py'))) copyFileSync(path.join(repoRoot, 'templates/tools/sheet.py'), path.join(dir, 'tools/sheet.py'));
  const oldSheet = path.join(dir, 'sheet.sh');
  if (existsSync(oldSheet)) renameSync(oldSheet, path.join(dir, 'tools/sheet.sh'));
  let changed = false;
  if (existsSync(path.join(dir, 'assets/audio/voice.mp3')) && !meta.voiceFile) { meta.voiceFile = 'assets/audio/voice.mp3'; changed = true; }
  if (existsSync(path.join(dir, 'assets/audio/sfx.wav')) && !meta.sfxFile) { meta.sfxFile = 'assets/audio/sfx.wav'; meta.sfxGain = 0.5; changed = true; }
  if (changed) writeFileSync(pj, JSON.stringify(meta, null, 2) + '\n');
  console.log(d.name, changed ? 'updated meta' : 'ok');
}
