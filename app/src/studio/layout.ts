export function mountStudio(timeline: Array<{id: string; start: number}>) {
  // Build UI Container
  const bar = document.createElement('div');
  bar.id = 'studio-bar';
  bar.innerHTML = `
    <div class="studio-logo">
      <span>logdd</span>
      <span class="badge">Không gian làm việc</span>
    </div>
    <div class="studio-nav-group">
      <button id="btn-projects-modal" class="studio-btn cyan" title="Quản lý / Tạo dự án"><span id="active-project-name">Dự án</span> ▾</button>
      <select id="studio-scene-select" class="studio-select" style="width: 170px;">
        ${timeline.map((e) => `<option value="${e.id}">${e.id} (${e.start.toFixed(1)}s)</option>`).join('')}
      </select>
      <button id="btn-toggle-left" class="studio-btn active" title="Ẩn / hiện Timeline">Timeline</button>
      <button id="btn-toggle-right" class="studio-btn active" title="Ẩn / hiện AI và mã nguồn">AI / Mã nguồn</button>
      <button id="btn-export-modal" class="studio-btn primary">Xuất video</button>
    </div>
  `;
  document.body.prepend(bar);

  // Studio Không gian làm việc
  const workspace = document.createElement('div');
  workspace.id = 'studio-workspace';
  workspace.innerHTML = `
    <!-- Project timeline -->
    <div id="studio-sidebar-left">
      <div class="sidebar-tab-header"><strong class="timeline-heading">Timeline</strong></div>
      <div class="sidebar-content" id="sidebar-tab-content">
        <div id="panel-timeline"></div>
      </div>
    </div>

    <!-- Center Viewport -->
    <div id="studio-center">
      <div id="viewport-hud">
        <div class="hud-pill highlight"><span id="hud-scene-id">—</span></div>
        <div class="hud-pill"><span id="hud-res">1920x1080</span></div>
        <div class="hud-pill"><span id="hud-fps">60 FPS</span></div>
        <div class="hud-pill"><span id="hud-time">0.00s</span></div>
      </div>

      <div id="studio-viewport-wrap"></div>

    </div>

    <!-- Right Sidebar: Live Shader & Code Editor -->
    <div id="studio-sidebar-right">
      <div class="code-header">
        <div class="code-tab-title" id="code-file-title">Chọn cảnh của dự án</div>
        <div style="display:flex; gap:6px;">
          <button id="btn-preview-scene" class="studio-btn">Xem thử</button>
          <button id="btn-add-scene" class="studio-btn">Thêm vào Timeline</button>
          <button id="btn-save-code" class="studio-btn cyan">Lưu</button>
        </div>
      </div>
      <textarea id="code-editor" spellcheck="false"></textarea><div id="scene-status" role="status"></div>
    </div>
  `;
  document.body.prepend(workspace);

  // Move existing Canvas wrap into studio center
  const originalWrap = document.getElementById('wrap');
  const viewportWrap = document.getElementById('studio-viewport-wrap');
  if (originalWrap && viewportWrap) {
    viewportWrap.appendChild(originalWrap);
  }

}
