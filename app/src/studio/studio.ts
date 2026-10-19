import { setupAI } from './ai';
import { mountReview } from './review';
import { setupPlayerControls } from './player';
import { mountTimelinePanel } from './timeline';
import { setupScenes } from './scenes';
import { mountStudio } from './layout';
import { setupExportModal } from './export';
import { setupProjectsModal } from './projects';
import { getActiveProject } from '../runtime/project-loader';
import type { Engine } from '../engine/engine';

export interface StudioOptions {
  engine: Engine;
  timeline: Array<{ id: string; start: number; end: number; file?: string }>;
  seek: (t: number) => void;
  togglePlay: () => void;
  getPlaying: () => boolean;
  getCurrentTime: () => number;
  toggleLoop: () => void;
  getLoop: () => boolean;
  hasAudio: boolean;
  getVolume: () => number;
  setVolume: (value: number) => void;
  hasSfx?: boolean;
  getSfx?: () => boolean;
  setSfx?: (on: boolean) => void;
}

export function setupStudio(opts: StudioOptions) {
  const { timeline, seek, getCurrentTime } = opts;

  const draft = new URLSearchParams(location.search).get('draft');
  const selection = { sceneId: draft || getActiveProject().timeline[0]?.scene || '' };
  const projectId = getActiveProject().id;
  const sceneForEntry = (id: string) => getActiveProject().timeline.find(e => e.id === id)?.scene || (id === draft ? draft : '');
  mountStudio(timeline);

  // Hook elements
  const leftSidebar = document.getElementById('studio-sidebar-left')!;
  const rightSidebar = document.getElementById('studio-sidebar-right')!;
  const btnToggleLeft = document.getElementById('btn-toggle-left')!;
  const btnToggleRight = document.getElementById('btn-toggle-right')!;
  const sceneSelect = document.getElementById('studio-scene-select') as HTMLSelectElement;

  const hudSceneId = document.getElementById('hud-scene-id')!;
  const hudTime = document.getElementById('hud-time')!;
  const hudFps = document.getElementById('hud-fps')!;
  const player = setupPlayerControls(opts);

  const { loadSceneCode } = setupScenes(selection, projectId);
  let review: ReturnType<typeof mountReview> | undefined;
  const selectScene = (sceneId: string, start?: number) => {
    selection.sceneId = sceneId;
    void loadSceneCode(sceneId);
    if (start !== undefined) seek(start);
  };
  const timelineModel = mountTimelinePanel(selectScene, () => review?.render());
  review = mountReview(opts, timelineModel, selectScene);

  // Sidebar Toggles
  btnToggleLeft.addEventListener('click', () => {
    leftSidebar.classList.toggle('collapsed');
    btnToggleLeft.classList.toggle('active', !leftSidebar.classList.contains('collapsed'));
  });
  btnToggleRight.addEventListener('click', () => {
    rightSidebar.classList.toggle('collapsed');
    btnToggleRight.classList.toggle('active', !rightSidebar.classList.contains('collapsed'));
  });

  // Scene Selection Dropdown
  sceneSelect.addEventListener('change', () => {
    const id = sceneSelect.value;
    const entry = timeline.find((e) => e.id === id);
    if (entry) {
      selection.sceneId = sceneForEntry(id);
      seek(entry.start);
      if (selection.sceneId) loadSceneCode(selection.sceneId);
      hudSceneId.textContent = id;
    }
  });

  // Projects and export
  setupProjectsModal();
  setupExportModal();
  setupAI();


  // Return update loop callback
  return {
    onTick(t: number, fps: number) {
      hudTime.textContent = `${t.toFixed(2)}s`;
      hudFps.textContent = `${fps.toFixed(0)} FPS`;
      player.onTick(t);
      review?.onTick(t);

      const entry = timeline.find((e) => t >= e.start && t < e.end);
      if (entry) {
        hudSceneId.textContent = entry.id;
        sceneSelect.value = entry.id;
      }

    },
  };
}

