import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Type } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

/**
 * Alto de la barra sin contar la zona segura inferior: el de UIKit (49) más el
 * `paddingTop` en iOS; algo más holgado en Android y web.
 */
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 55 : 62;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Relleno al estar activa, contorno al no estarlo: el estado se ve, no se adivina. */
const ICONS: Record<string, { active: IconName; idle: IconName }> = {
  index: { active: 'barbell', idle: 'barbell-outline' },
  progress: { active: 'trending-up', idle: 'trending-up-outline' },
  settings: { active: 'options', idle: 'options-outline' },
};

export default function TabsLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const icon = (name: keyof typeof ICONS) => {
    function TabIcon({
      color,
      size,
      focused,
    }: {
      color: ColorValue;
      size: number;
      focused: boolean;
    }) {
      return (
        <Ionicons
          name={focused ? ICONS[name].active : ICONS[name].idle}
          color={color}
          size={size - 1}
        />
      );
    }
    return TabIcon;
  };

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { ...Type.title, color: colors.text },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          // El navegador ya rellena por abajo con la zona segura, pero un
          // `height` propio sustituye al suyo, que la incluía: hay que sumarla
          // aquí. Ni siquiera vale `height: undefined`, que también lo pisa y
          // deja la barra con alto automático, aplastada contra el indicador
          // de inicio en iOS. Con Android edge-to-edge pasa lo mismo con la
          // barra de navegación del sistema.
          height: TAB_BAR_HEIGHT + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { ...Type.caption, marginTop: 2 },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        sceneStyle: { backgroundColor: colors.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.exercises'), tabBarIcon: icon('index') }}
      />
      <Tabs.Screen
        name="progress"
        options={{ title: t('tabs.progress'), tabBarIcon: icon('progress') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: t('tabs.settings'), tabBarIcon: icon('settings') }}
      />
    </Tabs>
  );
}
