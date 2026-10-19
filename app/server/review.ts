import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { atomicJson, projectPath, readProject } from './projects.ts';
export function readNotes(id: string) {
  const file = projectPath(id, 'data/review-notes.json');
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
}
export function saveNotes(id: string, notes: unknown) {
  const duration = readProject(id).duration;
  if (!Array.isArray(notes) || notes.length > 2000) throw new Error('Danh sách ghi chú không hợp lệ');
  const ids = new Set<string>();
  const clean = notes.map(n => {
    if (!n || typeof n.id !== 'string' || !/^[\w-]{1,100}$/.test(n.id) || ids.has(n.id) || !Number.isFinite(n.time) || n.time < 0 || n.time > duration || typeof n.text !== 'string' || !n.text.trim() || n.text.length > 5000 || typeof n.done !== 'boolean') throw new Error('Ghi chú không hợp lệ');
    ids.add(n.id);
    return { id: n.id, time: n.time, text: n.text.trim(), done: n.done };
  });
  const file = projectPath(id, 'data/review-notes.json');
  mkdirSync(path.dirname(file), { recursive: true }); atomicJson(file, clean);
  return clean;
}
