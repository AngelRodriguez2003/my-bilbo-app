import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Text, View } from 'react-native';

import { AppButton, Card, SectionTitle, SegmentedControl } from '@/components/ui';
import {
  BackupError,
  backupFileName,
  countBackup,
  createBackup,
  parseBackup,
  serializeBackup,
  type BackupCounts,
  type BackupFile,
  type ImportMode,
} from '@/lib/backup';
import { pickTextFile, saveTextFile } from '@/lib/backupIO';
import { confirmAction } from '@/lib/confirm';
import { formatDateTime } from '@/lib/format';
import { useBackupStore } from '@/store/backup';
import { useDataStore } from '@/store/data';
import { useSettingsStore } from '@/store/settings';
import { Spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';

type Status = { tone: 'ok' | 'error'; text: string } | null;

/**
 * Copia de seguridad local: guarda todos los registros y los ajustes en un
 * archivo que el usuario se lleva (hoja de compartir en móvil, descarga en
 * web) y lo vuelve a leer en cualquier dispositivo. Sin cuenta y sin servidor
 * — es la red de seguridad de quien aún no ha entrado en la nube.
 */
export function BackupCard() {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();

  const settings = useSettingsStore((s) => s.settings);
  const applyImportedSettings = useSettingsStore((s) => s.applyImportedSettings);
  const lastBackupAt = useBackupStore((s) => s.lastBackupAt);
  const markBackedUp = useBackupStore((s) => s.markBackedUp);
  const exportData = useDataStore((s) => s.exportData);
  const importData = useDataStore((s) => s.importData);

  const [mode, setMode] = useState<ImportMode>('merge');
  const [busy, setBusy] = useState<'export' | 'import' | null>(null);
  const [status, setStatus] = useState<Status>(null);

  /** "3 ejercicios · 1 ciclo · 4 series" — cada nombre con su propio plural. */
  const summarize = (counts: BackupCounts) =>
    [
      t('settings.countExercises', { count: counts.exercises }),
      t('settings.countCycles', { count: counts.cycles }),
      t('settings.countSessions', { count: counts.sessions }),
    ].join(' · ');

  const errorText = (error: unknown) =>
    error instanceof BackupError
      ? t(`settings.backupError.${error.code}`)
      : t('settings.backupError.generic');

  async function handleExport() {
    setBusy('export');
    setStatus(null);
    try {
      const backup = createBackup(exportData(), settings);
      const result = await saveTextFile({
        filename: backupFileName(backup.exportedAt),
        contents: serializeBackup(backup),
        dialogTitle: t('settings.exportData'),
      });
      if (result === 'unavailable') {
        setStatus({ tone: 'error', text: t('settings.exportUnavailable') });
        return;
      }
      markBackedUp(backup.exportedAt);
      setStatus({
        tone: 'ok',
        text: t(`settings.exportDone.${result}`, { summary: summarize(countBackup(backup.data)) }),
      });
    } catch (error) {
      setStatus({ tone: 'error', text: errorText(error) });
    } finally {
      setBusy(null);
    }
  }

  function applyImport(backup: BackupFile) {
    importData(backup.data, mode);
    applyImportedSettings(backup.settings);
    setStatus({
      tone: 'ok',
      text: t('settings.importDone', { summary: summarize(countBackup(backup.data)) }),
    });
  }

  async function handleImport() {
    setBusy('import');
    setStatus(null);
    try {
      const file = await pickTextFile();
      if (!file) return;
      const backup = parseBackup(file.contents, settings);
      confirmAction(
        t('settings.importData'),
        t(mode === 'replace' ? 'settings.importConfirmReplace' : 'settings.importConfirmMerge', {
          summary: summarize(countBackup(backup.data)),
          date: formatDateTime(backup.exportedAt, i18n.language),
        }),
        () => applyImport(backup),
        t('settings.importData'),
        t('common.cancel'),
      );
    } catch (error) {
      setStatus({ tone: 'error', text: errorText(error) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card style={{ gap: Spacing.md }}>
      <View>
        <SectionTitle>{t('settings.backup')}</SectionTitle>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
          {t('settings.backupHint')}
        </Text>
      </View>

      <AppButton label={t('settings.exportData')} onPress={handleExport} disabled={busy !== null} />

      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
        {lastBackupAt
          ? t('settings.lastBackup', { date: formatDateTime(lastBackupAt, i18n.language) })
          : t('settings.lastBackupNever')}
      </Text>

      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('settings.importMode')}</Text>
        <SegmentedControl
          options={[
            { value: 'merge' as ImportMode, label: t('settings.importMerge') },
            { value: 'replace' as ImportMode, label: t('settings.importReplace') },
          ]}
          value={mode}
          onChange={setMode}
        />
        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 17 }}>
          {t(mode === 'replace' ? 'settings.importReplaceHint' : 'settings.importMergeHint')}
        </Text>
      </View>

      <AppButton
        label={t('settings.importData')}
        onPress={handleImport}
        variant="secondary"
        disabled={busy !== null}
      />

      {busy ? <ActivityIndicator color={colors.accent} /> : null}

      {status ? (
        <Text
          style={{
            color: status.tone === 'ok' ? colors.textSecondary : colors.danger,
            fontSize: 13,
            lineHeight: 19,
          }}>
          {status.text}
        </Text>
      ) : null}
    </Card>
  );
}
