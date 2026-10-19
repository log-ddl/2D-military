export function setupScenes(selection: { sceneId: string }, projectId: string) {
  const sceneFile = (id: string) => `projects/${projectId}/scenes/${id}.ts`;
  const codeEditor = document.getElementById('code-editor') as HTMLTextAreaElement;
  const codeFileTitle = document.getElementById('code-file-title')!;
  const btnSaveCode = document.getElementById('btn-save-code')!;
  const versions = document.createElement('select'); versions.className = 'studio-select'; versions.title = 'Phiên bản cảnh trước đây';
  const restore = document.createElement('button'); restore.className = 'studio-btn'; restore.textContent = 'Khôi phục';
  document.querySelector('.code-header')!.append(versions, restore);
  async function loadVersions() {
    versions.replaceChildren();
    if (!selection.sceneId) return;
    const response = await fetch(`/api/scene-versions?projectId=${encodeURIComponent(projectId)}&id=${encodeURIComponent(selection.sceneId)}`);
    const result = await response.json();
    for (const version of result.versions || []) {
      const option = document.createElement('option'); option.value = version; option.textContent = new Date(Number(version.slice(0, -3))).toLocaleString(); versions.append(option);
    }
    restore.toggleAttribute('disabled', !versions.options.length);
  }
  restore.addEventListener('click', async () => {
    if (!versions.value) return;
    const response = await fetch('/api/restore-scene', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, id: selection.sceneId, version: versions.value }) });
    const result = await response.json();
    if (!response.ok) { sceneStatus.textContent = result.error; return; }
    codeEditor.value = result.code; await loadVersions();
  });
  const sceneStatus = document.getElementById('scene-status')!;

  // Load Scene Code
  async function loadSceneCode(id: string) {
    codeFileTitle.textContent = sceneFile(id);
    try {
      const res = await fetch(`/api/scene-code?projectId=${encodeURIComponent(projectId)}&id=${encodeURIComponent(id)}`);
      if (res.ok) {
        codeEditor.value = await res.text();
        await loadVersions();
      } else {
        codeEditor.value = `// Không tìm thấy tệp cảnh ${id}`;
      }
    } catch {
      codeEditor.value = `// Không thể tải cảnh: ${id}`;
    }
  }

  document.getElementById('btn-preview-scene')?.addEventListener('click', () => {
    if (selection.sceneId) window.open(`/?project=${encodeURIComponent(projectId)}&draft=${encodeURIComponent(selection.sceneId)}`, '_blank');
  });
  document.getElementById('btn-add-scene')?.addEventListener('click', async () => {
    if (!selection.sceneId) return;
    const res = await fetch('/api/save-scene', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId, id: selection.sceneId, code: codeEditor.value, addToTimeline: true, duration: 5 }) });
    const result = await res.json();
    if (!res.ok) { sceneStatus.textContent = result.error; return; }
    location.reload();
  });

  // Save Code (POST /api/save-scene)
  btnSaveCode.addEventListener('click', async () => {
    btnSaveCode.textContent = 'Đang lưu…';
    try {
      const res = await fetch('/api/save-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          id: selection.sceneId,
          code: codeEditor.value,
        }),
      });
      const json = await res.json();
      if (json.success) {
        btnSaveCode.textContent = 'Đã lưu ✓';
        await loadVersions();
        setTimeout(() => { btnSaveCode.textContent = 'Lưu'; }, 1800);
      } else {
        throw new Error(json.error);
      }
    } catch (err: any) {
      alert(`Không thể lưu: ${err.message}`);
      btnSaveCode.textContent = 'Lưu';
    }
  });

  if (selection.sceneId) void loadSceneCode(selection.sceneId);
  return { loadSceneCode };
}
