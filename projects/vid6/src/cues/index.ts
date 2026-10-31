// SINH TỰ ĐỘNG từ src/cues/*.ts (core/tools) — không sửa tay; sửa file chương.
import { CUE as cue_C01 } from './C01';
import { CUE as cue_C02 } from './C02';
import { CUE as cue_C03 } from './C03';
import { CUE as cue_C04 } from './C04';

export const CUE = { ...cue_C01, ...cue_C02, ...cue_C03, ...cue_C04 } as const;
