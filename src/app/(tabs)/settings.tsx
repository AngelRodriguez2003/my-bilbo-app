import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import { BackupCard } from '@/components/BackupCard';
import { Card, Enter, Field, Screen, SectionTitle, SegmentedControl } from '@/components/ui';
import { parseDecimal } from '@/lib/format';
import { useAuthStore } from '@/store/auth';
import { useSettingsStore } from '@/store/settings';
import { Radius, Spacing } from '@/theme/colors';
import { MEASURE, Type } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';
import type { LanguagePreference, ThemePreference, Unit } from '@/types/models';

/** Etiqueta encima de un control, con el mismo aire en toda la pantalla. */
function Setting({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: Spacing.sm }}>
      <Text style={[Type.label, { color: colors.textMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

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
    <Screen glow>
      <Enter index={0}>
        <Card style={{ gap: Spacing.lg }}>
          <SectionTitle>{t('settings.appearance')}</SectionTitle>
          <Setting label={t('settings.theme')}>
            <SegmentedControl
              options={[
                { value: 'system' as ThemePreference, label: t('settings.themeSystem') },
                { value: 'dark' as ThemePreference, label: t('settings.themeDark') },
                { value: 'light' as ThemePreference, label: t('settings.themeLight') },
              ]}
              value={settings.theme}
              onChange={setTheme}
            />
          </Setting>
          <Setting label={t('settings.language')}>
            <SegmentedControl
              options={[
                { value: 'system' as LanguagePreference, label: t('settings.languageSystem') },
                { value: 'es' as LanguagePreference, label: t('settings.spanish') },
                { value: 'en' as LanguagePreference, label: t('settings.english') },
              ]}
              value={settings.language}
              onChange={setLanguage}
            />
          </Setting>
        </Card>
      </Enter>

      <Enter index={1}>
        <Card style={{ gap: Spacing.lg }}>
          <SectionTitle>{t('settings.training')}</SectionTitle>
          <Setting label={t('settings.defaultUnit')}>
            <SegmentedControl
              options={[
                { value: 'kg' as Unit, label: t('common.kg') },
                { value: 'lb' as Unit, label: t('common.lb') },
              ]}
              value={settings.defaultUnit}
              onChange={setDefaultUnit}
            />
          </Setting>
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
      </Enter>

      <Enter index={2}>
        <BackupCard />
      </Enter>

      <Enter index={3}>
        <Card>
          <SectionTitle>{t('settings.account')}</SectionTitle>
          {/* `Link asChild` pisa el `style` del hijo, así que el layout va en
              una View interna y el feedback de pulsación en los children. */}
          <Link href="/account" asChild>
            <Pressable accessibilityRole="link">
              {({ pressed }) => (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: Spacing.md,
                    opacity: pressed ? 0.6 : 1,
                  }}>
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: Radius.md,
                      backgroundColor: accountEmail ? colors.accentSoft : colors.surfaceHigh,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons
                      name={accountEmail ? 'cloud-done-outline' : 'phone-portrait-outline'}
                      size={19}
                      color={accountEmail ? colors.accent : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[Type.bodyStrong, { color: colors.text }]} numberOfLines={1}>
                      {accountEmail ?? t('account.noAccount')}
                    </Text>
                    <Text style={[Type.caption, { color: colors.textMuted }]}>
                      {t('settings.accountManage')}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
                </View>
              )}
            </Pressable>
          </Link>
        </Card>
      </Enter>

      <Enter index={4}>
        <Card tone="sunken" level={0}>
          <SectionTitle>{t('settings.about')}</SectionTitle>
          <Text style={[Type.small, { color: colors.textSecondary, maxWidth: MEASURE }]}>
            {t('settings.aboutBilbo')}
          </Text>
        </Card>
      </Enter>
    </Screen>
  );
}
