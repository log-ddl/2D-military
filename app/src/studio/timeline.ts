import { getActiveProject } from '../runtime/project-loader';
import type { ProjectEntry } from '../shared/project-types';

export function mountTimelinePanel(select: (sceneId: string, start?: number) => void, changed: () => void = () => {}) {
  const project = getActiveProject();
  const entries: ProjectEntry[] = structuredClone(project.timeline);
  let scenes: Array<{ id: string; title: string }> = [];
  const panel = document.getElementById('panel-timeline')!;
  panel.innerHTML = `<input id="scene-search" class="studio-input" placeholder="Tìm cảnh trong Timeline…" aria-label="Tìm cảnh" />
    <div id="timeline-entries"></div><div id="timeline-unused"></div>
    <button id="save-timeline" class="studio-btn primary" disabled>Lưu Timeline</button><div id="timeline-status" role="status"></div>`;
  const search = panel.querySelector<HTMLInputElement>('#scene-search')!;
  const list = panel.querySelector<HTMLElement>('#timeline-entries')!;
  const unused = panel.querySelector<HTMLElement>('#timeline-unused')!;
  const status = panel.querySelector<HTMLElement>('#timeline-status')!;
  const save = panel.querySelector<HTMLButtonElement>('#save-timeline')!;
  let selected = '';
  const markDirty = () => { save.disabled = false; status.textContent = 'Có thay đổi chưa lưu. Bấm Lưu Timeline để áp dụng vào video.'; changed(); };
  const matches = (text: string) => text.toLocaleLowerCase('vi').includes(search.value.trim().toLocaleLowerCase('vi'));
  function render() {
    list.replaceChildren(); unused.replaceChildren();
    if (!entries.length) list.textContent = 'Timeline trống. Tạo scene trong IDE để bắt đầu.';
    let visible = 0;
    entries.forEach((entry, index) => {
      if (!matches(`${entry.id} ${entry.scene}`)) return;
      visible++;
      const row = document.createElement('div'); row.className = 'timeline-entry'; row.classList.toggle('active', selected === entry.id);
      const label = document.createElement('button'); label.className = 'timeline-scene';
      label.textContent = `${String(index + 1).padStart(2, '0')} · ${entry.id}`; label.title = entry.scene;
      label.onclick = () => { selected = entry.id; select(entry.scene, entry.start); render(); }; row.append(label);
      const inputs = document.createElement('div'); inputs.className = 'timeline-times';
      for (const [key, title] of [['start', 'Bắt đầu'], ['end', 'Kết thúc']] as const) {
        const field = document.createElement('label'); field.textContent = `${title} (s)`;
        const input = document.createElement('input'); input.type = 'number'; input.min = '0'; input.step = '0.01';
        input.className = 'studio-input'; input.value = String(entry[key]); input.setAttribute('aria-label', `${entry.id}: ${title}`);
        input.oninput = () => { entry[key] = input.value === '' ? NaN : Number(input.value); markDirty(); };
        field.append(input); inputs.append(field);
      }
      const remove = document.createElement('button'); remove.className = 'studio-btn'; remove.textContent = 'Gỡ'; remove.title = 'Gỡ khỏi Timeline, giữ file scene';
      remove.onclick = () => { entries.splice(index, 1); markDirty(); render(); };
      inputs.append(remove); row.append(inputs); list.append(row);
    });
    const available = scenes.filter(scene => !entries.some(entry => entry.scene === scene.id) && matches(`${scene.id} ${scene.title}`));
    if (available.length) {
      const heading = document.createElement('div'); heading.className = 'input-label'; heading.textContent = 'Chưa có trong Timeline'; unused.append(heading);
      for (const scene of available) {
        const row = document.createElement('div'); row.className = 'timeline-available';
        const label = document.createElement('button'); label.className = 'timeline-scene'; label.textContent = scene.id; label.onclick = () => select(scene.id);
        const add = document.createElement('button'); add.className = 'studio-btn'; add.textContent = 'Thêm'; add.setAttribute('aria-label', `Thêm ${scene.id}`);
        add.onclick = () => {
          const start = Math.max(0, ...entries.map(entry => entry.end).filter(Number.isFinite));
          let id = scene.id; let suffix = 2;
          while (entries.some(entry => entry.id === id)) id = `${scene.id}_${suffix++}`;
          entries.push({ id, scene: scene.id, start, end: start + 5 }); markDirty(); render();
        };
        row.append(label, add); unused.append(row);
      }
    }
    if (search.value && !visible && !available.length) list.textContent = 'Không tìm thấy cảnh phù hợp.';
  }
  search.oninput = render;
  save.onclick = async () => {
    if (entries.some(entry => !Number.isFinite(entry.start) || !Number.isFinite(entry.end) || entry.start < 0 || entry.end <= entry.start)) {
      status.textContent = 'Mốc thời gian không hợp lệ: kết thúc phải lớn hơn bắt đầu, bắt đầu từ 0 trở lên.'; return;
    }
    save.disabled = true;
    try {
      const response = await fetch('/api/timeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id, timeline: entries }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      const url = new URL(location.href); url.searchParams.delete('draft'); save.disabled = true; location.href = url.href;
    } catch (error) { status.textContent = `Không thể lưu: ${error instanceof Error ? error.message : error}`; save.disabled = false; }
  };
  window.addEventListener('beforeunload', event => { if (!save.disabled) { event.preventDefault(); event.returnValue = ''; } });
  render();
  void fetch(`/api/scenes?projectId=${encodeURIComponent(project.id)}`).then(async response => {
    const result = await response.json(); if (!response.ok) throw new Error(result.error);
    scenes = result.scenes || []; render();
  }).catch(() => { status.textContent = 'Không thể tải các scene chưa có trong Timeline.'; });
  return { entries, refresh() { markDirty(); render(); } };
}
