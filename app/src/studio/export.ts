import { getActiveProject } from '../runtime/project-loader';
// ------------------------------------------------------------------ Export Modal
export function setupExportModal() {
  const project = getActiveProject();
  const projectId = project.id;
  const btn = document.getElementById('btn-export-modal');
  if (!btn) return;

  const modalHtml = `
    <div id="modal-export" class="studio-modal-backdrop" style="display:none;">
      <div class="studio-modal">
        <div class="studio-modal-header">
          <span class="studio-modal-title">Xuất video</span>
          <button id="close-export-modal" class="transport-btn">✕</button>
        </div>
        <div class="studio-modal-body">
          <div class="export-project"><div class="input-label">Dự án đang xuất</div><strong id="export-project-name"></strong><div id="export-project-duration" class="export-card-meta"></div></div>
          <div class="input-label">Tên tệp video</div>
          <input id="export-name" type="text" class="studio-input" placeholder="${project.name}" maxlength="80" />
          <div class="input-label">Khoảng thời gian tùy chỉnh</div>
          <div style="display:flex; gap:10px;">
            <div style="flex:1;">
              <div class="input-label">Từ (giây)</div>
              <input id="export-from" type="number" class="studio-input" value="0" min="0" max="${project.duration}" step="0.1" />
            </div>
            <div style="flex:1;">
              <div class="input-label">Đến (giây)</div>
              <input id="export-to" type="number" class="studio-input" value="${project.duration}" min="0" max="${project.duration}" step="0.1" />
            </div>
          </div>

          <div style="display:flex; gap:10px;">
            <div style="flex:1;">
              <div class="input-label">Độ phân giải</div>
              <select id="export-scale" class="studio-select">
                <option value="1" selected>1080p Full HD (1920x1080)</option>
                <option value="2">4K Ultra HD (3840x2160)</option>
              </select>
            </div>
            <div style="flex:1;">
              <div class="input-label">Tốc độ khung hình</div>
              <select id="export-fps" class="studio-select">
                <option value="30">30 FPS (Tiêu chuẩn)</option>
                <option value="60" selected>60 FPS (Mượt)</option>
                <option value="25">25 FPS (Điện ảnh)</option>
              </select>
            </div>
          </div>

          <div>
            <div class="input-label">Số mẫu làm mượt chuyển động</div>
            <select id="export-samples" class="studio-select">
              <option value="1" selected>1x (Bản nháp nhanh)</option>
              <option value="4">4x (Làm mượt chuyển động)</option>
            </select>
          </div>

          <div>
            <div class="input-label">Nơi lưu video (để trống = thư mục mặc định của dự án)</div>
            <div style="display:flex; gap:8px;">
              <input id="export-dir" type="text" class="studio-input" style="flex:1;" placeholder="projects/${project.id}/out" spellcheck="false" />
              <button id="export-dir-pick" type="button" class="studio-btn">Chọn thư mục…</button>
            </div>
          </div>
          <div>
            <div class="input-label">Ghép outro vào cuối video</div>
            <div style="display:flex; gap:8px;">
              <select id="export-outro" class="studio-select" style="flex:1;"><option value="">Không ghép outro</option></select>
              <button id="export-outro-pick" type="button" class="studio-btn">Chọn file…</button>
              <input id="export-outro-file" type="file" accept="video/*,.mp4,.mov,.m4v,.mkv,.webm" style="display:none;" />
            </div>
          </div>

          ${(project as any).sfxFile ? `<label style="display:flex; gap:8px; align-items:center; font-size:12px;"><input id="export-sfx" type="checkbox" checked /> Kèm hiệu ứng âm thanh (sound effect)</label>` : ''}

          <div id="export-progress" style="display:none; height:10px; border-radius:6px; background:rgba(255,255,255,.12); overflow:hidden;"><div id="export-progress-bar" style="height:100%; width:0%; background:var(--studio-cyan); transition:width .4s;"></div></div>
          <div id="export-log" style="font-size:11px; font-family:var(--studio-font-mono); color:var(--studio-cyan); min-height:18px;"></div>

          <div class="input-label" style="margin-top:8px;">Video đã xuất:</div>
          <div id="project-jobs-list"></div>
          <div id="recent-exports-list" style="display:flex; flex-direction:column; gap:6px; max-height:160px; overflow-y:auto;"></div>
        </div>
        <div class="studio-modal-footer">
          <button id="cancel-export" class="studio-btn">Hủy</button>
          <button id="start-export" class="studio-btn primary">Bắt đầu xuất video</button>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  document.getElementById('export-project-name')!.textContent = project.name;
  document.getElementById('export-project-duration')!.textContent = `Thời lượng: ${project.duration.toFixed(2)} giây`;
  const modal = document.getElementById('modal-export')!;
  const btnClose = document.getElementById('close-export-modal')!;
  const btnCancel = document.getElementById('cancel-export')!;
  const btnStart = document.getElementById('start-export')!;

  const exportFrom = document.getElementById('export-from') as HTMLInputElement;
  const exportTo = document.getElementById('export-to') as HTMLInputElement;
  const exportScale = document.getElementById('export-scale') as HTMLSelectElement;
  const exportFps = document.getElementById('export-fps') as HTMLSelectElement;
  const exportSamples = document.getElementById('export-samples') as HTMLSelectElement;
  const exportLog = document.getElementById('export-log')!;
  const exportName = document.getElementById('export-name') as HTMLInputElement;
  const progress = document.getElementById('export-progress')!;
  const progressBar = document.getElementById('export-progress-bar') as HTMLElement;
  const fmtEta = (s: number) => s >= 3600 ? `${Math.floor(s / 3600)}g ${Math.floor(s % 3600 / 60)}ph` : s >= 60 ? `${Math.floor(s / 60)}ph ${Math.round(s % 60)}s` : `${Math.round(s)}s`;

  const exportDir = document.getElementById('export-dir') as HTMLInputElement;
  exportDir.value = localStorage.getItem('export-dir') || '';
  document.getElementById('export-dir-pick')!.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/pick-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.path) exportDir.value = data.path;
    } catch (e: any) { exportLog.textContent = `Lỗi: ${e.message}`; }
  });
  const outroSelect = document.getElementById('export-outro') as HTMLSelectElement;
  const outroFile = document.getElementById('export-outro-file') as HTMLInputElement;
  async function loadOutros(select?: string) {
    const res = await fetch('/api/outros');
    const { outros } = await res.json();
    const keep = select ?? outroSelect.value;
    outroSelect.replaceChildren(new Option('Không ghép outro', ''), ...outros.map((o: any) => new Option(`${o.name} (${o.sizeMb} MB)`, o.name)));
    outroSelect.value = outros.some((o: any) => o.name === keep) ? keep : '';
  }
  document.getElementById('export-outro-pick')!.addEventListener('click', () => outroFile.click());
  outroFile.addEventListener('change', async () => {
    const file = outroFile.files?.[0]; outroFile.value = '';
    if (!file) return;
    exportLog.textContent = `Đang tải outro ${file.name}…`;
    try {
      const res = await fetch(`/api/outro-upload?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadOutros(data.name);
      exportLog.textContent = `Đã chọn outro: ${data.name}`;
    } catch (e: any) { exportLog.textContent = `Lỗi tải outro: ${e.message}`; }
  });

  btn.addEventListener('click', () => {
    modal.style.display = 'flex';
    loadRecentExports();
    loadOutros();
  });

  const closeModal = () => { modal.style.display = 'none'; };
  btnClose.addEventListener('click', closeModal);
  let jobId: string | null = null;
  btnCancel.addEventListener('click', async () => {
    if (!jobId) { closeModal(); return; }
    const response = await fetch('/api/jobs/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, id: jobId }) });
    const result = await response.json();
    if (!response.ok) exportLog.textContent = result.error;
  });

  btnStart.addEventListener('click', async () => {
    const from = Number(exportFrom.value), to = Number(exportTo.value);
    if (!exportFrom.value || !exportTo.value || !Number.isFinite(from) || !Number.isFinite(to) || from < 0 || to <= from || to > project.duration) {
      exportLog.textContent = `Chọn khoảng thời gian từ 0 đến ${project.duration} giây, kết thúc lớn hơn bắt đầu.`; return;
    }
    localStorage.setItem('export-dir', exportDir.value.trim());
    btnStart.setAttribute('disabled', 'true');
    btnStart.textContent = 'Đang xuất video…';
    exportLog.textContent = 'Đang khởi tạo xuất video…';

    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          from: parseFloat(exportFrom.value),
          to: parseFloat(exportTo.value),
          scale: parseInt(exportScale.value, 10),
          fps: parseInt(exportFps.value, 10),
          samples: parseInt(exportSamples.value, 10),
          name: exportName.value.trim(),
          outro: outroSelect.value || undefined,
          outDir: exportDir.value.trim() || undefined,
          parts: 1,
          sfx: (document.getElementById('export-sfx') as HTMLInputElement | null)?.checked ?? true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        exportLog.textContent = `Đã bắt đầu xuất video. Tệp: ${data.outFile}`;
        jobId = data.jobId;
        btnCancel.textContent = 'Dừng xuất';
        while (jobId) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const response = await fetch(`/api/jobs?projectId=${encodeURIComponent(projectId)}`);
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Không thể đọc trạng thái xuất video');
          if (result.projectId !== projectId) throw new Error('Trạng thái xuất không thuộc dự án đang mở');
          const job = result.jobs.find((job: any) => job.id === jobId && job.projectId === projectId && job.kind === 'render');
          if (!job) throw new Error('Không có trạng thái xuất video');
          if (job.status === 'running') {
            const p = job.progress, pct = p?.pct ?? 0;
            progress.style.display = 'block'; progressBar.style.width = `${pct}%`;
            exportLog.textContent = p ? `Đang xuất ${data.outName}: ${pct.toFixed(1)}%${p.eta != null ? ` — còn khoảng ${fmtEta(p.eta)}` : ''}` : `Đang khởi tạo ${data.outName}…`;
          }
          if (job.status !== 'running') {
            progressBar.style.width = job.status === 'succeeded' ? '100%' : progressBar.style.width;
            exportLog.textContent = job.status === 'succeeded' ? `Đã xuất xong: ${data.outFile}` : job.error || `Render ${job.status}`;
            jobId = null;
            await loadRecentExports();
          }
        }
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      exportLog.textContent = `Lỗi: ${e.message}`;
    } finally {
      jobId = null;
      btnCancel.textContent = 'Đóng';
      btnStart.removeAttribute('disabled');
      btnStart.textContent = 'Bắt đầu xuất video';
    }
  });

  async function loadRecentExports() {
    const list = document.getElementById('recent-exports-list');
    if (!list) return;
    try {
      const res = await fetch(`/api/exports?projectId=${encodeURIComponent(projectId)}`);
      const data = await res.json();
      if (!res.ok || data.projectId !== projectId) throw new Error(data.error || 'Kết quả xuất không thuộc dự án đang mở');
      const jobsResponse = await fetch(`/api/jobs?projectId=${encodeURIComponent(projectId)}`);
      const jobsData = await jobsResponse.json();
      if (!jobsResponse.ok || jobsData.projectId !== projectId) throw new Error(jobsData.error || 'Tiến trình không thuộc dự án đang mở');
      const jobList = document.getElementById('project-jobs-list')!;
      jobList.replaceChildren();
      for (const job of (jobsData.jobs || []).filter((job: any) => job.projectId === projectId && job.kind === 'render').slice(-6).reverse()) {
        const row = document.createElement('div'); row.style.cssText = 'font-size:11px;margin:6px 0';
        const label = document.createElement('span'); label.textContent = `${job.kind}: ${job.status}${job.error ? ` — ${job.error}` : ''} `;
        const log = document.createElement('a'); log.href = `/projects/${projectId}/out/${job.id}.log`; log.textContent = 'Nhật ký'; log.target = '_blank'; row.append(label, log);
        if (job.status === 'running') {
          const stop = document.createElement('button'); stop.className = 'studio-btn'; stop.textContent = 'Dừng';
          stop.onclick = async () => { await fetch('/api/jobs/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, id: job.id }) }); await loadRecentExports(); };
          row.append(stop);
        }
        jobList.append(row);
      }
      const files = (data.exports || []).filter((file: any) => file.url?.startsWith(`/projects/${projectId}/out/`) && /\.mp4$/i.test(file.name));
      if (!files.length) {
        list.innerHTML = `<div style="font-size:10px; color:var(--studio-text-dim);">Chưa có video đã xuất.</div>`;
        return;
      }
      list.innerHTML = files.map((f: any) => `
        <div class="export-card">
          <div>
            <div class="export-card-title">${f.name}</div>
            <div class="export-card-meta">${f.sizeMb} MB • ${new Date(f.createdAt).toLocaleTimeString()}</div>
          </div>
          <a href="${f.url}" target="_blank" class="studio-btn" style="text-decoration:none; font-size:10px;">Xem video ↗</a>
        </div>
      `).join('');
    } catch (e) {
      list.replaceChildren(); document.getElementById('project-jobs-list')!.replaceChildren();
      exportLog.textContent = `Không thể tải kết quả xuất: ${e instanceof Error ? e.message : e}`;
    }
  }
}


