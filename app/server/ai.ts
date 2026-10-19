import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, accessSync, constants } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { atomicJson, projectDir, repoRoot, validId } from './projects.ts';

type Provider = 'claude' | 'agy';
type Status = 'idle' | 'queued' | 'running' | 'stopping' | 'succeeded' | 'failed' | 'cancelled' | 'interrupted';
type Event = { at: string; kind: 'user' | 'assistant' | 'tool' | 'info' | 'error'; text: string };
export interface AISession {
  projectId: string; provider: Provider; sessionId?: string; initialized: boolean;
  model: string; mode: 'edit' | 'auto' | 'plan'; skill: string; instructions: string;
  status: Status; events: Event[]; updatedAt: string; error?: string; runId?: string;
}
const stateDir = path.join(repoRoot, '.studio/ai');
const sessions = new Map<string, AISession>();
const children = new Map<string, ChildProcess>();
const queue: Array<{ session: AISession; prompt: string }> = [];
const limit = 4;
const now = () => new Date().toISOString();
function persist(s: AISession) { mkdirSync(stateDir, { recursive: true }); atomicJson(path.join(stateDir, `${s.projectId}.json`), s); }
if (existsSync(stateDir)) for (const file of readdirSync(stateDir).filter(f => f.endsWith('.json'))) {
  try { const s = JSON.parse(readFileSync(path.join(stateDir, file), 'utf8')) as AISession;
    validId(s.projectId);
    if (['running', 'queued', 'stopping'].includes(s.status)) { s.status = 'interrupted'; s.error = 'Studio đã khởi động lại. Có thể gửi yêu cầu tiếp để nối lại session.'; persist(s); }
    sessions.set(s.projectId, s);
  } catch { /* Ignore an invalid state file; project files remain untouched. */ }
}
function log(s: AISession, kind: Event['kind'], text: string) {
  if (!text) return; s.events.push({ at: now(), kind, text: text.slice(0, 16000) });
  if (s.events.length > 300) s.events.splice(0, s.events.length - 300);
  s.updatedAt = now(); persist(s);
}
function executable(name: Provider) {
  const folders = [...(process.env.PATH || '').split(path.delimiter), path.join(os.homedir(), '.local/bin'), '/opt/homebrew/bin', '/usr/local/bin'];
  for (const folder of folders) { const file = path.join(folder, name); try { accessSync(file, constants.X_OK); return file; } catch { /* next */ } }
  return null;
}
export function aiProviders() { return (['claude', 'agy'] as const).map(id => ({ id, name: id === 'claude' ? 'Claude Code' : 'Antigravity (agy)', available: !!executable(id) })); }
const skillRoots = [path.join(repoRoot, '.agents/skills'), path.join(os.homedir(), '.agents/skills'), path.join(os.homedir(), '.claude/skills'), path.join(os.homedir(), '.codex/skills')];
export function aiSkills() {
  return skillRoots.flatMap((root, index) => !existsSync(root) ? [] : readdirSync(root, { withFileTypes: true }).filter(d => !d.name.startsWith('.') && existsSync(path.join(root, d.name, 'SKILL.md'))).map(d => ({ id: `${index}:${d.name}`, name: d.name, source: index === 0 ? 'Dự án' : 'Cá nhân', file: path.join(root, d.name, 'SKILL.md') })));
}
export function aiSession(id: string) {
  projectDir(id);
  return sessions.get(id) ?? { projectId: id, provider: 'claude', initialized: false, model: '', mode: 'edit', skill: '', instructions: '', status: 'idle', events: [], updatedAt: now() } satisfies AISession;
}
export function aiOverview() { return [...sessions.values()].filter(s => existsSync(path.join(repoRoot, 'projects', s.projectId, 'project.json'))).map(({ events, instructions, ...s }) => ({ ...s, lastMessage: events.at(-1)?.text.slice(0, 240) || '' })); }
export function aiBusy(id: string) { return ['queued', 'running', 'stopping'].includes(sessions.get(id)?.status || ''); }
export function resetAI(id: string) {
  if (aiBusy(id)) throw new Error('Dừng tác vụ trước khi tạo session mới.');
  const s = sessions.get(id);
  if (s) { const folder = path.join(stateDir, 'history', id); mkdirSync(folder, { recursive: true }); atomicJson(path.join(folder, `${Date.now()}.json`), s); }
  sessions.delete(id);
  const fresh = aiSession(id); sessions.set(id, fresh); persist(fresh); return fresh;
}
export function startAI(id: string, data: Record<string, unknown>) {
  const cwd = projectDir(id);
  if (aiBusy(id)) throw new Error('Project này đang có tác vụ. Có thể chạy một project khác song song.');
  if (typeof data.prompt !== 'string' || !data.prompt.trim() || data.prompt.length > 40000) throw new Error('Nhập yêu cầu (tối đa 40.000 ký tự).');
  if (data.provider !== 'claude' && data.provider !== 'agy') throw new Error('CLI không hợp lệ');
  if (!executable(data.provider)) throw new Error(`Chưa tìm thấy CLI ${data.provider} trên máy.`);
  const model = typeof data.model === 'string' ? data.model.trim() : '';
  if (model.length > 150 || /[\r\n]/.test(model)) throw new Error('Tên model không hợp lệ');
  const mode = data.mode === 'auto' || data.mode === 'plan' ? data.mode : 'edit';
  const skill = typeof data.skill === 'string' ? data.skill : '';
  const chosen = skill ? aiSkills().find(s => s.id === skill) : undefined;
  if (skill && !chosen) throw new Error('Skill không còn tồn tại. Chọn lại skill.');
  const instructions = typeof data.instructions === 'string' ? data.instructions : '';
  if (instructions.length > 60000) throw new Error('Nội dung skill tối đa 60.000 ký tự.');
  const previous = sessions.get(id);
  if (previous?.initialized && previous.provider !== data.provider) throw new Error('Tạo session mới trước khi đổi CLI.');
  const s: AISession = { projectId: id, provider: data.provider, initialized: previous?.initialized ?? false, sessionId: previous?.sessionId, model, mode, skill, instructions, status: 'queued', events: previous?.events || [], updatedAt: now(), runId: randomUUID() };
  sessions.set(id, s);
  log(s, 'user', data.prompt.trim());
  const prompt = `Bạn đang làm việc cho Video Studio. Project: ${id}. Thư mục làm việc: ${cwd}. Repo chứa engine dùng chung: ${repoRoot}.\nChỉ sửa file bên trong project này. Không sửa project khác, engine, cấu hình CLI hay skill dùng chung. Đọc tài nguyên dùng chung khi cần. Không tạo commit, gửi tin nhắn hay xuất bản ra ngoài.\n${chosen ? `Skill được người dùng chọn: ${chosen.file}. Hãy đọc và làm theo SKILL.md đó, giải quyết các tham chiếu tương đối từ thư mục của skill.\n` : ''}${instructions ? `Nội dung skill/hướng dẫn do người dùng nhập:\n${instructions}\n` : ''}\nYêu cầu của người dùng:\n${data.prompt.trim()}`;
  queue.push({ session: s, prompt }); drain(); return s;
}
function signal(child: ChildProcess, name: NodeJS.Signals) { try { if (child.pid) process.kill(-child.pid, name); } catch { try { child.kill(name); } catch { /* exited */ } } }
export function cancelAI(id: string) {
  const s = sessions.get(id); if (!s || !aiBusy(id)) throw new Error('Không có tác vụ đang chạy.');
  const index = queue.findIndex(q => q.session === s); if (index >= 0) queue.splice(index, 1);
  const child = children.get(id);
  s.status = child ? 'stopping' : 'cancelled'; log(s, 'info', child ? 'Đang dừng CLI…' : 'Đã bỏ khỏi hàng đợi.');
  if (child) { signal(child, 'SIGTERM'); const timer = setTimeout(() => { signal(child, 'SIGKILL'); }, 3000); timer.unref(); }
  drain(); return s;
}
let closing = false;
export function stopAIService() { closing = true; for (const [id, child] of children) { const s = sessions.get(id)!; s.status = 'interrupted'; log(s, 'info', 'Studio đóng kết nối; tác vụ đã dừng.'); signal(child, 'SIGTERM'); const timer = setTimeout(() => signal(child, 'SIGKILL'), 3000); timer.unref(); } }
function drain() {
  if (closing) return;
  while (children.size < limit && queue.length) {
    const item = queue.shift()!;
    try { run(item.session, item.prompt); }
    catch (error) { item.session.status = 'failed'; item.session.error = error instanceof Error ? error.message : String(error); log(item.session, 'error', item.session.error); }
  }
}
function run(s: AISession, prompt: string) {
  const binary = executable(s.provider)!;
  const args: string[] = [];
  if (s.provider === 'claude') {
    args.push('-p', '--output-format', 'stream-json', '--verbose', '--permission-mode', s.mode === 'edit' ? 'acceptEdits' : s.mode);
    if (s.initialized && s.sessionId) args.push('--resume', s.sessionId);
    else { s.sessionId = randomUUID(); args.push('--session-id', s.sessionId); }
  } else {
    args.push('--print', prompt, '--output-format', 'stream-json', '--mode', s.mode === 'edit' ? 'accept-edits' : s.mode);
    if (s.initialized && s.sessionId) args.push('--conversation', s.sessionId);
  }
  if (s.model) args.push('--model', s.model);
  s.status = 'running'; log(s, 'info', `Đang chạy ${s.provider} · ${s.initialized ? 'tiếp tục session' : 'session mới'} · ${s.mode}`);
  // No shell interpolation. The selected CLI uses its existing local authentication.
  const child = spawn(binary, args, { cwd: projectDir(s.projectId), detached: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, NO_COLOR: '1' } });
  children.set(s.projectId, child);
  child.stdin.on('error', () => {});
  child.stdin.end(s.provider === 'claude' ? prompt : undefined);
  let pending = '', stderr = '', resultSeen = false, failed = false, lastAssistant = '', lastAgyStep = -1;
  function event(e: any) {
    const sessionId = e.session_id || e.conversation_id || e.result?.conversation_id;
    if (typeof sessionId === 'string' && /^[\w-]{1,150}$/.test(sessionId)) { s.sessionId = sessionId; s.initialized = true; }
    if (e.type === 'assistant') for (const c of e.message?.content || []) {
      if (c.type === 'text' && typeof c.text === 'string') { lastAssistant = c.text; log(s, 'assistant', c.text); }
      if (c.type === 'tool_use') log(s, 'tool', `Công cụ: ${c.name}`);
    }
    if (e.event === 'step_update') {
      const step = e.step_update;
      if (typeof step?.text_delta === 'string' && step.text_delta) {
        if (lastAgyStep !== step.step_index) { lastAssistant = ''; lastAgyStep = step.step_index; }
        lastAssistant += step.text_delta;
        const last = s.events.at(-1);
        if (last?.kind === 'assistant' && lastAssistant !== step.text_delta) { last.text = lastAssistant.slice(-16000); s.updatedAt = now(); persist(s); }
        else if (step.text_delta.trim()) log(s, 'assistant', step.text_delta);
      }
      else if (step?.step_type && step.step_type !== 'user_input') log(s, 'tool', `${step.step_type} · ${step.state || ''}`);
    }
    if (e.type === 'result' || e.event === 'result') {
      resultSeen = true;
      const r = e.event ? e.result : e;
      failed = !!r.is_error || (r.status && r.status !== 'SUCCESS') || (Array.isArray(r.permission_denials) && r.permission_denials.length > 0);
      const output = typeof r.response === 'string' ? r.response : typeof r.result === 'string' ? r.result : '';
      if (output && output.trim() !== lastAssistant.trim()) log(s, 'assistant', output);
      if (failed) s.error = r.permission_denials?.length ? 'CLI từ chối một số quyền thao tác. Xem phản hồi, chỉnh yêu cầu hoặc chế độ rồi gửi tiếp.' : output || String(r.error || r.status || 'CLI báo lỗi');
    }
    if (e.type === 'error' || e.event === 'error') { failed = true; s.error = String(e.message || e.error?.message || e.error || 'CLI báo lỗi'); log(s, 'error', s.error!); }
  }
  child.stdout.setEncoding('utf8'); child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    pending += chunk;
    let end: number;
    while ((end = pending.indexOf('\n')) >= 0) { const line = pending.slice(0, end); pending = pending.slice(end + 1); if (!line.trim()) continue; try { event(JSON.parse(line)); } catch { log(s, 'info', line); } }
    if (pending.length > 2_000_000) { failed = true; s.error = 'Đầu ra CLI vượt giới hạn dòng.'; signal(child, 'SIGTERM'); pending = ''; }
  });
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-12000); });
  child.on('error', error => { failed = true; s.error = error.message; });
  child.on('close', code => {
    if (pending.trim()) try { event(JSON.parse(pending)); } catch { /* non-JSON tail is not a success result */ }
    children.delete(s.projectId);
    if (s.status === 'stopping') s.status = 'cancelled';
    else if (s.status !== 'interrupted') {
      s.status = code === 0 && resultSeen && !failed ? 'succeeded' : 'failed';
      if (s.status === 'failed' && !s.error) s.error = stderr.trim() || `CLI kết thúc (code ${code}) mà chưa có kết quả thành công.`;
    }
    log(s, s.status === 'failed' ? 'error' : 'info', s.error || ({ succeeded: 'Hoàn tất. Tải lại preview để xem thay đổi.', cancelled: 'Đã dừng tác vụ.', interrupted: 'Tác vụ bị gián đoạn.' } as Record<string, string>)[s.status] || s.status);
    drain();
  });
}
