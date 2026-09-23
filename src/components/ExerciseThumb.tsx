import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { catalogThumbUrl } from '@/lib/catalog';
import { Motion, Radius } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Imagen cuadrada de un ejercicio del catálogo. Debajo va siempre la baldosa
 * con el icono: es lo que se ve mientras la imagen llega, si falla la red y en
 * los ejercicios escritos a mano, que no tienen imagen. Así la fila nunca
 * cambia de forma según haya o no imagen.
 *
 * Es decorativa: el nombre del ejercicio ya lo lee la fila que la contiene.
 */
export function ExerciseThumb({ catalogId, size }: { catalogId?: string; size: number }) {
  const { colors } = useTheme();
  // Se recuerda QUÉ imagen falló, no solo que algo falló: en una lista que
  // recicla filas, el mismo componente pasa a mostrar otro ejercicio.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  // Sin URL si no es del catálogo, o si lo es de uno que ya no existe.
  const url = catalogThumbUrl(catalogId);

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
      {url && url !== failedUrl ? (
        <Image
          source={url}
          recyclingKey={url}
          contentFit="cover"
          transition={Motion.base}
          onError={() => setFailedUrl(url)}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}
