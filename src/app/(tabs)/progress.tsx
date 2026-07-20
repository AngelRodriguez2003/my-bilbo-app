import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { LineChart } from '@/components/LineChart';
import { Card, EmptyState, SectionTitle, SegmentedControl } from '@/components/ui';
import { CYCLE_END_REPS } from '@/lib/bilbo';
import { exerciseName, formatWeight } from '@/lib/format';
import {
  selectActiveCycle,
  selectCompletedCycles,
  selectCycleSessions,
  selectVisibleExercises,
  useDataStore,
} from '@/store/data';
import { Spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';

type Metric = 'reps' | 'weight';

export default function ProgressScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const exercises = useDataStore(useShallow(selectVisibleExercises));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('reps');

  const exerciseId = selectedId ?? exercises[0]?.id;
  const activeCycle = useDataStore((s) => (exerciseId ? selectActiveCycle(s, exerciseId) : undefined));
  const completedCycles = useDataStore(
    useShallow((s) => (exerciseId ? selectCompletedCycles(s, exerciseId) : [])),
  );
  // Chart the active cycle, falling back to the most recent completed one.
  const cycle = activeCycle ?? completedCycles[0];
  const sessions = useDataStore(
    useShallow((s) => (cycle ? selectCycleSessions(s, cycle.id) : [])),
  );

  const points = useMemo(
    () =>
      sessions.map((s) => ({
        x: s.index,
        y: metric === 'reps' ? s.reps : s.weight,
      })),
    [sessions, metric],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>
      <View style={{ gap: 6 }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
          {t('progress.selectExercise')}
        </Text>
        <SegmentedControl
          options={exercises.map((e) => ({ value: e.id, label: exerciseName(e, t) }))}
          value={exerciseId ?? ''}
          onChange={setSelectedId}
        />
      </View>

      <SegmentedControl
        options={[
          { value: 'reps' as Metric, label: t('progress.reps') },
          { value: 'weight' as Metric, label: t('progress.weight') },
        ]}
        value={metric}
        onChange={setMetric}
      />

      <Card>
        <SectionTitle>
          {metric === 'reps' ? t('progress.repsPerSession') : t('progress.weightPerSession')}
        </SectionTitle>
        {points.length === 0 ? (
          <EmptyState message={t('progress.noData')} />
        ) : (
          <LineChart
            points={points}
            targetY={metric === 'reps' ? CYCLE_END_REPS : undefined}
          />
        )}
        {cycle && sessions.length > 0 ? (
          <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: Spacing.sm }}>
            {activeCycle ? t('progress.currentCycle') : t('cycle.cycleCompleted')}
            {' · '}
            {formatWeight(cycle.startWeight)} {t(`common.${cycle.unit}`)} →{' '}
            {formatWeight(sessions[sessions.length - 1].weight)} {t(`common.${cycle.unit}`)}
          </Text>
        ) : null}
      </Card>
    </ScrollView>
  );
}
