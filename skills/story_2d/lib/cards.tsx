// Các thành phần chữ & tài liệu hoạt hình của skill story_2d — chỉ mang ra dùng ĐÚNG LÚC THẬT SỰ CẦN THIẾT:
// - StoryText: thẻ chữ SVG chuẩn viền mực (thay thế hoàn toàn `<text>` thô).
// - BlackPunchCard: thẻ nhấn nền đen `#000000` (chỉ đặt ở câu chốt/twist thật đắt hoặc ngắt chương, không ép theo đồng hồ).
// - HudPill: định danh nhân vật / địa điểm (tối đa 1 lần đầu tiên khi thực sự cần giới thiệu tên riêng).
// - RollingNumber: con số nhảy cuộn động (khi kịch bản nhấn mạnh số liệu biến đổi).
// - RelationLink: đường nối quan hệ + dấu gạch chéo phủ định.
// - SpeechBubble: bóng thoại ngắn cho diễn xuất phụ không lời (không nhại lại câu đã nói trong voice).
// - InWorldDoc: tài liệu / báo chí / bài đăng / bảng trắng vẽ hoạt hình khi câu chuyện xoay quanh văn bản đó.
import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { lerp, prog, useSpring } from '@core/time';
import { BRUSH_FONT, MONO_FONT, S, STROKE } from './theme';
import type { Pt } from './stage';

export type TimedWord = {
  w: string;
  /** Giây từ này bắt đầu đọc (lấy từ transcript.json / voice_map.md). */
  at: number;
  color?: string;
};

/**
 * Thẻ nhấn nền đen `#000000` (`BlackPunchCard`) — chỉ dùng khi kịch bản thực sự có câu chốt đắt giá hoặc ngắt chương:
 * - Chế độ 1 (`words`): hiện từng từ khớp chính xác mốc giây giọng đọc.
 * - Chế độ 2 (`title`): thẻ chia chương trong khoảng nghỉ không lời.
 */
export const BlackPunchCard: React.FC<{
  t: number;
  from: number;
  until: number;
  words?: TimedWord[];
  title?: string;
  kicker?: string;
  fontSize?: number;
  maxWidth?: number;
}> = ({ t, from, until, words, title, kicker, fontSize = 54, maxWidth = 1360 }) => {
  if (t < from || t >= until) return null;

  const enter = prog(t, from, from + 0.22);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: S.black,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '0 140px',
      }}
    >
      {kicker && (
        <div
          style={{
            fontFamily: MONO_FONT,
            fontSize: 22,
            letterSpacing: 5,
            textTransform: 'uppercase',
            color: '#94A3B8',
            marginBottom: 18,
            opacity: enter,
          }}
        >
          {kicker}
        </div>
      )}

      {words && words.length > 0 ? (
        <div
          style={{
            maxWidth,
            textAlign: 'center',
            fontFamily: BRUSH_FONT,
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize,
            lineHeight: 1.38,
            color: S.white,
          }}
        >
          {words.map((item, idx) => {
            const shown = t >= item.at - 0.03;
            if (!shown) return null;
            return (
              <span key={idx} style={{ color: item.color ?? S.white }}>
                {idx > 0 ? ' ' : ''}
                {item.w}
              </span>
            );
          })}
        </div>
      ) : (
        <div
          style={{
            maxWidth,
            textAlign: 'center',
            fontFamily: BRUSH_FONT,
            fontStyle: 'italic',
            fontWeight: 700,
            fontSize: fontSize + 6,
            color: S.white,
            opacity: enter,
            transform: `scale(${lerp(0.95, 1, enter).toFixed(3)})`,
          }}
        >
          {title}
        </div>
      )}
    </AbsoluteFill>
  );
};

/**
 * Thẻ HUD định danh tên nhân vật / chức vụ / địa điểm góc màn hình.
 * Chỉ bật đúng 1 lần đầu tiên khi thực thể thực sự cần giới thiệu tên riêng.
 */
export const HudPill: React.FC<{
  t: number;
  from: number;
  until?: number;
  text: string;
  sub?: string;
  x?: number;
  y?: number;
  accent?: string;
  align?: 'left' | 'right';
}> = ({ t, from, until, text, sub, x = 84, y = 880, accent = S.sky, align = 'left' }) => {
  if (t < from || (until !== undefined && t >= until)) return null;
  const p = prog(t, from, from + 0.25);
  const typeP = prog(t, from + 0.05, from + 0.48, (v) => v);
  const chars = Math.max(1, Math.round(text.length * typeP));
  const subChars = sub ? Math.round(sub.length * prog(t, from + 0.28, from + 0.65, (v) => v)) : 0;
  const fadeOut = until !== undefined ? 1 - prog(t, until - 0.2, until) : 1;

  return (
    <div
      style={{
        position: 'absolute',
        left: align === 'left' ? x : undefined,
        right: align === 'right' ? 1920 - x : undefined,
        top: y,
        background: S.hudBg,
        borderLeft: align === 'left' ? `7px solid ${accent}` : undefined,
        borderRight: align === 'right' ? `7px solid ${accent}` : undefined,
        borderRadius: 8,
        padding: '12px 26px',
        boxShadow: '0 10px 26px rgba(0,0,0,0.45)',
        opacity: p * fadeOut,
        transform: `translateY(${((1 - p) * 16).toFixed(1)}px)`,
        zIndex: 25,
      }}
    >
      <div
        style={{
          fontFamily: BRUSH_FONT,
          fontStyle: 'italic',
          fontWeight: 700,
          fontSize: 34,
          lineHeight: 1.15,
          color: S.white,
          letterSpacing: 0.6,
          whiteSpace: 'nowrap',
        }}
      >
        {text.slice(0, chars)}
      </div>
      {sub && subChars > 0 && (
        <div
          style={{
            fontFamily: BRUSH_FONT,
            fontStyle: 'italic',
            fontWeight: 600,
            fontSize: 22,
            color: accent,
            marginTop: 4,
            whiteSpace: 'nowrap',
          }}
        >
          {sub.slice(0, subChars)}
        </div>
      )}
    </div>
  );
};

/** Chữ SVG chuẩn của skill `story_2d` (thay thế hoàn toàn thẻ `<text>` thô trong `src/parts/` & `src/scenes/`). */
export const StoryText: React.FC<{
  x: number;
  y: number;
  text: string;
  size?: number;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  mono?: boolean;
  italic?: boolean;
  weight?: number;
  anchor?: 'start' | 'middle' | 'end';
  rotate?: number;
  opacity?: number;
}> = ({
  x,
  y,
  text,
  size = 34,
  color = S.white,
  strokeColor = S.ink,
  strokeWidth = 7,
  mono = false,
  italic = true,
  weight = 800,
  anchor = 'middle',
  rotate = 0,
  opacity = 1,
}) => (
  <text
    x={x}
    y={y}
    textAnchor={anchor}
    dominantBaseline="central"
    fontFamily={mono ? MONO_FONT : BRUSH_FONT}
    fontStyle={!mono && italic ? 'italic' : 'normal'}
    fontWeight={weight}
    fontSize={size}
    fill={color}
    stroke={strokeWidth > 0 ? strokeColor : undefined}
    strokeWidth={strokeWidth > 0 ? strokeWidth : undefined}
    strokeLinejoin="round"
    opacity={opacity}
    transform={rotate ? `rotate(${rotate} ${x} ${y})` : undefined}
    style={{ paintOrder: 'stroke fill' }}
  >
    {text}
  </text>
);

/** Con số nhảy cuộn động khi lời đọc nhấn mạnh sự biến thiên số liệu (`locale` tuỳ chọn theo ngôn ngữ video). */
export const RollingNumber: React.FC<{
  t: number;
  from: number;
  to: number;
  until?: number;
  startVal: number;
  endVal: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  locale?: string;
  x: number;
  y: number;
  size?: number;
  color?: string;
}> = ({
  t,
  from,
  to,
  until,
  startVal,
  endVal,
  prefix = '',
  suffix = '',
  decimals = 0,
  locale = 'en-US',
  x,
  y,
  size = 68,
  color = S.red,
}) => {
  if (t < from || (until !== undefined && t >= until)) return null;
  const p = prog(t, from, to, Easing.bezier(0.16, 0.84, 0.28, 1));
  const val = lerp(startVal, endVal, p);
  const formatted = val.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  const jolt = p > 0.05 && p < 0.98 ? Math.sin(t * 42) * 2.5 : 0;

  return (
    <div
      style={{
        position: 'absolute',
        left: x + jolt,
        top: y,
        transform: 'translate(-50%, -50%)',
        fontFamily: BRUSH_FONT,
        fontStyle: 'italic',
        fontWeight: 800,
        fontSize: size,
        color,
        WebkitTextStroke: `10px ${S.ink}`,
        paintOrder: 'stroke fill',
        filter: 'drop-shadow(4px 6px 0px rgba(8,8,10,0.85))',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 26,
      }}
    >
      {prefix}
      {formatted}
      {suffix}
    </div>
  );
};

/** Đường chấm nối quan hệ giữa 2 chủ thể + tuỳ chọn đóng dấu gạch chéo đỏ `[X]` phủ định đúng từ khoá. */
export const RelationLink: React.FC<{
  t: number;
  from: number;
  until?: number;
  a: Pt;
  b: Pt;
  crossAt?: number;
  color?: string;
  label?: string;
}> = ({ t, from, until, a, b, crossAt, color = S.white, label }) => {
  if (t < from || (until !== undefined && t >= until)) return null;
  const drawP = prog(t, from, from + 0.35);
  const curX = lerp(a[0], b[0], drawP);
  const curY = lerp(a[1], b[1], drawP);
  const mx = (a[0] + b[0]) / 2;
  const my = (a[1] + b[1]) / 2;
  const crossSp = crossAt !== undefined && t >= crossAt ? useSpring(t, crossAt, 10, 220) : 0;

  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 27 }}>
      <line
        x1={a[0]}
        y1={a[1]}
        x2={curX}
        y2={curY}
        stroke={color}
        strokeWidth={4}
        strokeDasharray="10 10"
        strokeLinecap="round"
      />
      {label && drawP > 0.6 && (
        <StoryText x={mx} y={my - 46} text={label} size={24} color={S.gold} strokeWidth={5} />
      )}
      {crossSp > 0.01 && (
        <g transform={`translate(${mx}, ${my}) scale(${lerp(2.1, 1, Math.min(1, crossSp)).toFixed(3)}) rotate(-6)`}>
          <rect
            x={-28}
            y={-28}
            width={56}
            height={56}
            rx={8}
            fill="rgba(24, 8, 10, 0.9)"
            stroke={S.red}
            strokeWidth={5}
          />
          <line x1={-15} y1={-15} x2={15} y2={15} stroke={S.red} strokeWidth={6} strokeLinecap="round" />
          <line x1={15} y1={-15} x2={-15} y2={15} stroke={S.red} strokeWidth={6} strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
};

/** Bong bóng thoại ngắn (`1–4 từ`) chỉ dùng cho diễn xuất phụ không lời (không nhại lại câu nhân vật đã nói trong voice). */
export const SpeechBubble: React.FC<{
  t: number;
  from: number;
  until?: number;
  x: number;
  y: number;
  tailTo?: Pt;
  text: string;
  fontSize?: number;
  bg?: string;
}> = ({ t, from, until, x, y, tailTo, text, fontSize = 26, bg = S.white }) => {
  if (t < from || (until !== undefined && t >= until)) return null;
  const sp = useSpring(t, from, 11, 210);
  const fadeOut = until !== undefined ? 1 - prog(t, until - 0.16, until) : 1;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 30, opacity: Math.min(1, sp * 1.4) * fadeOut }}>
      {tailTo && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
          <polygon
            points={`${x - 18},${y + 10} ${x + 18},${y + 10} ${tailTo[0]},${tailTo[1]}`}
            fill={bg}
            stroke={S.ink}
            strokeWidth={STROKE.outer}
            strokeLinejoin="round"
          />
        </svg>
      )}
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          transform: `translate(-50%, -50%) scale(${Math.min(1.04, sp).toFixed(3)})`,
          backgroundColor: bg,
          border: `${STROKE.outer}px solid ${S.ink}`,
          borderRadius: 22,
          padding: '12px 24px',
          fontFamily: BRUSH_FONT,
          fontWeight: 700,
          fontSize,
          color: S.ink,
          boxShadow: '4px 6px 0px rgba(8,8,10,0.5)',
          maxWidth: 420,
          textAlign: 'center',
        }}
      >
        {text}
      </div>
    </div>
  );
};

export type DocLineSpec = {
  text: string;
  /** Giây bút dạ vàng tô sáng dòng này. */
  highlightAt?: number;
  /** Giây bút đỏ gạch ngang dòng này + viết chữ thay thế bên cạnh. */
  strikeAt?: number;
  replaceWith?: string;
  /** Giây bút đỏ khoanh tròn dòng/từ này. */
  circleAt?: number;
};

/**
 * Tài liệu vẽ trong vũ trụ hoạt hình (`InWorldDoc`) — chỉ dùng khi kịch bản thực sự xoay quanh một văn bản/tài liệu cụ thể:
 * Báo in (`newspaper`), Thông cáo (`statement`), Bài đăng MXH (`tweet`), Bảng trắng (`whiteboard`), Bìa kẹp (`clipboard`).
 */
export const InWorldDoc: React.FC<{
  t: number;
  kind?: 'newspaper' | 'statement' | 'tweet' | 'whiteboard' | 'clipboard';
  x: number;
  y: number;
  w?: number;
  h?: number;
  header: string;
  subHeader?: string;
  lines: DocLineSpec[];
  tilt?: number;
  accent?: string;
  illustration?: React.ReactNode;
}> = ({
  t,
  kind = 'statement',
  x,
  y,
  w = 680,
  h = 460,
  header,
  subHeader,
  lines,
  tilt = -2,
  accent = S.sky,
  illustration,
}) => {
  const isBoard = kind === 'whiteboard';
  const isTweet = kind === 'tweet';
  const bg = isBoard ? '#F8FAFC' : isTweet ? '#FFFFFF' : S.paper;
  const borderCol = isBoard ? '#94A3B8' : S.ink;

  return (
    <g transform={`translate(${x}, ${y}) rotate(${tilt})`} filter="url(#storyDropSoft)">
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={isTweet ? 18 : 6}
        fill={bg}
        stroke={S.ink}
        strokeWidth={STROKE.outer}
      />
      {isBoard && (
        <rect
          x={-w / 2 + 8}
          y={-h / 2 + 8}
          width={w - 16}
          height={h - 16}
          rx={4}
          fill="none"
          stroke={borderCol}
          strokeWidth={4}
        />
      )}
      {kind === 'clipboard' && (
        <rect x={-90} y={-h / 2 - 22} width={180} height={38} rx={8} fill={S.steel} stroke={S.ink} strokeWidth={STROKE.outer} />
      )}

      {kind === 'statement' ? (
        <g>
          <rect x={-w / 2} y={-h / 2} width={w} height={64} fill="#111827" stroke={S.ink} strokeWidth={STROKE.outer} />
          <circle cx={-w / 2 + 36} cy={-h / 2 + 32} r={10} fill={accent} />
          <StoryText x={-w / 2 + 62} y={-h / 2 + 32} text={header} size={26} color={S.white} anchor="start" strokeWidth={0} />
        </g>
      ) : kind === 'newspaper' ? (
        <g>
          <StoryText x={0} y={-h / 2 + 38} text={header} size={34} color={S.ink} strokeWidth={0} weight={800} />
          <line x1={-w / 2 + 28} y1={-h / 2 + 66} x2={w / 2 - 28} y2={-h / 2 + 66} stroke={S.ink} strokeWidth={3} />
          {subHeader && (
            <StoryText x={0} y={-h / 2 + 98} text={subHeader} size={28} color={S.ink} strokeWidth={0} weight={800} />
          )}
        </g>
      ) : isTweet ? (
        <g>
          <circle cx={-w / 2 + 54} cy={-h / 2 + 54} r={26} fill={S.skin2} stroke={S.ink} strokeWidth={3.5} />
          <circle cx={-w / 2 + 47} cy={-h / 2 + 52} r={3} fill={S.ink} />
          <circle cx={-w / 2 + 61} cy={-h / 2 + 52} r={3} fill={S.ink} />
          <StoryText x={-w / 2 + 96} y={-h / 2 + 44} text={header} size={24} color={S.ink} anchor="start" strokeWidth={0} />
          {subHeader && (
            <StoryText x={-w / 2 + 96} y={-h / 2 + 70} text={subHeader} size={18} color="#64748B" anchor="start" strokeWidth={0} mono />
          )}
        </g>
      ) : (
        <StoryText x={-w / 2 + 36} y={-h / 2 + 46} text={header} size={28} color="#1E3A8A" anchor="start" strokeWidth={0} />
      )}

      {illustration}

      {lines.map((ln, idx) => {
        const ly = -h / 2 + (kind === 'newspaper' && subHeader ? 156 : 118) + idx * 58;
        const lx = -w / 2 + 44;
        const hiP = ln.highlightAt !== undefined ? prog(t, ln.highlightAt, ln.highlightAt + 0.35) : 0;
        const stP = ln.strikeAt !== undefined ? prog(t, ln.strikeAt, ln.strikeAt + 0.28) : 0;
        const ciP = ln.circleAt !== undefined ? prog(t, ln.circleAt, ln.circleAt + 0.35) : 0;
        const estW = Math.min(w - 96, Math.max(120, ln.text.length * 16.5));

        return (
          <g key={idx}>
            {hiP > 0 && (
              <rect
                x={lx - 8}
                y={ly - 20}
                width={(estW + 16) * hiP}
                height={40}
                rx={4}
                fill="#FDE047"
                opacity={0.78}
              />
            )}
            <StoryText
              x={lx}
              y={ly}
              text={ln.text}
              size={27}
              color={isBoard ? '#1E293B' : S.ink}
              anchor="start"
              strokeWidth={0}
              weight={600}
            />
            {stP > 0 && (
              <line
                x1={lx - 4}
                y1={ly + 2}
                x2={lx - 4 + estW * stP}
                y2={ly - 4}
                stroke={S.red}
                strokeWidth={5.5}
                strokeLinecap="round"
              />
            )}
            {ln.replaceWith && stP > 0.85 && (
              <StoryText
                x={Math.min(lx + estW + 18, w / 2 - 24)}
                y={lx + estW + 140 > w / 2 ? ly - 24 : ly}
                text={ln.replaceWith}
                size={25}
                color={S.greenDark}
                anchor={lx + estW + 140 > w / 2 ? 'end' : 'start'}
                strokeColor={S.offWhite}
                strokeWidth={5}
                weight={800}
              />
            )}
            {ciP > 0 && (
              <ellipse
                cx={lx + estW * 0.5}
                cy={ly}
                rx={estW * 0.56}
                ry={26}
                fill="none"
                stroke={S.red}
                strokeWidth={5}
                strokeDasharray={600}
                strokeDashoffset={600 * (1 - ciP)}
              />
            )}
          </g>
        );
      })}
    </g>
  );
};
