#!/usr/bin/env python3
"""Ảnh vệ tinh nền cho cảnh <SatMap>: Sentinel-2 cloudless của EOX (CC BY 4.0), cắt theo kinh-vĩ độ.

    python3 skills/history_military/tools/satmap.py <id> --center 106.52,10.98 --km 60 [--px 3200] [--year 2020] [--note "Củ Chi – Sài Gòn"]
    python3 skills/history_military/tools/satmap.py <id> --bbox 106.2,10.6,106.9,11.3

→ ảnh vào assets/images (mã aNNN) và in sẵn `bbox` + `size` để chép vào <SatMap>. Lấy rộng hơn vùng cần xem ~30% để còn chỗ đẩy máy.
Dòng nguồn bắt buộc của cảnh: "Ảnh vệ tinh: Sentinel-2 cloudless <năm> (EOX, CC BY 4.0)"; vị trí gần đúng thì thêm "· vị trí minh hoạ".
Ảnh là mặt đất NGÀY NAY, không phải thời điểm lịch sử: chỉ dùng để chỉ vị trí, không dùng làm bằng chứng cảnh quan thời đó.

TODO(nâng cấp tải): chưa có lớp sông / đường / ranh giới từ OpenStreetMap (hiện phải tự ghi toạ độ tuyến vào `routes`),
chưa có địa hình (hillshade), chưa ghép nhiều ô cho vùng lớn hơn giới hạn một lần gọi WMS (~4096 px).
"""
import math
import sys

from _hm import ROOT, download, ingest, opt

WMS = 'https://tiles.maps.eox.at/wms'


def main():
    argv = sys.argv[1:]
    if not argv:
        sys.exit(__doc__)
    pid = argv.pop(0)
    px, year, note = opt(argv, '--px', 3200, int), opt(argv, '--year', '2020'), opt(argv, '--note', '')
    bbox, center, km = opt(argv, '--bbox'), opt(argv, '--center'), opt(argv, '--km', 60.0, float)
    if bbox:
        w, s, e, n = (float(x) for x in bbox.split(','))
    elif center:
        lon, lat = (float(x) for x in center.split(','))
        dlat = km / 111.32 / 2 * 9 / 16          # khung 16:9: km là bề ngang
        dlon = km / (111.32 * math.cos(math.radians(lat))) / 2
        w, s, e, n = lon - dlon, lat - dlat, lon + dlon, lat + dlat
    else:
        sys.exit(__doc__)
    mid = math.radians((s + n) / 2)
    width = min(px, 4096)
    height = max(64, min(4096, round(width * (n - s) / ((e - w) * math.cos(mid)))))  # điểm ảnh vuông trên mặt đất
    url = (f'{WMS}?service=WMS&version=1.1.1&request=GetMap&layers=s2cloudless-{year}&styles=&srs=EPSG:4326'
           f'&bbox={w:.5f},{s:.5f},{e:.5f},{n:.5f}&width={width}&height={height}&format=image/jpeg')
    out = download(url, ROOT / 'projects' / pid / 'input' / f'sat_{w:.2f}_{s:.2f}_{e:.2f}_{n:.2f}.jpg'.replace('-', 'm'))
    code = ingest(pid, out, 'image', 'eox', 'https://s2maps.eu', f'Sentinel-2 cloudless {year} (EOX, CC BY 4.0) · bbox {w:.4f},{s:.4f},{e:.4f},{n:.4f} · {note}'.strip(' ·'), 'CC-BY-4.0')
    out.unlink(missing_ok=True)
    print(f"{code}  {width}x{height}")
    print(f"<SatMap src={{asset('{code}')}} bbox={{[{w:.4f}, {s:.4f}, {e:.4f}, {n:.4f}]}} size={{[{width}, {height}]}}\n"
          f"  view={{[{{ center: [{(w + e) / 2:.3f}, {(s + n) / 2:.3f}], scale: 1.3 }}, {{ center: [{(w + e) / 2:.3f}, {(s + n) / 2:.3f}], scale: 1.45 }}]}} />")
    print(f'nguồn: "Ảnh vệ tinh: Sentinel-2 cloudless {year} (EOX, CC BY 4.0)"')


if __name__ == '__main__':
    main()
