import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { AppButton, Card, Chip, Enter, Field, Screen } from '@/components/ui';
import { nextWeight } from '@/lib/bilbo';
import { formatWeight, parseDecimal } from '@/lib/format';
import { selectCycleSessions, useDataStore } from '@/store/data';
import { Spacing } from '@/theme/colors';
import { Type } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

export default function NewSessionScreen() {
  const { cycleId } = useLocalSearchParams<{ cycleId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const cycle = useDataStore((s) => s.cycles[cycleId]);
  const sessions = useDataStore(useShallow((s) => selectCycleSessions(s, cycleId)));
  const logSession = useDataStore((s) => s.logSession);

  const last = sessions[sessions.length - 1];
  const suggested = cycle
    ? last
      ? nextWeight(last.weight, cycle.incrementStep)
      : cycle.startWeight
    : 0;

  const [weightRaw, setWeightRaw] = useState(formatWeight(suggested));
  const [repsRaw, setRepsRaw] = useState('');
  const [notes, setNotes] = useState('');

  if (!cycle) return null;
  const unitLabel = t(`common.${cycle.unit}`);

  const weight = parseDecimal(weightRaw);
  const reps = parseDecimal(repsRaw);
  const canSubmit = Boolean(weight && reps && Number.isInteger(reps));

  const submit = () => {
    if (!weight || !reps) return;
    logSession({ cycleId, weight, reps, notes });
    // dismissTo pops the modal back to the existing exercise detail (single
    // instance → single back), and navigates there if it isn't in the stack
    // (deep-link case) without leaving a GO_BACK behind.
    router.dismissTo(`/exercise/${cycle.exerciseId}`);
  };

  return (
    <Screen>
      {/* Sin <Enter>: dentro va el campo con autoFocus y la animación de
          entrada se lo lleva por delante. */}
      <Card level={2} style={{ gap: Spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: Spacing.sm,
          }}>
          <Chip label={t('session.sessionNumber', { index: sessions.length + 1 })} tone="accent" />
          <Text style={[Type.caption, { color: colors.textMuted }]}>
            {t('session.suggestedWeight')}: {formatWeight(suggested)} {unitLabel}
          </Text>
        </View>

        <Field
          label={t('session.weight', { unit: unitLabel })}
          value={weightRaw}
          onChangeText={setWeightRaw}
          keyboardType="decimal-pad"
          error={weightRaw.trim() !== '' && !weight ? t('common.invalidNumber') : undefined}
        />
        <Field
          label={t('session.reps')}
          value={repsRaw}
          onChangeText={setRepsRaw}
          keyboardType="number-pad"
          autoFocus
          error={
            repsRaw.trim() !== '' && (!reps || !Number.isInteger(reps))
              ? t('common.invalidNumber')
              : undefined
          }
        />
        <Field label={t('session.notes')} value={notes} onChangeText={setNotes} multiline />
      </Card>

      <Enter index={1}>
        <AppButton
          label={t('session.save')}
          icon="checkmark"
          onPress={submit}
          disabled={!canSubmit}
        />
      </Enter>
    </Screen>
  );
}
