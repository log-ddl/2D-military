import type { ProjectConfig } from '../shared/project-types';
export type { ProjectConfig } from '../shared/project-types';
let project: ProjectConfig;
export function setActiveProject(value: ProjectConfig) { project = value; }
export function getActiveProject(): ProjectConfig { return project; }
export function assetUrl(relative: string): string {
  return `/projects/${project.id}/${relative.split('/').map(encodeURIComponent).join('/')}`;
}
export async function loadProject(id?: string): Promise<ProjectConfig> {
  let value: ProjectConfig;
  const response = await fetch(id ? `/api/project?projectId=${encodeURIComponent(id)}` : '/api/active-project');
  if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
    value = await response.json();
  } else {
    const projectId = id || 'clean_canvas';
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(projectId)) throw new Error('Invalid project ID');
    const [meta, timeline] = await Promise.all(['project.json', 'timeline.json'].map(file => fetch(`/projects/${projectId}/${file}`)));
    if (!meta.ok || !timeline.ok) throw new Error('Could not load project');
    value = { ...await meta.json(), timeline: await timeline.json() };
  }
  setActiveProject(value);
  return value;
}
