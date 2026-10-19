import { assetUrl, getActiveProject } from '../runtime/project-loader';
import type { StudioOptions } from './studio';
import type { ProjectEntry } from '../shared/project-types';
import './review.css';

type Segment = { start: number; end: number; text: string };
type Note = { id: string; time: number; text: string; done: boolean };
const stamp = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;
const button = (text: string, action: () => void) => { const b = document.createElement('button'); b.className = 'studio-btn'; b.textContent = text; b.onclick = action; return b; };

export function mountReview(opts: StudioOptions, model: { entries: ProjectEntry[]; refresh: () => void }, select: (scene: string, time: number) => void) {
  const project = getActiveProject();
  const duration = project.duration;
  const dock = document.createElement('section'); dock.id = 'review-dock';
  dock.innerHTML = `<div class="review-toolbar"><strong>Timeline · Voice</strong><label>Thu phóng <input id="review-zoom" type="range" min="1" max="12" step="0.5" value="1"></label><span id="wave-status" role="status"></span><span class="review-hint">Kéo hai mép cảnh để chỉnh · Bấm thước để tua</span></div><div id="review-scroll"><div id="review-tracks"><div id="review-ruler"></div><div id="review-clips"></div><canvas id="review-wave" height="48"></canvas><div id="review-playhead"></div></div></div>`;
  document.body.append(dock);
  const scroll = dock.querySelector<HTMLElement>('#review-scroll')!;
  const tracks = dock.querySelector<HTMLElement>('#review-tracks')!;
  const clips = dock.querySelector<HTMLElement>('#review-clips')!;
  const ruler = dock.querySelector<HTMLElement>('#review-ruler')!;
  const wave = dock.querySelector<HTMLCanvasElement>('#review-wave')!;
  const playhead = dock.querySelector<HTMLElement>('#review-playhead')!;
  const waveStatus = dock.querySelector<HTMLElement>('#wave-status')!;
  const zoom = dock.querySelector<HTMLInputElement>('#review-zoom')!;
  let peaks: number[] = [], audioDuration = duration;
  let dragging = false;
  const timeAt = (x: number) => Math.max(0, Math.min(duration, (x - tracks.getBoundingClientRect().left) / tracks.clientWidth * duration));
  for (const el of [ruler, wave]) el.addEventListener('pointerdown', e => opts.seek(timeAt(e.clientX)));
  function drawWave() {
    // Limit canvas allocation for long, zoomed timelines; CSS scales the peak envelope.
    wave.width = Math.min(12000, Math.max(1, tracks.clientWidth));
    const ctx = wave.getContext('2d')!; ctx.clearRect(0, 0, wave.width, 48); ctx.fillStyle = '#6299ba';
    peaks.forEach((p, i) => { const x = i / peaks.length * audioDuration / duration * wave.width; const h = Math.max(1, p * 42); ctx.fillRect(x, (48 - h) / 2, Math.max(1, audioDuration / duration * wave.width / peaks.length), h); });
  }
  function render() {
    if (dragging) return;
    tracks.style.width = `${Math.max(1, scroll.clientWidth) * Number(zoom.value)}px`;
    ruler.replaceChildren(); clips.replaceChildren();
    const step = Math.max(1, Math.ceil(duration / (tracks.clientWidth / 90)));
    for (let t = 0; t < duration; t += step) { const tick = document.createElement('span'); tick.style.left = `${t / duration * 100}%`; tick.textContent = stamp(t); ruler.append(tick); }
    model.entries.forEach((entry, index) => {
      const clip = document.createElement('div'); clip.className = 'review-clip'; clip.dataset.entry = entry.id;
      const position = () => { clip.style.left = `${entry.start / duration * 100}%`; clip.style.width = `${(entry.end - entry.start) / duration * 100}%`; clip.title = `${entry.id} · ${stamp(entry.start)}–${stamp(entry.end)}`; };
      position(); clip.style.setProperty('--clip-color', ['#dbeafe', '#d1fae5', '#ede9fe'][index % 3]!);
      const label = button(entry.id, () => select(entry.scene, entry.start)); label.className = 'review-clip-label'; clip.append(label);
      for (const edge of ['start', 'end'] as const) {
        const handle = document.createElement('button'); handle.className = `review-handle ${edge}`; handle.setAttribute('aria-label', `${entry.id}: kéo ${edge === 'start' ? 'đầu' : 'cuối'} cảnh`);
        const apply = (value: number) => { entry[edge] = Math.round(Math.max(edge === 'start' ? 0 : entry.start + 0.05, Math.min(edge === 'start' ? entry.end - 0.05 : duration, value)) * 100) / 100; position(); };
        handle.onkeydown = e => { if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return; e.preventDefault(); apply(entry[edge] + (e.key === 'ArrowLeft' ? -0.1 : 0.1)); model.refresh(); };
        handle.onpointerdown = e => {
          e.preventDefault(); dragging = true; handle.setPointerCapture(e.pointerId);
          const old = entry[edge]; const initial = e.clientX;
          handle.onpointermove = move => {
            let value = old + (move.clientX - initial) / tracks.clientWidth * duration;
            const threshold = 8 / tracks.clientWidth * duration;
            const candidates = [0, duration, ...model.entries.filter(other => other !== entry).flatMap(other => [other.start, other.end])];
            const nearest = candidates.reduce((best, p) => Math.abs(p - value) < Math.abs(best - value) ? p : best, Infinity);
            if (Math.abs(nearest - value) < threshold) value = nearest;
            apply(value);
          };
          const finish = (cancelled: boolean) => { if (!dragging) return; if (cancelled) entry[edge] = old; dragging = false; handle.onpointermove = null; model.refresh(); render(); };
          handle.onpointerup = () => finish(false); handle.onpointercancel = () => finish(true);
        };
        clip.append(handle);
      }
      clips.append(clip);
    });
    drawWave(); renderTranscript();
  }
  zoom.oninput = render;
  new ResizeObserver(render).observe(scroll);

  const left = document.querySelector<HTMLElement>('#sidebar-tab-content')!;
  const tabs = document.createElement('div'); tabs.className = 'review-tabs';
  const transcript = document.createElement('div'); transcript.id = 'review-transcript'; transcript.hidden = true;
  const notesPanel = document.createElement('div'); notesPanel.id = 'review-notes'; notesPanel.hidden = true;
  const panels = [document.querySelector<HTMLElement>('#panel-timeline')!, transcript, notesPanel];
  ['Cảnh', 'Lời đọc', 'Ghi chú'].forEach((name, i) => {
    const tab = button(name, () => { panels.forEach((p, n) => p.hidden = n !== i); Array.from(tabs.children).forEach((b, n) => b.classList.toggle('active', n === i)); });
    tab.classList.toggle('active', i === 0); tabs.append(tab);
  });
  left.prepend(tabs); left.append(transcript, notesPanel);
  let segments: Segment[] = [], transcriptRows: HTMLElement[] = [];
  function renderTranscript() {
    transcript.replaceChildren(); transcriptRows = [];
    if (!segments.length) { transcript.textContent = 'Chưa có lời đọc. Chạy tools/asr.py cho dự án để tạo data/transcript.json.'; return; }
    segments.forEach(s => {
      const matches = model.entries.filter(e => e.start < s.end && e.end > s.start);
      let covered = s.start;
      for (const e of [...matches].sort((a, b) => a.start - b.start)) { if (e.start > covered + 0.02) break; covered = Math.max(covered, e.end); }
      const row = button(`${stamp(s.start)} · ${matches.map(e => e.id).join(', ') || 'Chưa có cảnh'}${covered < s.end - 0.02 ? ' · Thiếu hình' : ''}\n${s.text}`, () => { const entry = matches[0]; if (entry) select(entry.scene, s.start); else opts.seek(s.start); });
      row.className = 'transcript-row'; row.classList.toggle('uncovered', covered < s.end - 0.02); transcript.append(row); transcriptRows.push(row);
    });
  }
  void fetch(assetUrl('data/transcript.json')).then(async res => {
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return;
    const data = await res.json(); segments = (Array.isArray(data.segments) ? data.segments : []).filter((s: Segment) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start && typeof s.text === 'string'); renderTranscript();
  }).catch(() => { transcript.textContent = 'Không tải được lời đọc. Tải lại trang để thử lại.'; });

  const noteInput = document.createElement('textarea'); noteInput.placeholder = 'Ví dụ: phóng to xe tăng, mũi tên xuất hiện sớm…'; noteInput.setAttribute('aria-label', 'Nội dung ghi chú');
  const noteStatus = document.createElement('div'); noteStatus.setAttribute('role', 'status');
  const noteList = document.createElement('div');
  let notes: Note[] = [], busy = true;
  const endpoint = `/api/review-notes?projectId=${encodeURIComponent(project.id)}`;
  async function persist(next: Note[]) {
    if (busy) return;
    busy = true; renderNotes(); noteStatus.textContent = 'Đang lưu…';
    try {
      const res = await fetch('/api/review-notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ projectId: project.id, notes: next }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error); notes = data.notes; noteStatus.textContent = 'Đã lưu vào project.'; return true;
    } catch (error) { noteStatus.textContent = `Không lưu được: ${error instanceof Error ? error.message : error}`; return false; }
    finally { busy = false; renderNotes(); }
  }
  const add = button('Ghi chú tại thời điểm hiện tại', () => {
    const text = noteInput.value.trim(); if (!text || busy) return;
    const time = opts.getCurrentTime();
    void persist([...notes, { id: crypto.randomUUID(), time, text, done: false }]).then(ok => { if (ok && noteInput.value.trim() === text) noteInput.value = ''; });
  });
  const copy = button('Sao chép yêu cầu sửa cho AI', () => {
    const text = notes.filter(n => !n.done).sort((a, b) => a.time - b.time).map(n => {
      const entry = model.entries.find(e => n.time >= e.start && n.time < e.end);
      return `- [${stamp(n.time)}] ${entry ? `scenes/${entry.scene}.ts` : 'Chưa có cảnh'}: ${n.text}`;
    }).join('\n');
    if (!text) { noteStatus.textContent = 'Không có ghi chú chưa xử lý.'; return; }
    void navigator.clipboard.writeText(`Sửa project ${project.id} theo các ghi chú sau:\n${text}`).then(() => noteStatus.textContent = 'Đã sao chép yêu cầu sửa.', () => noteStatus.textContent = 'Không truy cập được clipboard. Ghi chú nằm trong data/review-notes.json.');
  });
  notesPanel.append(noteInput, add, copy, noteStatus, noteList);
  function renderNotes() {
    add.disabled = busy; copy.disabled = busy; noteList.replaceChildren();
    if (!notes.length) noteList.textContent = 'Chưa có ghi chú.';
    [...notes].sort((a, b) => a.time - b.time).forEach(n => {
      const row = document.createElement('div'); row.className = 'review-note'; row.classList.toggle('done', n.done);
      const jump = button(`${stamp(n.time)} · ${model.entries.find(e => n.time >= e.start && n.time < e.end)?.id || 'Chưa có cảnh'}`, () => opts.seek(n.time));
      const text = document.createElement('p'); text.textContent = n.text;
      const toggle = button(n.done ? 'Mở lại' : 'Đã xử lý', () => { void persist(notes.map(v => v.id === n.id ? { ...v, done: !v.done } : v)); });
      const remove = button('Xoá', () => { void persist(notes.filter(v => v.id !== n.id)); });
      toggle.disabled = remove.disabled = busy; row.append(jump, text, toggle, remove); noteList.append(row);
    });
  }
  renderNotes();
  void fetch(endpoint).then(async res => { const data = await res.json(); if (!res.ok) throw new Error(data.error); notes = data.notes; busy = false; renderNotes(); }).catch(() => { noteStatus.textContent = 'Không tải được ghi chú. Tải lại trang trước khi thêm ghi chú.'; });
  const audio = project.voiceFile || project.audioFile;
  if (audio && project.hasAudio) {
    waveStatus.textContent = 'Đang đọc waveform…';
    void (async () => {
      let context: AudioContext | undefined;
      try {
        const res = await fetch(assetUrl(audio)); if (!res.ok) throw new Error('audio');
        context = new AudioContext(); const buffer = await context.decodeAudioData(await res.arrayBuffer()); audioDuration = buffer.duration;
        const samples = buffer.getChannelData(0), count = Math.min(12000, samples.length), stride = Math.ceil(samples.length / count);
        peaks = Array.from({ length: count }, (_, i) => { let peak = 0; for (let j = i * stride; j < Math.min(samples.length, (i + 1) * stride); j++) peak = Math.max(peak, Math.abs(samples[j]!)); return peak; });
        waveStatus.textContent = 'Voice'; drawWave();
      } catch { waveStatus.textContent = 'Không tải được waveform'; }
      finally { await context?.close(); }
    })();
  } else waveStatus.textContent = 'Dự án chưa có voice';
  render();
  return {
    render,
    onTick(time: number) {
      playhead.style.left = `${Math.max(0, Math.min(100, time / duration * 100))}%`;
      const index = segments.findIndex(s => time >= s.start && time < s.end);
      transcriptRows.forEach((r, i) => r.classList.toggle('active', i === index));
      clips.querySelectorAll<HTMLElement>('.review-clip').forEach((c, i) => { const e = model.entries[i]; c.classList.toggle('active', !!e && time >= e.start && time < e.end); });
    },
  };
}
