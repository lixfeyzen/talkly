import { useId, useState, type ReactNode } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { TalklyMark } from '@/components/talkly-mark';
import { Spacing, MaxContentWidth, Brand, Font } from '@/constants/theme';

// Layar awal Talkly (desain final ungu, 2026-10-18): satu kanvas kertas terang
// dengan cahaya ungu lembut di atas, baris merek kecil, judul besar, formulir,
// lalu tautan pindah layar di bawah. Sama dengan layar sesudah login yang juga
// terang, jadi app terasa satu. Spesifikasi: docs/sistem-desain-talkly-2026-10-18.md.
export const AuthPalette = {
  canvas: Brand.paper,
  inputBg: '#F4F4F5',
  inputText: '#15141A',
  placeholder: '#686770',
  textPrimary: '#15141A',
  textSecondary: '#5F5E66',
  error: '#D92D20',
  success: '#067647',
} as const;

// Cahaya ungu lembut berbentuk radial di atas layar, sama dengan mockup final
// (gradasi linear terlalu rata dan membuat seluruh bagian atas ungu).
export function GlowBackdrop() {
  // Id unik per layar, sebab sama seperti logo: di web layar lama di stack
  // tetap terpasang tersembunyi dan url(#id) bersama akan ikut hilang.
  const id = `authGlow${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg style={styles.glow} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="0%" rx="75%" ry="100%" fx="50%" fy="0%">
          <Stop offset="0" stopColor={Brand.glow} stopOpacity={1} />
          <Stop offset="1" stopColor={Brand.glow} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

export function BrandRow() {
  return (
    <View style={styles.brandRow} accessibilityRole="header" accessibilityLabel="Talkly">
      <TalklyMark size={28} />
      <Text style={styles.brandText}>talkly</Text>
    </View>
  );
}

export function AuthLayout({
  title,
  subtitle,
  topQuestion,
  topAction,
  onTopAction,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  // Tautan pindah layar (mis. "New to Talkly?" + "Create account"), tampil di bawah.
  topQuestion?: string;
  topAction?: string;
  onTopAction?: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.page}>
      <GlowBackdrop />
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            style={styles.root}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            bounces={false}>
            <View style={styles.inner}>
              <BrandRow />
              <View style={styles.titleBlock}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>
              <View style={styles.form}>{children}</View>
              <View style={styles.spacer} />
              {topQuestion && topAction && (
                <View style={styles.footRow}>
                  <Text style={styles.footText}>{topQuestion} </Text>
                  <Pressable onPress={onTopAction} hitSlop={Spacing.two} accessibilityRole="link">
                    <Text style={styles.footAction}>{topAction}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
        accessibilityLabel={visible ? 'Hide password' : 'Show password'}
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

// Tombol utama ungu gradasi. Teks putih di atas #5B3FD9 = 6,65:1.
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
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      style={({ pressed }) => [
        styles.buttonShadow,
        { opacity: disabled ? 0.45 : loading ? 0.8 : pressed ? 0.9 : 1 },
      ]}>
      <LinearGradient
        colors={[Brand.violetLight, Brand.violetDeep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.button}>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>{label}</Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: AuthPalette.canvas },
  root: { flex: 1, backgroundColor: 'transparent' },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 380 },
  scrollContent: { flexGrow: 1 },
  inner: {
    flexGrow: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandText: { fontFamily: Font.extrabold, fontSize: 21, letterSpacing: -1, color: AuthPalette.textPrimary },
  titleBlock: { marginTop: Spacing.five + Spacing.two, gap: Spacing.two + 2 },
  title: {
    fontFamily: Font.extrabold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -1,
    color: AuthPalette.textPrimary,
  },
  subtitle: { fontFamily: Font.medium, fontSize: 15, lineHeight: 22, color: AuthPalette.textSecondary },
  form: { marginTop: Spacing.four, gap: Spacing.three },
  spacer: { flexGrow: 1, minHeight: Spacing.four },
  footRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' },
  footText: { fontFamily: Font.medium, fontSize: 14, color: AuthPalette.textSecondary },
  footAction: {
    fontFamily: Font.bold,
    fontSize: 14,
    color: AuthPalette.textPrimary,
    textDecorationLine: 'underline',
    textDecorationColor: Brand.violetLight,
  },
  input: {
    backgroundColor: AuthPalette.inputBg,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
    fontFamily: Font.medium,
    color: AuthPalette.inputText,
    // Cincin fokus tetap terlihat (aksesibilitas keyboard), tapi ungu merek,
    // bukan oranye bawaan browser.
    outlineColor: Brand.violetLight,
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AuthPalette.inputBg,
    borderRadius: 16,
  },
  passwordInput: { flex: 1, backgroundColor: 'transparent' },
  eyeToggle: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.three },
  buttonShadow: {
    marginTop: Spacing.two,
    borderRadius: 999,
    shadowColor: Brand.violet,
    shadowOpacity: 0.32,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  button: {
    borderRadius: 999,
    paddingVertical: Spacing.three + 2,
    alignItems: 'center',
  },
  buttonText: { fontFamily: Font.bold, color: '#FFFFFF', fontSize: 16 },
});
