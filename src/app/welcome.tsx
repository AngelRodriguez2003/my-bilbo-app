import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui';
import { useWelcomeStore } from '@/store/welcome';
import { Spacing } from '@/theme/colors';
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
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: 'space-between',
        padding: Spacing.lg,
        paddingTop: insets.top + Spacing.xl,
        paddingBottom: insets.bottom + Spacing.lg,
        gap: Spacing.xl,
      }}>
      <View style={{ alignItems: 'center', gap: Spacing.md, marginTop: Spacing.xl }}>
        {/* TODO: sustituir por el logo definitivo de la app. */}
        <Image
          source={require('../../assets/images/icon.png')}
          style={{ width: 128, height: 128, borderRadius: 28 }}
          accessibilityLabel={t('welcome.logoLabel')}
        />
        <Text style={{ color: colors.text, fontSize: 28, fontWeight: '700', textAlign: 'center' }}>
          {t('welcome.title')}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: 15,
            lineHeight: 22,
            textAlign: 'center',
          }}>
          {t('welcome.body')}
        </Text>
      </View>

      <View style={{ gap: Spacing.sm }}>
        <AppButton label={t('welcome.signIn')} onPress={() => router.push('/account')} />
        <AppButton label={t('welcome.continueLocal')} variant="secondary" onPress={dismiss} />
        <Text
          style={{
            color: colors.textMuted,
            fontSize: 12,
            lineHeight: 18,
            textAlign: 'center',
            marginTop: Spacing.xs,
          }}>
          {t('welcome.hint')}
        </Text>
      </View>
    </ScrollView>
  );
}
