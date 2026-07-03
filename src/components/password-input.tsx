import { useState } from 'react';
import { StyleSheet, TextInput, Pressable, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/theme';

type Props = Omit<TextInputProps, 'secureTextEntry' | 'style'>;

// Field password dengan toggle lihat/sembunyikan. Dipakai di login & register
// (logika identik) -- disatukan di sini biar tak duplikat di dua layar.
export function PasswordInput(props: Props) {
  const theme = useTheme();
  const [visible, setVisible] = useState(false);

  return (
    <ThemedView type="backgroundElement" style={styles.wrapper}>
      <TextInput
        {...props}
        secureTextEntry={!visible}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text }]}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={Spacing.two}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Sembunyikan password' : 'Tampilkan password'}
        style={styles.toggle}>
        <Ionicons
          name={visible ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  toggle: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
});
