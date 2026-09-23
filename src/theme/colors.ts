import type { ViewStyle } from 'react-native';

/**
 * Paleta «forja»: carbón cálido y brasa.
 *
 * El método Bilbo es una sola serie explosiva que sube de peso hasta romperse,
 * así que el color trabaja como el calor de una barra: base oscura y mate, un
 * único acento naranja para todo lo que empuja hacia delante, y estados
 * (éxito / aviso / peligro) desaturados para que nunca compitan con él.
 *
 * Todos los grises llevan el mismo tinte cálido —nada de mezclar grises fríos
 * y cálidos— y las sombras se tiñen del fondo en vez de ser negro puro.
 */
export interface ThemeColors {
  background: string;
  /** Halo ambiental detrás de las cabeceras; ya lleva su propia opacidad. */
  glow: string;
  surface: string;
  surfaceHigh: string;
  surfaceSunken: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentStrong: string;
  /** Fondo tenue del acento, para chips y realces. */
  accentSoft: string;
  accentText: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  chartLine: string;
  chartGrid: string;
  /** Color de sombra, teñido del fondo (una sola fuente de luz, desde arriba). */
  shadow: string;
}

export const darkColors: ThemeColors = {
  background: '#100E0D',
  glow: 'rgba(226,112,63,0.14)',
  surface: '#1A1614',
  surfaceHigh: '#241F1B',
  surfaceSunken: '#0B0908',
  border: '#2C2521',
  borderStrong: '#3B322C',
  text: '#F6F1EB',
  textSecondary: '#A79C92',
  textMuted: '#6F645B',
  accent: '#E2703F',
  accentStrong: '#F28A57',
  accentSoft: 'rgba(226,112,63,0.15)',
  accentText: '#1A0D06',
  success: '#4FBF8B',
  successSoft: 'rgba(79,191,139,0.15)',
  warning: '#E0B355',
  warningSoft: 'rgba(224,179,85,0.15)',
  danger: '#E3705F',
  dangerSoft: 'rgba(227,112,95,0.15)',
  chartLine: '#E2703F',
  chartGrid: '#261F1B',
  shadow: '#000000',
};

export const lightColors: ThemeColors = {
  background: '#FAF6F2',
  glow: 'rgba(184,80,31,0.10)',
  surface: '#FFFFFF',
  surfaceHigh: '#F2EBE4',
  surfaceSunken: '#EFE7DF',
  border: '#E7DDD3',
  borderStrong: '#D5C7B9',
  text: '#1C1512',
  textSecondary: '#5F544C',
  textMuted: '#948880',
  accent: '#B8501F',
  accentStrong: '#9C4318',
  accentSoft: 'rgba(184,80,31,0.10)',
  accentText: '#FFFFFF',
  success: '#1B8F5E',
  successSoft: 'rgba(27,143,94,0.12)',
  warning: '#A9791C',
  warningSoft: 'rgba(169,121,28,0.12)',
  danger: '#C1503C',
  dangerSoft: 'rgba(193,80,60,0.12)',
  chartLine: '#B8501F',
  chartGrid: '#EBE1D8',
  shadow: '#5A331E',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  /** Margen lateral de las pantallas. */
  gutter: 20,
} as const;

export const Radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Duraciones y muelles compartidos: el movimiento se siente igual en toda la app. */
export const Motion = {
  fast: 140,
  base: 220,
  slow: 420,
  /** Retardo entre elementos que entran en cascada. */
  stagger: 55,
  /** Muelle corto para pulsaciones. */
  press: { damping: 18, stiffness: 320, mass: 0.6 },
  /** Muelle con algo más de peso para indicadores que se desplazan. */
  glide: { damping: 20, stiffness: 180, mass: 0.9 },
} as const;

/**
 * Sombras teñidas del fondo, siempre proyectadas hacia abajo (luz cenital).
 * El nivel 0 no dibuja nada: las tarjetas solo se elevan cuando la elevación
 * comunica jerarquía.
 */
export function elevation(colors: ThemeColors, level: 0 | 1 | 2 | 3): ViewStyle {
  if (level === 0) return {};
  const presets = {
    1: { opacity: 0.18, radius: 10, offset: 3, android: 2 },
    2: { opacity: 0.26, radius: 20, offset: 8, android: 6 },
    3: { opacity: 0.34, radius: 34, offset: 14, android: 12 },
  } as const;
  const preset = presets[level];
  return {
    shadowColor: colors.shadow,
    shadowOpacity: preset.opacity,
    shadowRadius: preset.radius,
    shadowOffset: { width: 0, height: preset.offset },
    elevation: preset.android,
  };
}
