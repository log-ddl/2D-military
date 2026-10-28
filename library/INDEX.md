# Thư viện media dùng chung

Bạn bỏ file vào đây; agent chỉ đọc. Dự án dùng bằng đường dẫn tương đối, ví dụ:
- cảnh: `media('images/m109_side.jpg')`
- `audio/sound.json`: `{"t": 3.7, "src": "sfx/cannon_01.wav"}`
- `audio/music.json`: `{"tracks": [{"src": "music/tense_01.mp3", "at": 0, "vol": 0.4, "duck": 0.5}]}`

File cùng đường dẫn trong `projects/<id>/input/` được ưu tiên hơn file ở đây.

| Đường dẫn | Mô tả | Nguồn / license |
|---|---|---|
