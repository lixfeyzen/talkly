import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

// Logomark Talkly -- bubble + spark negative-space, path PERSIS dari proyek
// Claude design "Talkly AI logomark" (sumber yang sama dgn app icon).
const MARK_PATH =
  'M38 6 L82 6 Q112 6 112 36 L112 64 Q112 94 82 94 L54 94 L32 110 Q27 114 31 108 L44 94 L38 94 Q8 94 8 64 L8 36 Q8 6 38 6 Z ' +
  'M60 23 Q60 50 87 50 Q60 50 60 77 Q60 50 33 50 Q60 50 60 23 Z';

export function TalklyMark({
  size = 24,
  variant = 'gradient',
}: {
  size?: number;
  variant?: 'gradient' | 'white';
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120">
      {variant === 'gradient' && (
        <Defs>
          <LinearGradient id="tkgrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#6C5CE7" />
            <Stop offset="1" stopColor="#8B7BF0" />
          </LinearGradient>
        </Defs>
      )}
      <Path
        d={MARK_PATH}
        fill={variant === 'gradient' ? 'url(#tkgrad)' : '#FFFFFF'}
        fillRule="evenodd"
      />
    </Svg>
  );
}
