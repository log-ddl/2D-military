import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { ProjectConfig, ProjectEntry, ProjectMeta } from '../src/shared/project-types.ts';

export const appRoot = path.resolve(import.meta.dirname, '..');
export const repoRoot = path.resolve(appRoot, '..');
export const projectsRoot = path.join(repoRoot, 'projects');
const stateFile = path.join(repoRoot, '.studio/active-project.json');
export function validId(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(value)) throw new Error('Invalid project or scene ID');
  return value;
}
export function projectDir(id: unknown): string {
  const dir = path.join(projectsRoot, validId(id));
  if (!existsSync(path.join(dir, 'project.json'))) throw new Error('Project not found');
  return dir;
}
export function projectPath(id: unknown, relative: string): string {
  const dir = projectDir(id);
  const target = path.resolve(dir, relative);
  if (!target.startsWith(dir + path.sep)) throw new Error('Path must be inside the project');
  return target;
}
export function atomicJson(file: string, value: unknown) {
  const temp = file + '.tmp';
  writeFileSync(temp, JSON.stringify(value, null, 2) + '\n');
  renameSync(temp, file);
}
export function validateTimeline(entries: unknown): asserts entries is ProjectEntry[] {
  if (!Array.isArray(entries)) throw new Error('Timeline must be an array');
  const ids = new Set<string>();
  for (const entry of entries) {
    validId(entry.id); validId(entry.scene);
    if (ids.has(entry.id)) throw new Error('Duplicate timeline entry ID');
    ids.add(entry.id);
    if (!Number.isFinite(entry.start) || !Number.isFinite(entry.end) || entry.start < 0 || entry.end <= entry.start) throw new Error('Invalid timeline interval');
  }
}
export function readProject(id: unknown): ProjectConfig {
  const dir = projectDir(id);
  const meta = JSON.parse(readFileSync(path.join(dir, 'project.json'), 'utf8')) as ProjectMeta;
  const timeline = JSON.parse(readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
  if (meta.id !== id || meta.schemaVersion !== 1 || !Number.isFinite(meta.duration) || meta.duration <= 0) throw new Error('Invalid project metadata');
  validateTimeline(timeline);
  return { ...meta, timeline };
}
export function activeProjectId(): string {
  const id = existsSync(stateFile) ? JSON.parse(readFileSync(stateFile, 'utf8')).active : 'clean_canvas';
  if (typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id) && existsSync(path.join(projectsRoot, id, 'project.json'))) return id;
  return listProjects()[0]?.id || createProject({ name: 'Dự án trống' }).id;
}
export function selectProject(id: unknown) {
  readProject(id);
  mkdirSync(path.dirname(stateFile), { recursive: true });
  atomicJson(stateFile, { active: id });
}
export function listProjects() {
  return readdirSync(projectsRoot, { withFileTypes: true }).filter(d => d.isDirectory() && existsSync(path.join(projectsRoot, d.name, 'project.json'))).map(d => readProject(d.name));
}
export function saveTimeline(id: string, timeline: unknown) {
  validateTimeline(timeline);
  const project = readProject(id);
  for (const e of timeline) if (!existsSync(projectPath(id, `scenes/${e.scene}.ts`))) throw new Error(`Scene not found: ${e.scene}`);
  atomicJson(projectPath(id, 'timeline.json'), timeline);
  const { timeline: _old, ...meta } = project;
  meta.duration = Math.max(meta.duration, ...timeline.map(e => e.end));
  atomicJson(projectPath(id, 'project.json'), meta);
}
export function appendScene(id: string, scene: string, duration = 5) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Invalid scene duration');
  const project = readProject(id);
  const start = Math.max(0, ...project.timeline.map(e => e.end));
  let entryId = scene;
  while (project.timeline.some(e => e.id === entryId)) entryId = `${scene}_${Date.now()}`;
  saveTimeline(id, [...project.timeline, { id: entryId, scene, start, end: start + duration }]);
}
// The skill owns the shot plan format; projects start from its template so tools and skill agree.
export function shotPlanTemplate(id: string): string {
  const file = path.join(repoRoot, '.agents/skills/code-video-director/templates/SHOT_PLAN.md');
  return existsSync(file) ? readFileSync(file, 'utf8').replace('<id>', id) : `# Shot plan: ${id}\n`;
}
export function createProject(data: Record<string, any>) {
  const slug = String(data.id || data.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9_-]+/g, '_').replace(/^[_-]+|[_-]+$/g, '');
  const id = validId(slug || `project_${Date.now()}`);
  const dir = path.join(projectsRoot, id);
  if (existsSync(dir)) throw new Error('Tên dự án này đã tồn tại. Hãy chọn tên khác.');
  const duration = Number(data.duration ?? 15);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Thời lượng dự án phải lớn hơn 0 giây.');
  if (data.template && !['empty', 'starter'].includes(data.template)) throw new Error('Mẫu khởi tạo không hợp lệ.');
  for (const sub of ['scenes', 'assets/audio', 'data', 'docs', 'tools', 'out']) mkdirSync(path.join(dir, sub), { recursive: true });
  writeFileSync(path.join(dir, 'docs/SHOT_PLAN.md'), shotPlanTemplate(id));
  let timeline: ProjectEntry[] = [];
  if (data.template === 'starter') {
    cpSync(path.join(repoRoot, 'templates', 'starter', 'scenes'), path.join(dir, 'scenes'), { recursive: true });
    timeline = [{ id: 'battlemap', scene: 'battlemap', start: 0, end: duration }];
  }
  const meta: ProjectMeta = { schemaVersion: 1, id, name: data.name || id, duration, hasAudio: false, bpm: Number(data.bpm) || 120, type: 'custom', createdAt: new Date().toISOString() };
  atomicJson(path.join(dir, 'project.json'), meta);
  atomicJson(path.join(dir, 'timeline.json'), timeline);
  selectProject(id);
  return readProject(id);
}

/** Remove from the project list while retaining files for recovery. */
export function deleteProject(id: unknown) {
  const project = readProject(id);
  const wasActive = activeProjectId() === project.id;
  const trash = path.join(repoRoot, '.studio', 'deleted-projects');
  mkdirSync(trash, { recursive: true });
  const destination = path.join(trash, `${project.id}-${Date.now()}`);
  renameSync(projectDir(project.id), destination);
  const next = listProjects()[0]?.id || createProject({ name: 'Dự án trống' }).id;
  if (wasActive) selectProject(next);
  return { success: true, nextProjectId: next };
}
