// Kế hoạch ghép âm thanh khi xuất: voice + (tuỳ chọn) sfx tách riêng; fallback audioFile cũ.
// Video luôn là input 0. Trả về { input, map, filter } để chèn vào lệnh ffmpeg.
import { existsSync } from 'node:fs';
import { projectPath } from '../server/projects';
import type { ProjectMeta } from '../src/shared/project-types';

export interface AudioPlan { input: string[]; filter: string[]; map: string[] }

export function audioPlan(project: ProjectMeta, id: string, from: number, to: number, sfx: boolean, gain?: number): AudioPlan | null {
  const seg = ['-ss', String(from), '-t', String(to - from)];
  const abs = (f?: string | null) => (f ? projectPath(id, f) : null);
  const voice = abs(project.voiceFile);
  const sfxF = abs(project.sfxFile);
  if (project.hasAudio && voice && existsSync(voice)) {
    if (sfx && sfxF && existsSync(sfxF)) {
      const g = gain ?? project.sfxGain ?? 0.5;
      return {
        input: [...seg, '-i', voice, ...seg, '-i', sfxF],
        filter: ['-filter_complex', `[1:a]aformat=sample_rates=48000:channel_layouts=stereo[v];[2:a]volume=${g},aformat=sample_rates=48000:channel_layouts=stereo[s];[v][s]amix=inputs=2:duration=first:normalize=0[a]`],
        map: ['-map', '0:v', '-map', '[a]'],
      };
    }
    return { input: [...seg, '-i', voice], filter: [], map: ['-map', '0:v', '-map', '1:a'] };
  }
  const legacy = abs(project.audioFile);
  if (project.hasAudio && legacy && existsSync(legacy)) return { input: [...seg, '-i', legacy], filter: [], map: ['-map', '0:v', '-map', '1:a'] };
  return null;
}
