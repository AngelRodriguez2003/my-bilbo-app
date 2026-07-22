import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { AppButton, Card, Field } from '@/components/ui';
import { nextWeight } from '@/lib/bilbo';
import { formatWeight, parseDecimal } from '@/lib/format';
import { selectCycleSessions, useDataStore } from '@/store/data';
import { Spacing } from '@/theme/colors';
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
    <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>
      <Card style={{ gap: Spacing.md }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {t('session.sessionNumber', { index: sessions.length + 1 })}
          {' · '}
          {t('session.suggestedWeight')}: {formatWeight(suggested)} {unitLabel}
        </Text>
        <Field
          label={t('session.weight', { unit: unitLabel })}
          value={weightRaw}
          onChangeText={setWeightRaw}
          keyboardType="decimal-pad"
        />
        <Field
          label={t('session.reps')}
          value={repsRaw}
          onChangeText={setRepsRaw}
          keyboardType="number-pad"
          autoFocus
        />
        <Field
          label={t('session.notes')}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </Card>
      <AppButton label={t('session.save')} onPress={submit} disabled={!canSubmit} />
    </ScrollView>
  );
}
