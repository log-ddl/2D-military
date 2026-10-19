import { execFile } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import path from 'node:path';
import { promisify } from 'node:util';
import { repoRoot } from './projects.ts';

const run = promisify(execFile);
/** Thư mục dùng chung cho outro (mọi project đều thấy). Chọn file mới trong hộp xuất thì được lưu vào đây. */
export const outroDir = path.join(repoRoot, 'outros');
const EXT = /\.(mp4|mov|m4v|mkv|webm)$/i;
const MAX_BYTES = 500 * 1024 * 1024;

function cleanName(raw: unknown) {
  const base = path.basename(String(raw ?? '')).replace(/[^\p{L}\p{N} ._-]/gu, '').trim();
  if (!EXT.test(base) || base.startsWith('.')) throw new Error('Outro phải là tệp video (.mp4, .mov, .m4v, .mkv, .webm).');
  return base.slice(-100);
}
export function outroPath(raw: unknown) {
  const file = path.join(outroDir, cleanName(raw));
  if (!existsSync(file)) throw new Error(`Không thấy outro: ${path.basename(file)}`);
  return file;
}
export function listOutros() {
  if (!existsSync(outroDir)) return [];
  return readdirSync(outroDir).filter(f => EXT.test(f) && !f.startsWith('.')).map(name => {
    const st = statSync(path.join(outroDir, name));
    return { name, sizeMb: +(st.size / 1048576).toFixed(1), modifiedAt: st.mtime.toISOString() };
  }).sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
}
/** Nhận tệp video thô từ trình duyệt (POST body), kiểm tra có luồng hình rồi mới đưa vào outros/. */
export async function saveOutro(rawName: unknown, req: IncomingMessage) {
  const name = cleanName(rawName);
  mkdirSync(outroDir, { recursive: true });
  const tmp = path.join(outroDir, `.upload-${Date.now()}-${name}`);
  let bytes = 0;
  try {
    await new Promise<void>((resolve, reject) => {
      const out = createWriteStream(tmp);
      req.on('data', chunk => { bytes += chunk.length; if (bytes > MAX_BYTES) { req.destroy(); out.destroy(); reject(new Error('Outro quá lớn (tối đa 500 MB).')); } });
      req.on('error', reject); out.on('error', reject); out.on('finish', resolve);
      req.pipe(out);
    });
    if (!bytes) throw new Error('Tệp rỗng.');
    const info = await probe(tmp);
    if (!info.v) throw new Error('Tệp không có luồng hình.');
    renameSync(tmp, path.join(outroDir, name));
  } finally { if (existsSync(tmp)) rmSync(tmp); }
  return { name };
}

interface Info { v?: Record<string, any>; a?: Record<string, any> }
async function probe(file: string): Promise<Info> {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_streams', file]);
  const streams: Record<string, any>[] = JSON.parse(stdout).streams ?? [];
  return { v: streams.find(s => s.codec_type === 'video' && s.disposition?.attached_pic !== 1), a: streams.find(s => s.codec_type === 'audio') };
}

/**
 * Ghép outro vào cuối `main`, ghi ra `out`.
 * Cùng thông số (video xuất bằng chính pipeline này) → ghép thẳng bằng stream copy, vài giây, không mất chất lượng.
 * Khác thông số (kích thước, fps, âm thanh...) → mã hoá lại riêng outro cho khớp video chính rồi mới ghép.
 */
export async function appendOutro(main: string, outro: string, out: string) {
  const m = await probe(main), o = await probe(outro);
  if (!m.v || !o.v) throw new Error('Không đọc được luồng hình của video hoặc outro.');
  const key = (i: Info) => [i.v!.codec_name, i.v!.profile, i.v!.level, i.v!.width, i.v!.height, i.v!.r_frame_rate, i.v!.pix_fmt, i.v!.refs, i.v!.has_b_frames,
    i.a ? [i.a.codec_name, i.a.sample_rate, i.a.channels].join('/') : 'noaudio'].join('|');
  let src = outro, fixed: string | undefined;
  if (key(m) !== key(o)) {
    fixed = out + '.outro.tmp.mp4';
    const W = m.v.width, H = m.v.height;
    const args = ['-y', '-loglevel', 'error', '-i', outro];
    const silent = !!m.a && !o.a;
    if (silent) args.push('-f', 'lavfi', '-i', `anullsrc=r=${m.a!.sample_rate}:cl=${m.a!.channels > 1 ? 'stereo' : 'mono'}`);
    args.push('-map', '0:v:0');
    if (m.a) args.push('-map', silent ? '1:a' : '0:a:0');
    args.push('-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease:flags=lanczos:out_color_matrix=bt709,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0xf4f8fb,fps=${m.v.r_frame_rate},setsar=1,setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709`,
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', m.v.pix_fmt ?? 'yuv420p', '-tune', 'grain', '-x264-params', 'aq-mode=3');
    if (m.a) args.push('-c:a', 'aac', '-b:a', '320k', '-ar', String(m.a.sample_rate), '-ac', String(m.a.channels), '-shortest');
    else args.push('-an');
    args.push(fixed);
    await run('ffmpeg', args);
    src = fixed;
  }
  const list = out + '.concat.txt';
  const q = (f: string) => `file '${f.replace(/'/g, "'\\''")}'`;
  writeFileSync(list, [q(main), q(src)].join('\n'));
  try {
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
  } finally {
    rmSync(list, { force: true }); if (fixed) rmSync(fixed, { force: true });
  }
}
