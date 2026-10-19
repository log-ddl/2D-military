// Entry: preview player (default) or export mode (?export=1, driven by scripts/render.ts).
import { Engine, type AdaptiveSampling } from './engine/engine';
import { PW, PH, SCALE } from './engine/gl';
import { makeTimeline } from './runtime/scene-loader';
import { loadProject, getActiveProject, assetUrl } from './runtime/project-loader';
import { setupStudio } from './studio/studio';

const params = new URLSearchParams(location.search);
const EXPORT = params.has('export');
const ONLY = params.get('only'); // comma-separated scene ids to load (faster stills)
const FROM = params.get('t') ? parseFloat(params.get('t')!) : null;

const canvas = document.getElementById('c') as HTMLCanvasElement;
// physical size: 1920x1080 times ?scale= (the page CSS keeps showing it at 1920x1080)
canvas.width = PW;
canvas.height = PH;

const engine = new Engine(canvas, makeTimeline);

declare global {
  interface Window { __pdoom: any }
}

let TIMELINE: typeof engine.timeline = [];

async function boot() {
  const project = await loadProject(params.get('project') || undefined);
  const onlySet = ONLY ? new Set(ONLY.split(',')) : null;
  await engine.init(onlySet ? (e) => onlySet.has(e.id) : undefined, { duration: project.duration, assetBase: `/projects/${project.id}` });
  TIMELINE = engine.timeline;
  if (EXPORT) setupExport();
  else setupPlayer();
}

// ------------------------------------------------------------------ export API
// SharedWorker owning the export's frame socket: a string opens it, a Uint8Array is sent (then returned for reuse),
// null closes it. Posts 'open' | 'error' | the runner's ack count.
const FRAME_SINK = `onconnect = (e) => {
  const port = e.ports[0];
  let ws;
  port.onmessage = ({ data }) => {
    if (typeof data === 'string') {
      ws = new WebSocket(data);
      ws.binaryType = 'arraybuffer';
      ws.onopen = () => port.postMessage('open');
      ws.onerror = () => port.postMessage('error');
      ws.onmessage = (m) => port.postMessage(+m.data || 0);
    } else if (data === null) ws.close();
    else { ws.send(data); port.postMessage(data, [data.buffer]); }
  };
};`;

function setupExport() {
  document.body.classList.add('export');
  const proj = getActiveProject();
  const dur = proj.duration;
  window.__pdoom = {
    engine,
    duration: dur,
    errors: engine.errors,
    /** Output size in px (1920x1080 times scale); stream() sends frames of width*height*4 bytes. */
    scale: SCALE,
    width: PW,
    height: PH,
    timeline: TIMELINE.map(({ id, start, end }) => ({ id, start, end })),
    /** Render a single frame at t (seeks as needed). */
    still(t: number, samples: number | AdaptiveSampling = 1, shutter = 0.5) {
      const used = engine.render(t, 1 / 60, true, samples, shutter);
      if (engine.errors.length) throw new Error(engine.errors.join('\n'));
      return used;
    },
    /** The last rendered frame as a full-resolution (PW x PH) PNG, base64 (for stills at scale > 1). */
    async png() {
      const px = await engine.readPixelsAsync(), row = PW * 4;
      const img = new ImageData(PW, PH);
      for (let y = 0; y < PH; y++) img.data.set(px.subarray((PH - 1 - y) * row, (PH - y) * row), y * row); // bottom-up -> top-down
      const oc = new OffscreenCanvas(PW, PH);
      oc.getContext('2d')!.putImageData(img, 0, 0);
      const b = new Uint8Array(await (await oc.convertToBlob({ type: 'image/png' })).arrayBuffer());
      let s = '';
      for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
      return btoa(s);
    },
    /**
     * Render [from, to) at fps and stream raw RGBA frames (bottom-up) over a WebSocket.
     * The socket lives in a SharedWorker: Playwright detaches from shared workers, so Chrome doesn't also send it a
     * base64 copy of every frame over CDP (that copy cost more than rendering and queued up in RAM when the runner lagged).
     */
    async stream(opts: { from: number; to: number; fps: number; ws: string; samples?: number | AdaptiveSampling; shutter?: number; inflight?: number }) {
      const port = new SharedWorker(URL.createObjectURL(new Blob([FRAME_SINK], { type: 'text/javascript' }))).port;
      const pool: Uint8Array[] = []; // buffers the worker hands back after ws.send() copied them
      let acked = 0;
      await new Promise<void>((res, rej) => {
        port.onmessage = (e) => {
          const d = e.data;
          if (d === 'open') res();
          else if (d === 'error') rej(new Error(`frame socket failed: ${opts.ws}`));
          else if (typeof d === 'number') acked = Math.max(acked, d);
          else pool.push(d);
        };
        port.start();
        port.postMessage(opts.ws);
      });
      const inflight = opts.inflight ?? 4;
      const dt = 1 / opts.fps;
      const n0 = Math.round(opts.from * opts.fps), n1 = Math.round(opts.to * opts.fps);
      const S = opts.samples ?? 1, SH = opts.shutter ?? 0.5;
      if (n0 > 0) engine.render((n0 - 1) * dt, dt, false, typeof S === 'number' ? S : 1, SH);
      const used: Record<number, number> = {};
      for (let n = n0; n < n1; n++) {
        const k = engine.render(n * dt, dt, false, S, SH);
        if (engine.errors.length) throw new Error(engine.errors.join('\n'));
        used[k] = (used[k] ?? 0) + 1;
        const buf = pool.pop() ?? new Uint8Array(PW * PH * 4);
        await engine.readPixelsAsync(buf);
        while (n - n0 - acked >= inflight) await new Promise((r) => setTimeout(r, 2));
        port.postMessage(buf, [buf.buffer]);
        if (n % 30 === 0) await new Promise((r) => setTimeout(r, 0));
      }
      while (acked < n1 - n0) await new Promise((r) => setTimeout(r, 5));
      port.postMessage(null);
      port.close();
      return used;
    },
  };
  window.__pdoom.ready = true;
}

// ------------------------------------------------------------------ preview player
function setupPlayer() {
  const proj = getActiveProject();
  const mainFile = proj.voiceFile || proj.audioFile;
  const hasAudio = proj.hasAudio && !!mainFile;
  const audio = new Audio();
  if (hasAudio) audio.src = assetUrl(mainFile!);
  if (!hasAudio) {
    audio.volume = 0;
  } else {
    audio.preload = 'auto';
  }
  // sfx tách riêng: chạy song song, đồng bộ theo voice, bật/tắt độc lập
  const hasSfx = hasAudio && !!proj.voiceFile && !!proj.sfxFile;
  const sfxAudio = new Audio();
  let sfxOn = true;
  const sfxGain = proj.sfxGain ?? 0.5;
  if (hasSfx) { sfxAudio.src = assetUrl(proj.sfxFile!); sfxAudio.preload = 'auto'; sfxAudio.volume = sfxGain; }
  const syncSfx = () => { if (hasSfx) sfxAudio.currentTime = audio.currentTime; };
  const ui = document.getElementById('ui')!;
  const scrub = document.getElementById('scrub') as HTMLInputElement;
  const info = document.getElementById('info')!;
  const marks = document.getElementById('marks')!;
  const errs = document.getElementById('errs')!;
  const maxDur = proj.duration;
  scrub.max = String(maxDur);
  scrub.step = '0.001';
  if (engine.errors.length) { errs.textContent = engine.errors.join('\n\n'); errs.style.display = 'block'; }

  for (const e of TIMELINE) {
    const m = document.createElement('div');
    m.className = 'mark';
    m.style.left = `${(e.start / maxDur) * 100}%`;
    m.style.width = `${((e.end - e.start) / maxDur) * 100}%`;
    m.title = `${e.id} ${e.start.toFixed(2)}–${e.end.toFixed(2)}`;
    m.textContent = e.id;
    m.onclick = () => seek(e.start);
    marks.appendChild(m);
  }

  let t = FROM ?? 0;
  let playing = false;
  let loop: [number, number] | null = null;
  let lastAudioT = 0, lastPerf = performance.now();
  const seek = (x: number) => {
    t = Math.max(0, Math.min(maxDur - 0.001, x));
    if (hasAudio) { audio.currentTime = t; syncSfx(); }
  };
  seek(t);

  const toggle = () => {
    playing = !playing;
    if (playing && t >= maxDur - 0.1) seek(0); // ended: play again from the start
    lastPerf = performance.now();
    if (playing) {
      if (hasAudio) { audio.currentTime = t; audio.play(); if (hasSfx) { syncSfx(); if (sfxOn) sfxAudio.play(); } }
    } else {
      if (hasAudio) { audio.pause(); if (hasSfx) sfxAudio.pause(); }
    }
  };
  canvas.onclick = toggle;
  scrub.oninput = () => seek(parseFloat(scrub.value));
  window.addEventListener('keydown', (ev) => {
    const target = ev.target as HTMLElement;
    if (target.closest('input, textarea, select, button, [contenteditable]') || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (['ArrowRight', 'ArrowLeft', '.', ','].includes(ev.key)) ev.preventDefault();
    if (ev.key === ' ') { ev.preventDefault(); toggle(); }
    if (ev.key === 'ArrowRight') seek(t + (ev.shiftKey ? 1 : 5));
    if (ev.key === 'ArrowLeft') seek(t - (ev.shiftKey ? 1 : 5));
    if (ev.key === '.') seek(t + 1 / 60);
    if (ev.key === ',') seek(t - 1 / 60);
    if (ev.key === 'l') {
      const e = TIMELINE.find((x) => t >= x.start && t < x.end);
      loop = loop ? null : e ? [e.start, e.end] : null;
    }
    if (ev.key === 'h') ui.classList.toggle('hidden');
    if (ev.key === ']') { const e = TIMELINE.find((x) => x.start > t + 0.01); if (e) seek(e.start); }
    if (ev.key === '[') { const es = TIMELINE.filter((x) => x.start < t - 0.3); const e = es[es.length - 1]; if (e) seek(e.start); }
  });

  let frames = 0, fpsT = performance.now(), fps = 0;
  const studio = setupStudio({
    engine,
    timeline: TIMELINE,
    seek,
    togglePlay: toggle,
    getPlaying: () => playing,
    getCurrentTime: () => t,
    hasAudio,
    getVolume: () => audio.volume,
    setVolume: value => { const v = Math.max(0, Math.min(1, value)); audio.volume = v; if (hasSfx) sfxAudio.volume = v * sfxGain; },
    hasSfx,
    getSfx: () => sfxOn,
    setSfx: on => { sfxOn = on; if (!hasSfx) return; if (!on) sfxAudio.pause(); else if (playing) { syncSfx(); sfxAudio.play(); } },
    getLoop: () => !!loop,
    toggleLoop: () => { const entry = TIMELINE.find(e => t >= e.start && t < e.end); loop = loop ? null : entry ? [entry.start, entry.end] : null; },
  });

  let lastT = NaN, lastRender = 0;
  const tick = () => {
    if (playing) {
      const now = performance.now();
      if (hasAudio) {
        if (audio.currentTime !== lastAudioT) { lastAudioT = audio.currentTime; lastPerf = now; }
        t = lastAudioT + (audio.paused ? 0 : (now - lastPerf) / 1000);
        if (loop && t >= loop[1]) seek(loop[0]);
        if (audio.ended) playing = false;
      } else {
        t += (now - lastPerf) / 1000;
        lastPerf = now;
        if (loop && t >= loop[1]) seek(loop[0]);
        else if (t >= maxDur) {
          seek(0);
          playing = false;
        }
      }
    }
    // paused on the same frame: redraw a few times a second (picks up edits/HMR) instead of every vsync
    const idle = !playing && t === lastT && performance.now() - lastRender < 250;
    if (idle) { requestAnimationFrame(tick); return; }
    lastT = t; lastRender = performance.now();
    engine.render(t, 1 / 60);
    if (engine.errors.length) { errs.textContent = engine.errors.join('\n\n'); errs.style.display = 'block'; }
    scrub.value = String(t);
    frames++;
    const now = performance.now();
    if (now - fpsT > 500) { fps = (frames * 1000) / (now - fpsT); frames = 0; fpsT = now; }
    const e = TIMELINE.find((x) => t >= x.start && t < x.end);
    info.textContent = `${t.toFixed(2)}s / ${maxDur.toFixed(1)}s  [${e?.id ?? '—'}]  ${fps.toFixed(0)}fps${loop ? '  LOOP' : ''}`;
    studio.onTick(t, fps);
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Vite HMR: re-instantiate scenes whose module changed
  if (import.meta.hot) {
    import.meta.hot.on('vite:afterUpdate', (payload: any) => {
      for (const u of payload.updates ?? []) {
        const m = /scenes\/([\w-]+)\.ts/.exec(u.path ?? '');
        if (m && (u.path ?? '').includes(`/projects/${getActiveProject().id}/`)) for (const e of TIMELINE) if ((e as any).scene === m[1] || e.id === m[1]) engine.reload(e.id);
      }
    });
  }
}

boot().catch((e) => {
  console.error(e);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f55;position:fixed;top:0;left:0">${String(e?.stack ?? e)}</pre>`);
  window.__pdoom = { error: String(e?.stack ?? e) };
});
