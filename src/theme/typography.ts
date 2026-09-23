import type { TextStyle } from 'react-native';

/**
 * Archivo: una grotesca de trazo firme, con cuerpo de sobra en los pesos altos
 * y cifras que se leen de un vistazo entre serie y serie. Toda la app usa la
 * misma familia; la jerarquía la marcan el peso, el tamaño y el tracking.
 *
 * En React Native `fontFamily` y `fontWeight` se pelean en Android (el peso
 * sintético deforma la fuente cargada), así que aquí el peso SIEMPRE viaja en
 * el nombre de la familia y nunca se acompaña de `fontWeight`.
 */
export const FontFamily = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  black: 'Archivo_800ExtraBold',
} as const;

/** Cifras de ancho fijo: los pesos no bailan al cambiar de sesión. */
const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/**
 * Escala tipográfica. Los titulares van con tracking negativo para que pesen;
 * las etiquetas pequeñas, con tracking positivo para que respiren.
 */
export const Type = {
  /** Cifra protagonista: el peso de la próxima sesión. */
  hero: {
    fontFamily: FontFamily.black,
    fontSize: 46,
    lineHeight: 48,
    letterSpacing: -1.6,
    ...tabular,
  },
  display: {
    fontFamily: FontFamily.black,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.6,
  },
  heading: {
    fontFamily: FontFamily.bold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  subheading: {
    fontFamily: FontFamily.semibold,
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  /** Cifra de una tarjeta de dato. */
  stat: {
    fontFamily: FontFamily.bold,
    fontSize: 21,
    lineHeight: 25,
    letterSpacing: -0.4,
    ...tabular,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: FontFamily.semibold,
    fontSize: 15,
    lineHeight: 22,
  },
  small: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    lineHeight: 19,
  },
  smallStrong: {
    fontFamily: FontFamily.semibold,
    fontSize: 13,
    lineHeight: 19,
  },
  caption: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    lineHeight: 17,
  },
  /** Etiqueta de dato: versalita ancha, solo encima de cifras. */
  label: {
    fontFamily: FontFamily.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  button: {
    fontFamily: FontFamily.semibold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
} as const satisfies Record<string, TextStyle>;

/**
 * Ancho de lectura cómodo (~62 caracteres a 15px). Los párrafos largos lo
 * llevan para no estirarse de borde a borde en tablet y web.
 */
export const MEASURE = 560;
