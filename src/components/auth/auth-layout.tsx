import { useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  type TextInputProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Spacing, MaxContentWidth } from '@/constants/theme';

// Layar auth Talkly -- gaya "dark hero + pastel + white sheet":
// atas gelap dengan bubble sapaan berbagai bahasa (pengganti karakter 3D
// referensi -- on-brand buat app latihan bahasa), bawah kartu putih membulat
// berisi form. Palet DISENGAJA tetap (tidak ikut dark/light theme) -- kontras
// gelap-vs-putih adalah identitas layar ini.
export const AuthPalette = {
  heroBg: '#101014',
  heroText: '#FFFFFF',
  sheet: '#FFFFFF',
  inputBg: '#F2F3F5',
  inputText: '#111114',
  placeholder: '#8B8F98',
  button: '#111114',
  buttonText: '#FFFFFF',
  textPrimary: '#111114',
  textSecondary: '#60646C',
  error: '#D92D20',
  success: '#067647',
  pastel: {
    pink: '#F9D9E0',
    mint: '#CDEEDB',
    ice: '#D8EFF6',
    lilac: '#E6DCF8',
    cream: '#F7EDC9',
  },
} as const;

// Titik-titik dekoratif melayang di hero (posisi tetap, bukan acak --
// deterministik & tenang).
const DOTS: { size: number; top: number; left?: number; right?: number; color: string }[] = [
  { size: 26, top: 24, left: 18, color: AuthPalette.pastel.lilac },
  { size: 14, top: 96, left: 44, color: AuthPalette.pastel.ice },
  { size: 34, top: 10, right: 42, color: AuthPalette.pastel.mint },
  { size: 10, top: 150, right: 26, color: AuthPalette.pastel.cream },
  { size: 18, top: 190, left: 22, color: AuthPalette.pastel.ice },
  { size: 12, top: 210, right: 84, color: AuthPalette.pastel.pink },
];

// Bubble sapaan (pengganti avatar 3D referensi).
function GreetingBubbles() {
  return (
    <View style={styles.bubbleArea}>
      <View style={[styles.bubble, styles.bubbleBig, { backgroundColor: AuthPalette.pastel.pink }]}>
        <Text style={styles.bubbleTextBig}>Hola</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleMid, { backgroundColor: AuthPalette.pastel.ice }]}>
        <Text style={styles.bubbleTextMid}>Bonjour</Text>
      </View>
      <View style={[styles.bubble, styles.bubbleSmall, { backgroundColor: AuthPalette.pastel.mint }]}>
        <Text style={styles.bubbleTextSmall}>こんにちは</Text>
      </View>
      <View style={styles.chip}>
        <Text style={styles.chipText}>Hey!</Text>
      </View>
    </View>
  );
}

export function AuthLayout({
  title,
  topQuestion,
  topAction,
  onTopAction,
  children,
}: {
  title: string;
  topQuestion?: string;
  topAction?: string;
  onTopAction?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.root}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <SafeAreaView edges={['top']} style={styles.heroSafe}>
            <View style={styles.hero}>
              {DOTS.map((d, i) => (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    width: d.size,
                    height: d.size,
                    borderRadius: d.size / 2,
                    top: d.top,
                    left: d.left,
                    right: d.right,
                    backgroundColor: d.color,
                    opacity: 0.9,
                  }}
                />
              ))}
              <GreetingBubbles />
              <Text style={styles.title}>{title}</Text>
            </View>
          </SafeAreaView>

          <View style={styles.sheet}>
            <View style={styles.sheetInner}>
              {topQuestion && topAction && (
                <View style={styles.topRow}>
                  <Text style={styles.topQuestion}>{topQuestion}</Text>
                  <Pressable onPress={onTopAction} hitSlop={Spacing.two}>
                    <Text style={styles.topAction}>{topAction}</Text>
                  </Pressable>
                </View>
              )}
              {children}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export function AuthInput(props: Omit<TextInputProps, 'style'>) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={AuthPalette.placeholder}
      style={styles.input}
    />
  );
}

export function AuthPasswordInput(props: Omit<TextInputProps, 'secureTextEntry' | 'style'>) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.passwordWrapper}>
      <TextInput
        {...props}
        secureTextEntry={!visible}
        placeholderTextColor={AuthPalette.placeholder}
        style={[styles.input, styles.passwordInput]}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={Spacing.two}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Sembunyikan password' : 'Tampilkan password'}
        style={styles.eyeToggle}>
        <Ionicons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={AuthPalette.placeholder}
        />
      </Pressable>
    </View>
  );
}

export function AuthButton({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { opacity: disabled ? 0.4 : loading ? 0.7 : pressed ? 0.85 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={AuthPalette.buttonText} />
      ) : (
        <Text style={styles.buttonText}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AuthPalette.heroBg },
  scrollContent: { flexGrow: 1 },
  heroSafe: { backgroundColor: AuthPalette.heroBg },
  hero: {
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  bubbleArea: {
    width: 260,
    height: 190,
    marginBottom: Spacing.four,
  },
  bubble: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    // Glow lembut ala referensi.
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  bubbleBig: { width: 110, height: 110, borderRadius: 55, top: 0, left: 0 },
  bubbleMid: { width: 84, height: 84, borderRadius: 42, top: 12, right: 8 },
  bubbleSmall: { width: 72, height: 72, borderRadius: 36, bottom: 0, left: 96 },
  bubbleTextBig: { fontSize: 24, fontWeight: '800', color: '#3D2A31' },
  bubbleTextMid: { fontSize: 15, fontWeight: '800', color: '#23404B' },
  bubbleTextSmall: { fontSize: 11, fontWeight: '800', color: '#1F4433' },
  chip: {
    position: 'absolute',
    top: 76,
    left: 92,
    backgroundColor: 'rgba(40,40,46,0.92)',
    borderRadius: 22,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  chipText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  title: {
    color: AuthPalette.heroText,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    textAlign: 'center',
  },
  sheet: {
    flexGrow: 1,
    backgroundColor: AuthPalette.sheet,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
  },
  sheetInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
    gap: Spacing.three,
  },
  topRow: {
    alignItems: 'center',
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  topQuestion: { color: AuthPalette.textSecondary, fontSize: 14 },
  topAction: { color: AuthPalette.textPrimary, fontSize: 16, fontWeight: '800' },
  input: {
    backgroundColor: AuthPalette.inputBg,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    color: AuthPalette.inputText,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AuthPalette.inputBg,
    borderRadius: 16,
  },
  passwordInput: { flex: 1, backgroundColor: 'transparent' },
  eyeToggle: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  button: {
    backgroundColor: AuthPalette.button,
    borderRadius: 999,
    paddingVertical: Spacing.three + 2,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  buttonText: { color: AuthPalette.buttonText, fontSize: 16, fontWeight: '700' },
});
