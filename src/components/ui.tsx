import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { Radius, Spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: Radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: Spacing.md,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const background =
    variant === 'primary' ? colors.accent : variant === 'danger' ? 'transparent' : colors.surfaceHigh;
  const color =
    variant === 'primary' ? colors.accentText : variant === 'danger' ? colors.danger : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          backgroundColor: background,
          borderRadius: Radius.md,
          paddingVertical: 14,
          paddingHorizontal: Spacing.md,
          alignItems: 'center',
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
          borderWidth: variant === 'danger' ? StyleSheet.hairlineWidth : 0,
          borderColor: colors.danger,
        },
        style,
      ]}>
      <Text style={{ color, fontSize: 16, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

/** Horizontal pill selector used for theme/language/unit/mode choices. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceHigh,
        borderRadius: Radius.md,
        padding: 3,
      }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={{
              flex: 1,
              paddingVertical: 8,
              borderRadius: Radius.sm,
              alignItems: 'center',
              backgroundColor: selected ? colors.accent : 'transparent',
            }}>
            <Text
              style={{
                color: selected ? colors.accentText : colors.textSecondary,
                fontSize: 13,
                fontWeight: selected ? '600' : '400',
              }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  label,
  error,
  ...inputProps
}: TextInputProps & { label: string; error?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        {...inputProps}
        style={{
          backgroundColor: colors.surfaceHigh,
          borderRadius: Radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: error ? colors.danger : colors.border,
          color: colors.text,
          paddingHorizontal: Spacing.md,
          paddingVertical: 12,
          fontSize: 16,
        }}
      />
      {error ? <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}

export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ color: colors.textMuted, fontSize: 11, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{value}</Text>
      {hint ? <Text style={{ color: colors.textMuted, fontSize: 11 }}>{hint}</Text> : null}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        color: colors.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
        marginBottom: Spacing.sm,
      }}>
      {children}
    </Text>
  );
}

export function EmptyState({ message }: { message: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ padding: Spacing.xl, alignItems: 'center' }}>
      <Text style={{ color: colors.textMuted, fontSize: 14, textAlign: 'center' }}>{message}</Text>
    </View>
  );
}
