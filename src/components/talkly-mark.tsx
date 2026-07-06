import Svg, { Rect } from 'react-native-svg';

// Logomark Talkly -- 4 batang gelombang suara menaik, geometri PERSIS dari
// mockup Claude Design "Talkly After-Login" (svg 18x12: x 0/5/10/15, lebar 3,
// tinggi 4/7/9.5/12, rx 1, rata bawah). Dipakai di header (white) dan momen
// brand di kanvas gelap (gradient = ramp lavender -> ungu brand).
const BARS: readonly [x: number, h: number][] = [
  [0, 4],
  [5, 7],
  [10, 9.5],
  [15, 12],
];

// Ramp terang -> ungu brand (#8B7BF0), senada app icon.
const RAMP = ['#EDE7FB', '#CDBEF4', '#A78FEE', '#8B7BF0'] as const;

export function TalklyMark({
  size = 24,
  variant = 'gradient',
}: {
  size?: number;
  variant?: 'gradient' | 'white';
}) {
  // Kanvas persegi 18x18; batang setinggi maks 12 duduk di baseline y=15
  // supaya glyph seimbang secara optik di samping wordmark.
  const BASELINE = 15;
  return (
    <Svg width={size} height={size} viewBox="0 0 18 18">
      {BARS.map(([x, h], i) => (
        <Rect
          key={x}
          x={x}
          y={BASELINE - h}
          width={3}
          height={h}
          rx={1}
          fill={variant === 'white' ? '#FFFFFF' : RAMP[i]}
        />
      ))}
    </Svg>
  );
}
