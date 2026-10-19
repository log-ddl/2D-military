import { execFile, spawn } from 'node:child_process';
import { accessSync, constants, statSync as stat0 } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { closeSync, existsSync, mkdirSync, openSync, readdirSync, rmSync, statSync } from 'node:fs';
import { appRoot, projectPath, readProject } from './projects.ts';
import { createJob, finishJob, watchProcess } from './jobs.ts';
import { appendOutro, outroPath } from './outro.ts';
/** Tên tệp do người dùng đặt: giữ chữ (kể cả có dấu), số, khoảng trắng, - _ ; tự thêm .mp4 và tránh ghi đè. */
/** Thư mục xuất do người dùng chọn (đường dẫn tuyệt đối, hỗ trợ ~). Trống = mặc định projects/<id>/out. */
function resolveOutDir(projectId: string, raw: unknown) {
  const text = String(raw ?? '').trim();
  if (!text) return projectPath(projectId, 'out');
  const dir = path.resolve(text.startsWith('~') ? path.join(os.homedir(), text.slice(1)) : text);
  if (!path.isAbsolute(text.startsWith('~') ? dir : text)) throw new Error('Thư mục xuất phải là đường dẫn tuyệt đối (ví dụ /Users/ten/Videos).');
  mkdirSync(dir, { recursive: true });
  if (!stat0(dir).isDirectory()) throw new Error(`Không phải thư mục: ${dir}`);
  try { accessSync(dir, constants.W_OK); } catch { throw new Error(`Không ghi được vào thư mục: ${dir}`); }
  return dir;
}
/** Mở hộp thoại chọn thư mục của hệ điều hành (server chạy trên chính máy người dùng). */
export function pickFolder(): Promise<string | null> {
  const [cmd, args] = process.platform === 'darwin'
    ? ['osascript', ['-e', 'POSIX path of (choose folder with prompt "Chọn thư mục xuất video")']]
    : process.platform === 'win32'
      ? ['powershell', ['-NoProfile', '-Command', 'Add-Type -AssemblyName System.Windows.Forms; $d = New-Object System.Windows.Forms.FolderBrowserDialog; if ($d.ShowDialog() -eq "OK") { $d.SelectedPath }']]
      : ['zenity', ['--file-selection', '--directory', '--title=Chọn thư mục xuất video']];
  return new Promise((resolve, reject) => execFile(cmd, args, (error, stdout) => {
    if (error) return /User canceled|-128/.test(String(error.message)) || (error as any).code === 1 ? resolve(null) : reject(new Error(`Không mở được hộp chọn thư mục (${cmd}). Hãy gõ đường dẫn thủ công.`));
    resolve(stdout.trim().replace(/[\\/]$/, '') || null);
  }));
}
function uniqueName(dir: string, raw: unknown) {
  let base = String(raw ?? '').replace(/\.mp4$/i, '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 80);
  if (!base) base = `render_${Date.now()}`;
  let name = `${base}.mp4`, i = 2;
  while (existsSync(path.join(dir, name))) name = `${base}_${i++}.mp4`;
  return name;
}
export function startRender(projectId: string, data: Record<string, any>, serverUrl: string) {
  const project = readProject(projectId);
  const from = Number(data.from ?? 0), to = Number(data.to ?? project.duration);
  const scale = Number(data.scale ?? 1), fps = Number(data.fps ?? 30), samples = Number(data.samples ?? 1);
  if (![from, to, scale, fps, samples].every(Number.isFinite) || from < 0 || to <= from || to > project.duration || scale <= 0 || scale > 2 || fps < 1 || fps > 60 || samples < 1 || samples > 324) throw new Error('Invalid render settings');
  const outroFile = data.outro ? outroPath(data.outro) : undefined;   // kiểm tra trước khi tạo job
  const exportDir = resolveOutDir(projectId, data.outDir);
  const job = createJob(projectId, 'render');
  job.outName = uniqueName(exportDir, data.name);
  job.outPath = path.join(exportDir, job.outName);
  // có outro: render ra tệp tạm rồi ghép thành outName
  job.renderPath = outroFile ? path.join(exportDir, job.outName.replace(/\.mp4$/i, '') + '.main.tmp.mp4') : job.outPath;
  const outDir = projectPath(projectId, 'out'); mkdirSync(outDir, { recursive: true });
  const log = openSync(projectPath(projectId, `out/${job.id}.log`), 'a');
  const parts = Math.max(1, Math.min(4, Math.round(Number(data.parts ?? 1)) || 1));
  const args = ['scripts/render-parallel.ts', '--project', projectId, '--url', serverUrl, '--from', String(from), '--to', String(to), '--scale', String(scale), '--fps', String(fps), '--samples', String(samples), '--parts', String(parts), '--out', job.renderPath]; 
  if (data.only) args.push('--only', String(data.only));
  args.push('--sfx', data.sfx === false ? 'off' : 'on');
  // low CPU priority (inherited by headless Chrome and ffmpeg) so the desktop stays responsive while exporting
  const child = process.platform === 'win32'
    ? spawn('bun', args, { cwd: appRoot, stdio: ['ignore', log, log] })
    : spawn('nice', ['-n', '10', 'bun', ...args], { cwd: appRoot, stdio: ['ignore', log, log] });
  closeSync(log); watchProcess(job, child);
  child.on('error', error => finishJob(job, error.message));
  child.on('close', async code => {
    if (code !== 0 || !outroFile || job.status === 'cancelled') return finishJob(job, code === 0 ? undefined : `Render failed (${code}). See ${job.id}.log.`);
    const main = job.renderPath!;
    try { await appendOutro(main, outroFile, job.outPath!); finishJob(job); }
    catch (error: any) { finishJob(job, `Ghép outro thất bại: ${String(error?.stderr || error?.message || error).trim().slice(-300)}. Video chính còn ở ${main}.`); return; }
    rmSync(main, { force: true });
  });
  return { success: true, started: true, jobId: job.id, outName: job.outName, outFile: job.outPath };
}
export function listExports(projectId: string) {
  const dir = projectPath(projectId, 'out');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => /\.(mp4|png)$/.test(f) && !/\.part\d+\.mp4$/.test(f) && !/\.tmp\.mp4$/.test(f)).map(name => {
    const stat = statSync(projectPath(projectId, `out/${name}`));
    return { name, url: `/projects/${projectId}/out/${encodeURIComponent(name)}`, sizeMb: (stat.size / 1048576).toFixed(2), createdAt: stat.mtime.toISOString() };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
