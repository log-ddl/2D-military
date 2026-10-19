export interface ProjectMeta {
  schemaVersion: 1;
  id: string;
  name: string;
  duration: number;
  hasAudio: boolean;
  audioFile?: string | null;
  /** Giọng đọc riêng (nếu có). Preview/export ưu tiên file này. */
  voiceFile?: string | null;
  /** Sound effect riêng, dài bằng video; có thể bật/tắt khi xuất. */
  sfxFile?: string | null;
  /** Âm lượng sfx khi trộn (mặc định 0.5). */
  sfxGain?: number;
  audioData?: string;
  lyricsData?: string;
  bpm?: number;
  overlay?: string;
  type?: string;
  createdAt?: string;
}
export interface ProjectEntry {
  id: string;
  scene: string;
  start: number;
  end: number;
  params?: Record<string, unknown>;
  maxSamples?: number;
}
export interface ProjectConfig extends ProjectMeta {
  timeline: ProjectEntry[];
}
