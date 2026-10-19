# 5. Âm thanh: chỉ tiếng bắn và tiếng nổ

Video chỉ có hai track: voice và tiếng bắn, tiếng nổ (`sfx.wav`). Không có nhạc nền.

## Cách làm
1. Tìm trong Shot plan các nhịp có vũ khí bắn hoặc vụ nổ trên hình; lấy thời điểm từ bảng cue (lúc lửa đầu nòng, lúc phóng, lúc nổ).
2. Ghi `data/sound.json`, một cue cho mỗi lần bắn hoặc nổ, không giới hạn số lượng (đoạn đánh nhau thì đủ tiếng cho mọi phát bắn, vụ nổ trên hình):

```json
{
  "sfxGain": 0.65,
  "sfx": [
    { "scene": "sc02", "at": 1.2, "type": "cannon", "power": 0.9 },
    { "t": 14.3, "type": "mg", "dur": 1.0 }
  ]
}
```

- Neo theo `scene` + `at` (giây trong scene) hoặc `t` (giây toàn phim).
- `type`: `cannon`, `mg`, `burst`, `rocket`, `boom`. Tham số tuỳ loại: `power` (0–1), `dur` (mg, rocket), `count`, `rate` (burst, mg), `size` (boom, độ lớn vụ nổ).
3. Chạy `python3 tools/sound.py <id>`; công cụ in danh sách cue, kiểm từng mốc khớp đúng frame bắn.
