import { getActiveProject } from '../runtime/project-loader';

interface ProjectSummary { id: string; name: string; timeline: unknown[] }
const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();

export function setupProjectsModal() {
  const button = document.getElementById('btn-projects-modal')!;
  document.getElementById('active-project-name')!.textContent = getActiveProject().name;
  document.body.insertAdjacentHTML('beforeend', `
    <div id="modal-projects" class="studio-modal-backdrop" style="display:none;">
      <div class="studio-modal projects-modal" role="dialog" aria-modal="true" aria-labelledby="projects-title">
        <div class="studio-modal-header"><span id="projects-title" class="studio-modal-title">Quản lý dự án</span><button id="close-projects-modal" class="transport-btn" aria-label="Đóng">✕</button></div>
        <div class="studio-modal-body projects-body">
          <form id="project-search-form" class="project-search-row" role="search">
            <input id="project-search" class="studio-input" placeholder="Tìm dự án theo tên…" aria-label="Tìm dự án" type="search" />
            <button class="studio-btn" type="submit">Tìm kiếm</button>
          </form>
          <div id="project-count" class="input-label" aria-live="polite"></div>
          <div id="projects-list-container"></div>
          <form id="new-project-form" class="new-project-form">
            <label for="new-proj-name" class="input-label">Tạo dự án mới</label>
            <div class="project-create-row"><input id="new-proj-name" class="studio-input" placeholder="Tên dự án mới" aria-label="Tên dự án mới" autocomplete="off" /><button id="btn-create-project" type="submit" class="studio-btn primary">Tạo và mở dự án</button></div>
            <div id="new-proj-status" role="status"></div>
          </form>
        </div>
        <div class="studio-modal-footer"><button id="cancel-projects-modal" class="studio-btn">Đóng</button></div>
      </div>
    </div>`);
  const modal = document.getElementById('modal-projects')!;
  const search = document.getElementById('project-search') as HTMLInputElement;
  const name = document.getElementById('new-proj-name') as HTMLInputElement;
  const create = document.getElementById('btn-create-project') as HTMLButtonElement;
  const list = document.getElementById('projects-list-container')!;
  const status = document.getElementById('new-proj-status')!;
  let projects: ProjectSummary[] = [];
  function render() {
    const query = normalize(search.value.trim());
    const filtered = projects.filter(project => normalize(`${project.name} ${project.id}`).includes(query));
    document.getElementById('project-count')!.textContent = `${filtered.length} / ${projects.length} dự án`;
    list.replaceChildren();
    if (!filtered.length) list.textContent = query ? 'Không tìm thấy dự án phù hợp.' : 'Chưa có dự án.';
    for (const project of filtered) {
      const active = project.id === getActiveProject().id;
      const card = document.createElement('div'); card.className = 'export-card'; card.classList.toggle('project-active', active);
      const info = document.createElement('div'); info.className = 'project-info';
      const title = document.createElement('div'); title.className = 'export-card-title'; title.textContent = project.name;
      const meta = document.createElement('div'); meta.className = 'export-card-meta'; meta.textContent = `${project.timeline.length} cảnh${active ? ' · Đang mở' : ''}`;
      info.append(title, meta); card.append(info);
      const actions = document.createElement('div'); actions.className = 'project-actions';
      if (!active) {
        const open = document.createElement('button'); open.className = 'studio-btn'; open.textContent = 'Mở dự án'; open.dataset.switch = project.id;
        open.onclick = async () => {
          open.disabled = true;
          try {
            const response = await fetch('/api/projects/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: project.id }) });
            const result = await response.json(); if (!response.ok) throw new Error(result.error);
            const target = new URL(location.href); target.searchParams.set('project', project.id); target.searchParams.delete('draft'); location.href = target.href;
          } catch (error) { status.textContent = `Không thể mở: ${error instanceof Error ? error.message : error}`; open.disabled = false; }
        };
        actions.append(open);
      }
      const remove = document.createElement('button'); remove.className = 'studio-btn danger'; remove.textContent = 'Xóa'; remove.dataset.delete = project.id;
      remove.setAttribute('aria-label', `Xóa dự án ${project.name}`);
      remove.onclick = async () => {
        if (!window.confirm(`Xóa dự án “${project.name}” khỏi danh sách? Các file được giữ trong thùng rác dự án để có thể khôi phục.`)) return;
        remove.disabled = true;
        try {
          const response = await fetch('/api/projects/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: project.id }) });
          const result = await response.json(); if (!response.ok) throw new Error(result.error);
          if (active) location.href = `/?project=${encodeURIComponent(result.nextProjectId)}`;
          else { status.textContent = `Đã xóa dự án “${project.name}”.`; await load(); }
        } catch (error) { status.textContent = `Không thể xóa: ${error instanceof Error ? error.message : error}`; remove.disabled = false; }
      };
      actions.append(remove); card.append(actions); list.append(card);
    }
  }
  async function load() {
    list.textContent = 'Đang tải dự án…';
    try {
      const response = await fetch('/api/projects'); const result = await response.json(); if (!response.ok) throw new Error(result.error);
      projects = result.projects; render();
    } catch (error) { list.textContent = `Không thể tải dự án: ${error instanceof Error ? error.message : error}`; }
  }
  const close = () => { modal.style.display = 'none'; button.focus(); };
  button.onclick = () => { modal.style.display = 'flex'; void load(); search.focus(); };
  document.getElementById('close-projects-modal')!.onclick = close;
  document.getElementById('cancel-projects-modal')!.onclick = close;
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') close();
    if (event.key === 'Tab') {
      const elements = [...modal.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled)')];
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
  });
  search.oninput = render;
  document.getElementById('project-search-form')!.onsubmit = event => { event.preventDefault(); render(); };
  document.getElementById('new-project-form')!.onsubmit = async event => {
    event.preventDefault(); if (create.disabled) return;
    if (!name.value.trim()) { status.textContent = 'Vui lòng nhập tên dự án.'; name.focus(); return; }
    create.disabled = true; status.textContent = 'Đang tạo dự án trống…';
    try {
      const response = await fetch('/api/projects/new', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.value.trim() }) });
      const result = await response.json(); if (!response.ok || !result.success) throw new Error(result.error);
      location.href = `/?project=${encodeURIComponent(result.project.id)}`;
    } catch (error) { status.textContent = `Không thể tạo: ${error instanceof Error ? error.message : error}`; create.disabled = false; }
  };
}
