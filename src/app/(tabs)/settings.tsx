import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { BackupCard } from '@/components/BackupCard';
import { Card, Field, SectionTitle, SegmentedControl } from '@/components/ui';
import { parseDecimal } from '@/lib/format';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { Spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import type { LanguagePreference, ThemePreference, Unit } from '@/types/models';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const accountEmail = useAuthStore((s) => s.email);

  const settings = useSettingsStore((s) => s.settings);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setLanguage = useSettingsStore((s) => s.setLanguage);
  const setDefaultUnit = useSettingsStore((s) => s.setDefaultUnit);
  const setDefaultIncrement = useSettingsStore((s) => s.setDefaultIncrement);

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>
      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>{t('settings.appearance')}</SectionTitle>
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('settings.theme')}</Text>
          <SegmentedControl
            options={[
              { value: 'system' as ThemePreference, label: t('settings.themeSystem') },
              { value: 'dark' as ThemePreference, label: t('settings.themeDark') },
              { value: 'light' as ThemePreference, label: t('settings.themeLight') },
            ]}
            value={settings.theme}
            onChange={setTheme}
          />
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {t('settings.language')}
          </Text>
          <SegmentedControl
            options={[
              { value: 'system' as LanguagePreference, label: t('settings.languageSystem') },
              { value: 'es' as LanguagePreference, label: t('settings.spanish') },
              { value: 'en' as LanguagePreference, label: t('settings.english') },
            ]}
            value={settings.language}
            onChange={setLanguage}
          />
        </View>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>{t('settings.training')}</SectionTitle>
        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
            {t('settings.defaultUnit')}
          </Text>
          <SegmentedControl
            options={[
              { value: 'kg' as Unit, label: t('common.kg') },
              { value: 'lb' as Unit, label: t('common.lb') },
            ]}
            value={settings.defaultUnit}
            onChange={setDefaultUnit}
          />
        </View>
        <Field
          label={t('settings.defaultIncrement')}
          defaultValue={String(settings.defaultIncrement)}
          keyboardType="decimal-pad"
          onEndEditing={(e) => {
            const value = parseDecimal(e.nativeEvent.text);
            if (value) setDefaultIncrement(value);
          }}
        />
      </Card>

      <BackupCard />

      <Card>
        <SectionTitle>{t('settings.account')}</SectionTitle>
        {/* `Link asChild` pisa el `style` del hijo, así que el layout va en
            una View interna y el feedback de pulsación en los children. */}
        <Link href="/account" asChild>
          <Pressable>
            {({ pressed }) => (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.sm,
                  opacity: pressed ? 0.6 : 1,
                }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.text, fontSize: 15 }}>
                    {accountEmail ?? t('account.noAccount')}
                  </Text>
                  <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                    {t('settings.accountManage')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </View>
            )}
          </Pressable>
        </Link>
      </Card>

      <Card>
        <SectionTitle>{t('settings.about')}</SectionTitle>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
          {t('settings.aboutBilbo')}
        </Text>
      </Card>
    </ScrollView>
  );
}
