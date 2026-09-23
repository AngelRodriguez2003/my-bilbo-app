import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, type ColorValue } from 'react-native';

import { Type } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

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
          height: Platform.OS === 'ios' ? undefined : 62,
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
