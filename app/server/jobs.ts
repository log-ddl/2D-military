import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { atomicJson, repoRoot, projectPath } from './projects.ts';
import { randomUUID } from 'node:crypto';
import type { ChildProcess } from 'node:child_process';
export interface Job {
  // Keep the legacy AI kind readable in saved job history; new jobs are render-only.
  id: string; projectId: string; kind: 'ai' | 'render';
  status: 'running' | 'succeeded' | 'failed' | 'cancelled';
  startedAt: string; finishedAt?: string; error?: string; outName?: string; outPath?: string; renderPath?: string;
}
const jobs = new Map<string, Job>();
const stateFile = path.join(repoRoot, '.studio/jobs.json');
if (existsSync(stateFile)) {
  for (const job of JSON.parse(readFileSync(stateFile, 'utf8')) as Job[]) {
    if (job.status === 'running') { job.status = 'failed'; job.error = 'Server restarted before job completion'; job.finishedAt = new Date().toISOString(); }
    jobs.set(job.id, job);
  }
}
function persist() { mkdirSync(path.dirname(stateFile), { recursive: true }); atomicJson(stateFile, [...jobs.values()]); }
const children = new Map<string, ChildProcess>();
export function createJob(projectId: string, kind: 'render') {
  if ([...jobs.values()].some(job => job.projectId === projectId && job.kind === kind && job.status === 'running')) throw new Error('A render job is already running for this project');
  const job: Job = { id: randomUUID(), projectId, kind, status: 'running', startedAt: new Date().toISOString() };
  jobs.set(job.id, job); persist();
  return job;
}
export function finishJob(job: Job, error?: string) {
  if (job.status === 'cancelled') return;
  job.status = error ? 'failed' : 'succeeded';
  job.error = error; job.finishedAt = new Date().toISOString();
  children.delete(job.id); persist();
}
export function watchProcess(job: Job, child: ChildProcess) {
  if (job.status === 'cancelled') child.kill('SIGTERM');
  else children.set(job.id, child);
}
function withProgress(job: Job) {
  if (job.status !== 'running' || !job.outName) return job;
  try { return { ...job, progress: JSON.parse(readFileSync((job.renderPath ?? projectPath(job.projectId, `out/${job.outName}`)) + '.progress', 'utf8')) }; } catch { return job; }
}
export function listJobs(projectId: string) { return [...jobs.values()].filter(j => j.projectId === projectId).map(withProgress); }
export function cancelJob(projectId: string, id: string) {
  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) throw new Error('Invalid request ID');
  const job = jobs.get(id), child = children.get(id);
  if (!job || job.projectId !== projectId || job.status !== 'running' || !child) throw new Error('No cancellable job found');
  child.kill('SIGTERM');
  job.status = 'cancelled'; job.finishedAt = new Date().toISOString();
  children.delete(id); persist();
}
