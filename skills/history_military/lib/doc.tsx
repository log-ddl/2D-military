// Trang tài liệu gốc (ảnh xuất từ PDF bằng tools/pdf.py) như một VẬT CHỨNG: trang giấy nằm trên mặt bàn tối, máy đẩy từ toàn trang
// vào đúng đoạn văn, vệt dạ quang kéo qua đúng câu đang đọc, phần còn lại của trang lùi tối, băng dịch nằm DƯỚI đoạn trích (không đè lên nó).
// Toạ độ dòng (`lines`) do `tools/pdf.py quote` in ra theo pixel của ảnh trang; không ước lượng bằng mắt.
import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { lerp, prog, useT } from '@core/time';
import { drift } from './footage';
import { useShot } from './shot';
import { C, ease, MONO, SANS } from './theme';

export type DocLine = { x0: number; x1: number; y: number; h: number; at?: number };

/**
 * `width` = bề ngang ảnh trang (px). `lines` = các dòng cần tô (px ảnh trang; `at` = mốc lời đọc tới dòng đó, mặc định rải đều sau cú đẩy).
 * `quote` = bản dịch ĐÚNG của chính đoạn được tô (không phải câu khác của kịch bản); `original` = nguyên văn rút gọn.
 * Chữ gốc luôn đọc được: máy tự phóng để đoạn tô chiếm ~1500 px ngang và chữ cao ≥ 30 px. Đoạn tô nên ≤ 4 dòng; shot ≥ 6 s.
 * `push` = số giây đẩy từ toàn trang vào đoạn văn (0 = vào thẳng đoạn văn).
 */
export const DocPage: React.FC<{ src: string; width: number; lines: DocLine[]; quote?: string; original?: string; zoom?: number; push?: number }> = ({
  src, width, lines, quote, original, zoom, push = 1.1,
}) => {
  const t = useT();
  const { from, to } = useShot();
  const x0 = Math.min(...lines.map((l) => l.x0)), x1 = Math.max(...lines.map((l) => l.x1));
  const yTop = lines[0].y - lines[0].h, yBot = lines[lines.length - 1].y + lines[lines.length - 1].h;
  const kTight = zoom ?? Math.max(30 / lines[0].h, Math.min(46 / lines[0].h, 1500 / Math.max(200, x1 - x0)));
  const kWide = Math.min(kTight, (1080 * 0.94) / (width * 1.42));          // toàn trang (khổ ~1:1,42) vừa chiều cao khung
  const pin = push > 0 ? prog(t, from + 0.15, from + 0.15 + push) : 1;
  const d = drift(t, from, to, from + 7, 3);
  const k = lerp(kWide, kTight, pin) * lerp(1, 1.035, d.p);
  const blockH = (yBot - yTop) * kTight;
  const cyTarget = lerp(540, quote ? Math.max(250, 470 - blockH / 2 - 40) : 540, pin);  // có băng dịch: đẩy đoạn văn lên nửa trên
  const cx = lerp(width / 2, (x0 + x1) / 2, pin), cy = lerp((width * 1.42) / 2, (yTop + yBot) / 2, pin);
  const ox = 960 - cx * k + d.x, oy = cyTarget - cy * k + d.y;
  const start = from + 0.15 + push + 0.15;
  const dim = ease(t, start, 0.7) * 0.5;
  const bandTop = Math.min(860, cyTarget + blockH / 2 + 110);
  return (
    <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 45% 40%, #3a2c1f 0%, #1c140d 70%, #0e0a06 100%)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: ox, top: oy, width: width * k, transform: `rotate(${lerp(-1.6, -0.5, pin)}deg)`, transformOrigin: `${cx * k}px ${cy * k}px`,
        backgroundColor: '#efe7cf', boxShadow: '0 30px 90px rgba(0,0,0,0.75), 0 4px 14px rgba(0,0,0,0.5)' }}>
        <Img src={src} style={{ width: '100%', display: 'block', mixBlendMode: 'multiply', filter: 'sepia(0.3) contrast(1.1)' }} />
        {/* vệt dạ quang: trong suốt, mép không đều, hai lượt chồng nhẹ như bút thật */}
        {lines.map((l, i) => { const a = l.at ?? start + 0.2 + (i * 2.2) / Math.max(1, lines.length); const w = ((l.x1 - l.x0) * k + 14) * prog(t, a, a + 0.8); return (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: l.x0 * k - 7, top: (l.y - l.h * 0.82) * k, height: l.h * 1.64 * k, width: w, background: '#ffd62e', mixBlendMode: 'multiply', opacity: 0.72,
              borderRadius: '5px 14px 9px 12px / 9px 6px 12px 7px', transform: `rotate(${i % 2 ? 0.22 : -0.28}deg)` }} />
            <div style={{ position: 'absolute', left: l.x0 * k - 3, top: (l.y - l.h * 0.5) * k, height: l.h * 1.05 * k, width: Math.max(0, w - 10), background: '#ffc400', mixBlendMode: 'multiply', opacity: 0.28, borderRadius: 8 }} />
          </React.Fragment>); })}
        {/* phần trang ngoài đoạn trích lùi tối, mép mờ */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: Math.max(0, (yTop - lines[0].h * 1.2) * k), background: `linear-gradient(180deg, rgba(24,20,14,${dim}) 0%, rgba(24,20,14,${dim}) 82%, rgba(24,20,14,0) 100%)` }} />
        <div style={{ position: 'absolute', left: 0, right: 0, top: (yBot + lines[0].h * 1.2) * k, bottom: 0, background: `linear-gradient(180deg, rgba(24,20,14,0) 0%, rgba(24,20,14,${dim}) 12%, rgba(24,20,14,${dim}) 100%)` }} />
      </div>
      {quote ? (
        <div style={{ position: 'absolute', left: 0, right: 0, top: bandTop, minHeight: 150, padding: '18px 160px', background: 'rgba(14,12,10,0.86)', opacity: ease(t, start + 0.3, 0.5),
          borderTop: `3px solid ${C.red}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontFamily: SANS, fontWeight: 500, fontSize: quote.length > 60 ? 38 : 46, color: C.white, lineHeight: 1.25 }}>{quote}</div>
          {original ? <div style={{ fontFamily: MONO, fontSize: 23, color: 'rgba(243,241,234,0.62)', marginTop: 10 }}>{original}</div> : null}
        </div>) : null}
    </AbsoluteFill>
  );
};
