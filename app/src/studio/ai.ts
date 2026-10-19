import { getActiveProject } from '../runtime/project-loader';
import './ai.css';

type Session = { projectId: string; provider: string; sessionId?: string; initialized: boolean; status: string; model: string; mode: string; skill: string; instructions: string; updatedAt: string; error?: string; events: Array<{ at: string; kind: string; text: string }> };
const statusLabels: Record<string, string> = { idle: 'Chưa chạy', queued: 'Đang chờ lượt', running: 'Đang chạy', stopping: 'Đang dừng', succeeded: 'Hoàn tất', failed: 'Lỗi / cần xử lý', cancelled: 'Đã dừng', interrupted: 'Gián đoạn' };
const busy = (s?: Session) => !!s && ['queued', 'running', 'stopping'].includes(s.status);
export function setupAI() {
  const projectId = getActiveProject().id;
  const sidebar = document.querySelector<HTMLElement>('#studio-sidebar-right')!;
  const codeElements = [...sidebar.children] as HTMLElement[];
  const tabs = document.createElement('div'); tabs.className = 'ai-tabs';
  const aiTab = document.createElement('button'); aiTab.className = 'studio-btn'; aiTab.textContent = 'AI · CLI';
  const codeTab = document.createElement('button'); codeTab.className = 'studio-btn active'; codeTab.textContent = 'Mã nguồn'; tabs.append(aiTab, codeTab);
  const panel = document.createElement('section'); panel.id = 'ai-panel'; panel.hidden = true;
  panel.innerHTML = `<div class="ai-project"></div><div class="ai-settings">
    <label>CLI<select id="ai-provider" class="studio-select"><option value="claude">Claude Code</option><option value="agy">Antigravity (agy)</option></select></label>
    <label>Model<input id="ai-model" class="studio-input" placeholder="Mặc định của CLI" autocomplete="off"></label>
    <label>Chế độ<select id="ai-mode" class="studio-select"><option value="edit">Cho phép sửa file</option><option value="auto">Tự động xét quyền</option><option value="plan">Chỉ lập kế hoạch</option></select></label>
    <label>Skill<select id="ai-skill" class="studio-select"><option value="">Không chọn skill</option></select></label>
    <details><summary>Dán skill / hướng dẫn bổ sung</summary><textarea id="ai-instructions" placeholder="Dán nội dung SKILL.md hoặc quy tắc muốn CLI làm theo…" maxlength="60000"></textarea></details>
    </div><div id="ai-session-info"></div><div id="ai-log" role="log" aria-live="polite"></div>
    <textarea id="ai-prompt" placeholder="Yêu cầu cho project này…" aria-label="Yêu cầu AI" maxlength="40000"></textarea>
    <div class="ai-actions"><button id="ai-send" class="studio-btn primary">Gửi yêu cầu</button><button id="ai-stop" class="studio-btn" disabled>Dừng</button><button id="ai-notes" class="studio-btn">Lấy ghi chú</button></div>
    <div id="ai-status" role="status"></div>
    <div class="ai-actions"><button id="ai-reset" class="studio-btn">Session mới</button><button id="ai-refresh" class="studio-btn">Tải lại preview</button></div>
    <details open><summary>Các project · tối đa 4 chạy cùng lúc</summary><div id="ai-overview"></div></details>`;
  sidebar.prepend(tabs); sidebar.append(panel);
  panel.querySelector('.ai-project')!.textContent = `Project: ${projectId}`;
  function showAI(on: boolean) { panel.hidden = !on; codeElements.forEach(el => el.hidden = on); aiTab.classList.toggle('active', on); codeTab.classList.toggle('active', !on); }
  aiTab.onclick = () => { showAI(true); void poll(); }; codeTab.onclick = () => showAI(false);
  const provider = panel.querySelector<HTMLSelectElement>('#ai-provider')!;
  const model = panel.querySelector<HTMLInputElement>('#ai-model')!;
  const mode = panel.querySelector<HTMLSelectElement>('#ai-mode')!;
  const skill = panel.querySelector<HTMLSelectElement>('#ai-skill')!;
  const instructions = panel.querySelector<HTMLTextAreaElement>('#ai-instructions')!;
  const prompt = panel.querySelector<HTMLTextAreaElement>('#ai-prompt')!;
  const send = panel.querySelector<HTMLButtonElement>('#ai-send')!;
  const stop = panel.querySelector<HTMLButtonElement>('#ai-stop')!;
  const reset = panel.querySelector<HTMLButtonElement>('#ai-reset')!;
  const log = panel.querySelector<HTMLElement>('#ai-log')!;
  const status = panel.querySelector<HTMLElement>('#ai-status')!;
  const info = panel.querySelector<HTMLElement>('#ai-session-info')!;
  const overview = panel.querySelector<HTMLElement>('#ai-overview')!;
  let session: Session | undefined, requesting = false, hydrated = false, loading = false, lastLog = '';
  const key = `studio-ai-draft:${projectId}`;
  const readDraft = () => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
  const draft = readDraft(); prompt.value = typeof draft.prompt === 'string' ? draft.prompt : '';
  const saveDraft = () => { try { localStorage.setItem(key, JSON.stringify({ prompt: prompt.value, provider: provider.value, model: model.value, mode: mode.value, skill: skill.value, instructions: instructions.value })); } catch { /* server still persists submitted requests */ } };
  [provider, model, mode, skill, instructions, prompt].forEach(el => el.addEventListener('input', saveDraft));
  async function api(route: string, body?: object) {
    const res = await fetch(`/api/ai/${route}${body ? '' : `?projectId=${encodeURIComponent(projectId)}`}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, projectId }) } : undefined);
    const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Không gọi được CLI'); return data;
  }
  function render(s: Session) {
    session = s;
    send.disabled = requesting || busy(s) || !hydrated;
    stop.disabled = requesting || !busy(s) || s.status === 'stopping'; reset.disabled = requesting || busy(s) || !hydrated;
    provider.disabled = requesting || busy(s) || s.initialized;
    [model, mode, skill, instructions].forEach(el => el.disabled = requesting || busy(s));
    info.textContent = `${statusLabels[s.status] || s.status}${s.sessionId ? ` · ${s.provider} · ${s.sessionId.slice(0, 8)}` : ''}`;
    info.title = s.sessionId || '';
    aiTab.textContent = busy(s) ? 'AI · Đang chạy' : 'AI · CLI';
    const signature = JSON.stringify(s.events);
    if (signature !== lastLog) {
      const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60; log.replaceChildren();
      s.events.forEach(event => { const row = document.createElement('div'); row.className = `ai-event ai-${event.kind}`; const label = document.createElement('small'); label.textContent = `${new Date(event.at).toLocaleTimeString()} · ${{ user: 'Bạn', assistant: 'AI', tool: 'Thao tác', info: 'Studio', error: 'Lỗi' }[event.kind] || event.kind}`; const text = document.createElement('div'); text.textContent = event.text; row.append(label, text); log.append(row); });
      if (atBottom) log.scrollTop = log.scrollHeight;
      lastLog = signature;
    }
  }
  async function poll() {
    if (loading) return; loading = true;
    try {
      const data = await api('session');
      if (!hydrated) {
        const s = data.session as Session;
        provider.value = s.initialized ? s.provider : draft.provider || s.provider;
        model.value = draft.model ?? s.model; mode.value = draft.mode || s.mode; skill.value = draft.skill ?? s.skill; instructions.value = draft.instructions ?? s.instructions;
        hydrated = true;
      }
      render(data.session);
      const all = await api('overview'); overview.replaceChildren();
      const active = all.sessions.filter((s: Session) => ['queued', 'running', 'stopping'].includes(s.status) || s.projectId === projectId);
      if (!active.length) overview.textContent = 'Chưa có project đang chạy.';
      active.forEach((s: Session) => { const link = document.createElement('a'); link.href = `/?project=${encodeURIComponent(s.projectId)}&panel=ai`; link.textContent = `${s.projectId} · ${s.provider} · ${statusLabels[s.status] || s.status}`; overview.append(link); });
    } catch (e) { status.textContent = `Mất kết nối Studio: ${e instanceof Error ? e.message : e}`; }
    finally { loading = false; }
  }
  async function action(route: string, body: object) {
    requesting = true; if (session) render(session); status.textContent = 'Đang gửi…';
    try { const result = await api(route, body); render(result.session); status.textContent = ''; return true; }
    catch (e) { status.textContent = e instanceof Error ? e.message : String(e); return false; }
    finally { requesting = false; if (session) render(session); }
  }
  send.onclick = async () => {
    if (!prompt.value.trim()) { status.textContent = 'Nhập yêu cầu trước khi gửi.'; return; }
    const submitted = prompt.value;
    if (await action('start', { prompt: submitted, provider: provider.value, model: model.value, mode: mode.value, skill: skill.value, instructions: instructions.value })) { if (prompt.value === submitted) prompt.value = ''; saveDraft(); void poll(); }
  };
  prompt.onkeydown = e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !send.disabled) { e.preventDefault(); send.click(); } };
  stop.onclick = () => { void action('cancel', {}); };
  reset.onclick = () => { void action('reset', {}); };
  panel.querySelector<HTMLButtonElement>('#ai-refresh')!.onclick = () => location.reload();
  panel.querySelector<HTMLButtonElement>('#ai-notes')!.onclick = async () => {
    try {
      const res = await fetch(`/api/review-notes?projectId=${encodeURIComponent(projectId)}`); const data = await res.json(); if (!res.ok) throw new Error(data.error);
      const notes = data.notes.filter((n: { done: boolean }) => !n.done);
      if (!notes.length) { status.textContent = 'Không có ghi chú chưa xử lý.'; return; }
      const text = notes.map((n: { time: number; text: string }) => { const entry = getActiveProject().timeline.find(e => n.time >= e.start && n.time < e.end); return `- ${n.time.toFixed(2)}s · ${entry?.scene || 'chưa có cảnh'}: ${n.text}`; }).join('\n');
      prompt.value = `${prompt.value ? prompt.value + '\n\n' : ''}Sửa theo các ghi chú sau:\n${text}`; saveDraft(); prompt.focus();
    } catch (e) { status.textContent = String(e); }
  };
  send.disabled = reset.disabled = true;
  void api('providers').then(data => {
    data.providers.forEach((p: { id: string; available: boolean }) => { const option = provider.querySelector<HTMLOptionElement>(`option[value="${p.id}"]`)!; option.disabled = !p.available; if (!p.available) option.textContent += ' · Chưa cài'; });
    data.skills.forEach((s: { id: string; name: string; source: string }) => { const option = document.createElement('option'); option.value = s.id; option.textContent = `${s.name} · ${s.source}`; skill.append(option); });
    return poll();
  }).catch(e => status.textContent = String(e));
  const timer = window.setInterval(() => { if (!document.hidden) void poll(); }, 1800);
  window.addEventListener('pagehide', () => clearInterval(timer), { once: true });
  if (new URLSearchParams(location.search).get('panel') === 'ai') showAI(true);
}
