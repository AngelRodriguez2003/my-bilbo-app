import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { catalogImageUrl } from '@/lib/catalog';
import { Motion, Radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Foto cuadrada de un ejercicio del catálogo. Debajo va siempre la baldosa con
 * el icono: es lo que se ve mientras la foto llega, si falla la red y en los
 * ejercicios escritos a mano, que no tienen foto. Así la fila nunca cambia de
 * forma según haya o no imagen.
 *
 * Es decorativa: el nombre del ejercicio ya lo lee la fila que la contiene.
 */
export function ExerciseThumb({ catalogId, size }: { catalogId?: string; size: number }) {
  const { colors } = useTheme();
  // Se recuerda QUÉ foto falló, no solo que algo falló: en una lista que
  // recicla filas, el mismo componente pasa a mostrar otro ejercicio.
  const [failedId, setFailedId] = useState<string | null>(null);
  const showImage = catalogId !== undefined && catalogId !== failedId;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: Radius.md,
        backgroundColor: colors.surfaceHigh,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Ionicons name="barbell-outline" size={Math.round(size * 0.42)} color={colors.textMuted} />
      {showImage ? (
        <Image
          source={catalogImageUrl(catalogId)}
          recyclingKey={catalogId}
          contentFit="cover"
          transition={Motion.base}
          onError={() => setFailedId(catalogId)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}
