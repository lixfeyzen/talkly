import { useId } from 'react';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

// Logomark Talkly (desain final 2026-10-18): huruf t kecil yang ujungnya naik
// menjadi tanda centang, artinya kalimatmu sudah benar. Logo lama (4 batang
// menaik) terbaca seperti ikon sinyal HP, lihat docs/sistem-desain-talkly-2026-10-18.md.
// Geometri sama persis dengan mockup final (viewBox 64x64).
const GLYPH = 'M27 11v29c0 5 3 8 7.5 8 3 0 5.5-1.6 7.5-4.5L53 27M16 23h22';

export function TalklyMark({
  size = 24,
  variant = 'gradient',
}: {
  size?: number;
  // gradient = kotak ungu gradasi + t putih (bawaan). white = t putih saja,
  // untuk dipasang di atas latar gelap.
  variant?: 'gradient' | 'white';
}) {
  // Id gradasi wajib unik per logo: di web, layar sebelumnya di stack tetap
  // terpasang tapi tersembunyi, dan url(#id) yang sama akan menunjuk gradasi
  // milik layar tersembunyi itu sehingga kotaknya hilang.
  const gradientId = `talklyMark${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {variant === 'gradient' && (
        <>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#8B5CF6" />
              <Stop offset="1" stopColor="#4C2BC4" />
            </LinearGradient>
          </Defs>
          <Rect width={64} height={64} rx={15} fill={`url(#${gradientId})`} />
        </>
      )}
      <Path
        d={GLYPH}
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
