import type { TimelineEntry } from '../engine/engine';
import type { SceneClass } from '../engine/scene';
import { getActiveProject } from './project-loader';
import Blank from './blank';
const modules = import.meta.glob<{ default: SceneClass }>('../../../projects/*/scenes/*.ts');
export function makeTimeline(): TimelineEntry[] {
  const project = getActiveProject();
  const draft = new URLSearchParams(location.search).get('draft');
  const timeline = draft && /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(draft) ? [{ id: draft, scene: draft, start: 0, end: project.duration }] : project.timeline;
  const entries: TimelineEntry[] = timeline.map(e => ({
    ...e,
    load: () => {
      const load = modules[`../../../projects/${project.id}/scenes/${e.scene}.ts`];
      if (load) return load();
      // Newly created scenes may not be in the initial glob registry yet. Vite transforms this project URL on demand.
      if (import.meta.env.DEV) return import(/* @vite-ignore */ `/projects/${project.id}/scenes/${e.scene}.ts`);
      return Promise.reject(new Error(`Scene not found: ${project.id}/${e.scene}`));
    },
  }));
  // Blank entries also cover timeline gaps without leaking scenes from another project.
  const spans = [...entries].sort((a, b) => a.start - b.start);
  let end = 0, index = 0;
  for (const e of spans) {
    if (e.start > end) entries.push({ id: `blank_${index++}`, start: end, end: e.start, load: async () => ({ default: Blank }) });
    end = Math.max(end, e.end);
  }
  if (end < project.duration) entries.push({ id: `blank_${index}`, start: end, end: project.duration, load: async () => ({ default: Blank }) });
  return entries.sort((a, b) => a.start - b.start);
}
