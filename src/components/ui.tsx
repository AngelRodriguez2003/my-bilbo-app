import { Ionicons } from '@expo/vector-icons';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  LinearTransition,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { elevation, Motion, Radius, Spacing } from '@/theme/colors';
import { MEASURE, Type } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** La app es de columna estrecha: en web no se estira de borde a borde. */
export const CONTENT_MAX = 620;

// ---------------------------------------------------------------- movimiento

/**
 * Entrada en cascada. Nada se monta de golpe: cada bloque sube unos píxeles
 * con un retardo proporcional a su posición.
 *
 * OJO: no envuelvas con esto un bloque que contenga un campo con `autoFocus`.
 * En web la animación de entrada se lleva por delante el foco automático y el
 * campo aparece sin teclado; esos bloques se montan sin animar a propósito.
 */
export function Enter({
  index = 0,
  children,
  style,
}: {
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.springify().damping(19).mass(0.8).delay(index * Motion.stagger)}
      layout={LinearTransition.springify().damping(20)}>
      {children}
    </Animated.View>
  );
}

/**
 * Pulsación con física: se hunde al tocar y vuelve con muelle. Es el gesto
 * base de todo lo pulsable, así que la app entera responde igual.
 */
export function PressableScale({
  children,
  onPress,
  disabled,
  style,
  scaleTo = 0.97,
  accessibilityLabel,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  accessibilityLabel?: string;
}) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => {
        scale.set(withSpring(scaleTo, Motion.press));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, Motion.press));
      }}>
      <Animated.View style={[animated, style]}>{children}</Animated.View>
    </Pressable>
  );
}

// ------------------------------------------------------------------ superficie

/**
 * Halo ambiental cálido. Rompe el plano detrás de las cabeceras sin meter una
 * sección de otro color: es el mismo fondo, solo que con algo de brasa encima.
 */
export function Glow({ height = 320 }: { height?: number }) {
  const { colors } = useTheme();
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, height }}>
      <Svg width="100%" height={height}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="0%" rx="80%" ry="100%">
            <Stop offset="0%" stopColor={colors.accent} stopOpacity={0.16} />
            <Stop offset="55%" stopColor={colors.accent} stopOpacity={0.05} />
            <Stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height={height} fill="url(#glow)" />
      </Svg>
    </View>
  );
}

/**
 * Contenedor de pantalla: un solo sitio donde viven el margen lateral, el
 * ancho máximo y el ritmo vertical.
 */
export function Screen({
  children,
  gap = Spacing.md,
  glow = false,
  contentStyle,
}: {
  children: ReactNode;
  gap?: number;
  glow?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {glow ? <Glow /> : null}
      <ScrollView
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: Spacing.gutter,
          paddingTop: Spacing.md,
          // El aire de abajo va algo más suelto que el de arriba: ópticamente
          // un bloque centrado con paddings iguales se ve caído.
          paddingBottom: Spacing.xxl,
          alignItems: 'center',
        }}>
        <View style={[{ width: '100%', maxWidth: CONTENT_MAX, gap }, contentStyle]}>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Tarjeta. `level` decide si se eleva: solo cuando la elevación dice algo
 * sobre la jerarquía, nunca «borde + sombra» por defecto.
 */
export function Card({
  children,
  style,
  level = 1,
  tone = 'surface',
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  level?: 0 | 1 | 2 | 3;
  tone?: 'surface' | 'sunken' | 'accent';
}) {
  const { colors, scheme } = useTheme();
  const background =
    tone === 'sunken' ? colors.surfaceSunken : tone === 'accent' ? colors.accentSoft : colors.surface;

  return (
    <View
      style={[
        {
          backgroundColor: background,
          borderRadius: Radius.lg,
          padding: Spacing.md,
          // En claro el borde separa la tarjeta del papel; en oscuro sobra,
          // el propio salto de superficie ya la despega del fondo.
          borderWidth: scheme === 'light' || tone === 'accent' ? StyleSheet.hairlineWidth : 0,
          borderColor: tone === 'accent' ? colors.accent : colors.border,
        },
        elevation(colors, scheme === 'light' ? level : (Math.max(level - 1, 0) as 0 | 1 | 2)),
        style,
      ]}>
      {children}
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  return (
    <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }, style]} />
  );
}

// -------------------------------------------------------------------- botones

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const hover = useSharedValue(0);
  const blocked = disabled || loading;

  const palette = {
    primary: { background: colors.accent, color: colors.accentText, border: 'transparent' },
    secondary: { background: colors.surfaceHigh, color: colors.text, border: colors.border },
    danger: { background: 'transparent', color: colors.danger, border: colors.danger },
    ghost: { background: 'transparent', color: colors.accent, border: 'transparent' },
  }[variant];

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
    // El hover aclara un punto la superficie; en móvil se queda en 0 y no hace nada.
    opacity: blocked ? 0.4 : 1 - hover.get() * 0.12,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!blocked, busy: !!loading }}
      disabled={blocked}
      onPress={onPress}
      onHoverIn={() => {
        hover.set(withTiming(1, { duration: Motion.fast }));
      }}
      onHoverOut={() => {
        hover.set(withTiming(0, { duration: Motion.fast }));
      }}
      onPressIn={() => {
        scale.set(withSpring(0.975, Motion.press));
      }}
      onPressOut={() => {
        scale.set(withSpring(1, Motion.press));
      }}
      style={style}>
      <Animated.View
        style={[
          {
            backgroundColor: palette.background,
            borderRadius: Radius.md,
            paddingVertical: 15,
            paddingHorizontal: Spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: Spacing.sm,
            borderWidth: palette.border === 'transparent' ? 0 : StyleSheet.hairlineWidth,
            borderColor: palette.border,
          },
          variant === 'primary' && !blocked ? elevation(colors, 1) : null,
          animated,
        ]}>
        {loading ? (
          <ActivityIndicator size="small" color={palette.color} />
        ) : icon ? (
          <Ionicons name={icon} size={18} color={palette.color} />
        ) : null}
        <Text style={[Type.button, { color: palette.color }]}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/** Acción de icono suelta (cabeceras, filas). Área táctil generosa. */
export function IconButton({
  icon,
  onPress,
  color,
  size = 18,
  accessibilityLabel,
}: {
  icon: IconName;
  onPress: () => void;
  color?: string;
  size?: number;
  accessibilityLabel: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={12}
      // Red de seguridad por si acaba dentro de otra zona pulsable: en web el
      // toque burbujea y dispararía también la acción de alrededor.
      onPress={(event) => {
        event.stopPropagation();
        onPress();
      }}
      style={({ pressed }) => ({
        padding: 7,
        borderRadius: Radius.sm,
        backgroundColor: pressed ? colors.surfaceHigh : 'transparent',
        opacity: pressed ? 0.8 : 1,
      })}>
      <Ionicons name={icon} size={size} color={color ?? colors.textMuted} />
    </Pressable>
  );
}

// ------------------------------------------------------------------ selección

/** Pastilla de selección con indicador que se desliza entre opciones. */
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
  const width = useSharedValue(0);
  const index = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  );
  const position = useSharedValue(index);

  useEffect(() => {
    position.set(withSpring(index, Motion.glide));
  }, [index, position]);

  const PAD = 4;
  const indicator = useAnimatedStyle(() => {
    const segment = Math.max((width.get() - PAD * 2) / Math.max(options.length, 1), 0);
    return {
      width: segment,
      transform: [{ translateX: position.get() * segment }],
    };
  });

  return (
    <View
      onLayout={(event) => {
        width.set(event.nativeEvent.layout.width);
      }}
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceHigh,
        borderRadius: Radius.md,
        padding: PAD,
      }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: PAD,
            left: PAD,
            bottom: PAD,
            borderRadius: Radius.sm,
            backgroundColor: colors.accent,
          },
          indicator,
        ]}
      />
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={{ flex: 1, paddingVertical: 9, borderRadius: Radius.sm, alignItems: 'center' }}>
            <Text
              numberOfLines={1}
              style={[
                selected ? Type.smallStrong : Type.small,
                { color: selected ? colors.accentText : colors.textSecondary },
              ]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Selector en fila desplazable. Para listas que crecen —los ejercicios del
 * usuario—, donde repartir el ancho entre todas las opciones las aplasta.
 */
export function ChipSelector<T extends string>({
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
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: Spacing.sm, paddingRight: Spacing.sm }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale key={option.value} onPress={() => onChange(option.value)} scaleTo={0.94}>
            <View
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              style={{
                paddingHorizontal: Spacing.md,
                paddingVertical: 9,
                borderRadius: Radius.pill,
                backgroundColor: selected ? colors.accent : colors.surfaceHigh,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: selected ? colors.accent : colors.border,
              }}>
              <Text
                style={[
                  selected ? Type.smallStrong : Type.small,
                  { color: selected ? colors.accentText : colors.textSecondary },
                ]}>
                {option.label}
              </Text>
            </View>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

// ------------------------------------------------------------------ entradas

export function Field({
  label,
  error,
  hint,
  ...inputProps
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const { colors } = useTheme();
  const focus = useSharedValue(0);

  const border = useAnimatedStyle(() => ({
    borderColor: error
      ? colors.danger
      : interpolateColor(focus.get(), [0, 1], [colors.border, colors.accent]),
    backgroundColor: interpolateColor(
      focus.get(),
      [0, 1],
      [colors.surfaceHigh, colors.surfaceHigh],
    ),
  }));

  return (
    <View style={{ gap: 7 }}>
      <Text style={[Type.caption, { color: colors.textSecondary }]}>{label}</Text>
      <Animated.View
        style={[
          {
            borderRadius: Radius.md,
            borderWidth: 1.5,
          },
          border,
        ]}>
        <TextInput
          placeholderTextColor={colors.textMuted}
          {...inputProps}
          onFocus={(event) => {
            focus.set(withTiming(1, { duration: Motion.fast }));
            inputProps.onFocus?.(event);
          }}
          onBlur={(event) => {
            focus.set(withTiming(0, { duration: Motion.base }));
            inputProps.onBlur?.(event);
          }}
          style={[
            Type.subheading,
            {
              color: colors.text,
              paddingHorizontal: Spacing.md,
              paddingVertical: 13,
              minHeight: inputProps.multiline ? 78 : undefined,
              textAlignVertical: inputProps.multiline ? 'top' : 'center',
            },
          ]}
        />
      </Animated.View>
      {error ? (
        <Animated.Text
          entering={FadeIn.duration(Motion.fast)}
          style={[Type.caption, { color: colors.danger }]}>
          {error}
        </Animated.Text>
      ) : hint ? (
        <Text style={[Type.caption, { color: colors.textMuted }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

// ---------------------------------------------------------------------- datos

export function StatTile({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'accent';
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, gap: 3, minWidth: 100 }}>
      <Text style={[Type.label, { color: colors.textMuted }]}>{label}</Text>
      <Text
        style={[Type.stat, { color: tone === 'accent' ? colors.accent : colors.text }]}
        numberOfLines={1}
        adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? <Text style={[Type.caption, { color: colors.textMuted }]}>{hint}</Text> : null}
    </View>
  );
}

/** Título de sección: caja alta reservada a las cifras, aquí frase normal. */
export function SectionTitle({
  children,
  action,
}: {
  children: string;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        marginBottom: Spacing.sm,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 }}>
        <View
          style={{
            width: 3,
            height: 15,
            borderRadius: Radius.pill,
            backgroundColor: colors.accent,
          }}
        />
        <Text style={[Type.subheading, { color: colors.text, flex: 1 }]} numberOfLines={1}>
          {children}
        </Text>
      </View>
      {action}
    </View>
  );
}

export function Chip({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  icon?: IconName;
}) {
  const { colors } = useTheme();
  const palette = {
    neutral: { background: colors.surfaceHigh, color: colors.textSecondary },
    accent: { background: colors.accentSoft, color: colors.accent },
    success: { background: colors.successSoft, color: colors.success },
    warning: { background: colors.warningSoft, color: colors.warning },
    danger: { background: colors.dangerSoft, color: colors.danger },
  }[tone];

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        alignSelf: 'flex-start',
        // Esquinas suaves, no píldora: las pastillas perfectas están en cada app.
        borderRadius: Radius.xs,
        backgroundColor: palette.background,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}>
      {icon ? <Ionicons name={icon} size={12} color={palette.color} /> : null}
      <Text style={[Type.caption, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

/** Punto de estado con latido: solo late cuando algo está vivo (ciclo activo). */
export function StatusDot({ color, pulsing = false }: { color: string; pulsing?: boolean }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!pulsing) return;
    pulse.set(withRepeat(withTiming(1, { duration: 1400 }), -1, false));
  }, [pulsing, pulse]);

  const halo = useAnimatedStyle(() => ({
    opacity: pulsing ? 0.5 * (1 - pulse.get()) : 0,
    transform: [{ scale: 1 + pulse.get() * 1.9 }],
  }));

  return (
    <View style={{ width: 9, height: 9, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          { position: 'absolute', width: 9, height: 9, borderRadius: 5, backgroundColor: color },
          halo,
        ]}
      />
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
    </View>
  );
}

/** Barra de avance que se llena con animación al cambiar el valor. */
export function ProgressTrack({
  value,
  color,
  height = 7,
}: {
  /** 0–1. */
  value: number;
  color?: string;
  height?: number;
}) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);
  const clamped = Math.min(Math.max(value, 0), 1);

  useEffect(() => {
    progress.set(withTiming(clamped, { duration: Motion.slow }));
  }, [clamped, progress]);

  const fill = useAnimatedStyle(() => ({ width: `${progress.get() * 100}%` }));

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ now: Math.round(clamped * 100), min: 0, max: 100 }}
      style={{
        height,
        borderRadius: Radius.pill,
        backgroundColor: colors.surfaceHigh,
        overflow: 'hidden',
      }}>
      <Animated.View
        style={[
          { height: '100%', borderRadius: Radius.pill, backgroundColor: color ?? colors.accent },
          fill,
        ]}
      />
    </View>
  );
}

// -------------------------------------------------------------- estados vacíos

/**
 * Vacío compuesto: icono, qué pasa y qué hacer. Una línea de texto gris suelta
 * en mitad de la pantalla parece un error, no un punto de partida.
 */
export function EmptyState({
  message,
  title,
  icon = 'barbell-outline',
  action,
}: {
  message: string;
  title?: string;
  icon?: IconName;
  action?: ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(Motion.base)}
      style={{ paddingVertical: Spacing.xl, alignItems: 'center', gap: Spacing.sm }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: Radius.lg,
          backgroundColor: colors.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={26} color={colors.accent} />
      </View>
      {title ? (
        <Text style={[Type.heading, { color: colors.text, textAlign: 'center' }]}>{title}</Text>
      ) : null}
      <Text
        style={[
          Type.small,
          { color: colors.textMuted, textAlign: 'center', maxWidth: MEASURE * 0.6 },
        ]}>
        {message}
      </Text>
      {action ? <View style={{ marginTop: Spacing.sm }}>{action}</View> : null}
    </Animated.View>
  );
}

// -------------------------------------------------------------------- carga

/** Bloque fantasma con latido, con la forma de lo que va a ocupar su sitio. */
export function Skeleton({
  height = 16,
  width = '100%',
  radius = Radius.sm,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.45);

  useEffect(() => {
    pulse.set(withRepeat(withTiming(1, { duration: 820 }), -1, true));
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.get() }));

  return (
    <Animated.View
      style={[
        { height, width, borderRadius: radius, backgroundColor: colors.surfaceHigh },
        animated,
        style,
      ]}
    />
  );
}

/** Lista fantasma mientras se lee el almacenamiento del dispositivo. */
export function SkeletonList({ rows = 3 }: { rows?: number }) {
  return (
    <View style={{ gap: Spacing.sm }} accessibilityLabel="loading">
      {Array.from({ length: rows }).map((_, row) => (
        <Card key={row} level={0}>
          <View style={{ gap: Spacing.sm }}>
            <Skeleton width="55%" height={17} />
            <Skeleton width="35%" height={12} />
            <Skeleton height={7} radius={Radius.pill} />
          </View>
        </Card>
      ))}
    </View>
  );
}
