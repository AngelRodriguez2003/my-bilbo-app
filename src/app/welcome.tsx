import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, CONTENT_MAX, Enter, Glow } from '@/components/ui';
import { useWelcomeStore } from '@/store/welcome';
import { elevation, Motion, Radius, Spacing } from '@/theme/colors';
import { MEASURE, Type } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Primer arranque sin entrenamientos: ofrece guardar el progreso en la nube
 * (iniciando sesión) o seguir solo en este dispositivo. El layout raíz decide
 * cuándo se muestra; al iniciar sesión o elegir "sin cuenta" desaparece sola.
 */
export default function WelcomeScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dismiss = useWelcomeStore((s) => s.dismiss);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Glow height={480} />
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: Spacing.gutter,
          paddingTop: insets.top + Spacing.xl,
          paddingBottom: insets.bottom + Spacing.lg,
          gap: Spacing.xl,
        }}>
        <View
          style={{
            width: '100%',
            maxWidth: CONTENT_MAX,
            alignItems: 'center',
            gap: Spacing.md,
            marginTop: Spacing.xl,
          }}>
          {/* La sombra va en el contenedor: la imagen se recorta a su radio. */}
          <Animated.View
            entering={ZoomIn.springify().damping(14).mass(0.9)}
            style={[{ borderRadius: Radius.xl }, elevation(colors, 3)]}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={{ width: 112, height: 112, borderRadius: Radius.xl }}
              accessibilityLabel={t('welcome.logoLabel')}
            />
          </Animated.View>

          <Enter index={1}>
            <Text style={[Type.display, { color: colors.text, textAlign: 'center' }]}>
              {t('welcome.title')}
            </Text>
          </Enter>

          <Enter index={2}>
            <Text
              style={[
                Type.body,
                { color: colors.textSecondary, textAlign: 'center', maxWidth: MEASURE },
              ]}>
              {t('welcome.body')}
            </Text>
          </Enter>
        </View>

        <View style={{ width: '100%', maxWidth: CONTENT_MAX, gap: Spacing.sm }}>
          <Enter index={3}>
            <AppButton
              label={t('welcome.signIn')}
              icon="cloud-upload-outline"
              onPress={() => router.push('/account')}
            />
          </Enter>
          <Enter index={4}>
            <AppButton
              label={t('welcome.continueLocal')}
              variant="secondary"
              onPress={dismiss}
            />
          </Enter>
          <Animated.Text
            entering={FadeIn.delay(5 * Motion.stagger).duration(Motion.slow)}
            style={[
              Type.caption,
              { color: colors.textMuted, textAlign: 'center', marginTop: Spacing.xs },
            ]}>
            {t('welcome.hint')}
          </Animated.Text>
        </View>
      </ScrollView>
    </View>
  );
}
