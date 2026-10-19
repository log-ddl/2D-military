import { transformWithOxc } from 'vite';
import path from 'node:path';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { appendScene, projectPath, validId } from './projects.ts';
export function scenePath(projectId: string, sceneId: unknown) {
  return projectPath(projectId, `scenes/${validId(sceneId)}.ts`);
}
export function listScenes(projectId: string) {
  const dir = projectPath(projectId, 'scenes');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.ts')).flatMap(f => {
    const id = f.slice(0, -3), content = readFileSync(scenePath(projectId, id), 'utf8');
    if (!/export\s+default\s+class\b/.test(content)) return [];
    const is3D = content.includes('FSPass') || content.includes('THREE.ShaderMaterial'), is2D = content.includes('Layer2D');
    return [{ id, file: `projects/${projectId}/scenes/${f}`, title: content.match(/\/\/\s*(.*)/)?.[1] || id, lines: content.split('\n').length, is3D, is2D, category: is3D ? (is2D ? 'hybrid' : '3d') : '2d' }];
  });
}
export function readScene(projectId: string, id: unknown) {
  return readFileSync(scenePath(projectId, id), 'utf8');
}
export async function saveScene(projectId: string, id: string, code: unknown, create = false) {
  if (typeof code !== 'string' || !code.trim()) throw new Error('Scene code is required');
  const target = scenePath(projectId, id);
  if (!/export\s+default\s+class\b/.test(code) || !/extends\s+Scene\b/.test(code)) throw new Error('Expected a default Scene class');
  await transformWithOxc(code, target);
  // Keep previous source before replacing a scene.
  if (!create && existsSync(target)) {
    const dir = projectPath(projectId, `.history/${id}`);
    mkdirSync(dir, { recursive: true });
    writeFileSync(path.join(dir, `${Date.now()}.ts`), readFileSync(target));
  }
  if (create && existsSync(target)) throw new Error('Scene already exists');
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, code, { encoding: 'utf8', flag: create ? 'wx' : 'w' });
}
export { appendScene };

export function listVersions(projectId: string, id: string) {
  validId(id);
  const dir = projectPath(projectId, `.history/${id}`);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(name => /^\d+\.ts$/.test(name)).sort().reverse();
}
export function readVersion(projectId: string, id: string, version: unknown) {
  validId(id);
  if (typeof version !== 'string' || !/^\d+\.ts$/.test(version)) throw new Error('Invalid version');
  return readFileSync(projectPath(projectId, `.history/${id}/${version}`), 'utf8');
}
