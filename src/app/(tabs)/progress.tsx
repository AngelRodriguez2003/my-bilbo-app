import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { LineChart } from '@/components/LineChart';
import {
  Card,
  Chip,
  ChipSelector,
  Divider,
  EmptyState,
  Enter,
  Screen,
  SectionTitle,
  SegmentedControl,
  StatTile,
} from '@/components/ui';
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
import { Type } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

type Metric = 'reps' | 'weight';

export default function ProgressScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const exercises = useDataStore(useShallow(selectVisibleExercises));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [metric, setMetric] = useState<Metric>('reps');

  // Si el ejercicio elegido ya no está —borrado aquí o desde otro dispositivo—
  // la selección vuelve al primero en vez de dejar la pantalla en blanco.
  const exerciseId =
    selectedId && exercises.some((exercise) => exercise.id === selectedId)
      ? selectedId
      : exercises[0]?.id;

  const activeCycle = useDataStore((s) =>
    exerciseId ? selectActiveCycle(s, exerciseId) : undefined,
  );
  const completedCycles = useDataStore(
    useShallow((s) => (exerciseId ? selectCompletedCycles(s, exerciseId) : [])),
  );
  // Chart the active cycle, falling back to the most recent completed one.
  const cycle = activeCycle ?? completedCycles[0];
  const sessions = useDataStore(useShallow((s) => (cycle ? selectCycleSessions(s, cycle.id) : [])));

  const points = useMemo(
    () => sessions.map((s) => ({ x: s.index, y: metric === 'reps' ? s.reps : s.weight })),
    [sessions, metric],
  );

  const heaviest = useMemo(
    () =>
      sessions.reduce<(typeof sessions)[number] | undefined>(
        (best, session) => (!best || session.weight > best.weight ? session : best),
        undefined,
      ),
    [sessions],
  );

  const unit = cycle ? t(`common.${cycle.unit}`) : '';

  return (
    <Screen glow gap={Spacing.lg}>
      <Enter index={0}>
        <View style={{ gap: Spacing.sm }}>
          <Text style={[Type.label, { color: colors.textMuted }]}>
            {t('progress.selectExercise')}
          </Text>
          <ChipSelector
            options={exercises.map((exercise) => ({
              value: exercise.id,
              label: exerciseName(exercise, t),
            }))}
            value={exerciseId ?? ''}
            onChange={setSelectedId}
          />
        </View>
      </Enter>

      <Enter index={1}>
        <SegmentedControl
          options={[
            { value: 'reps' as Metric, label: t('progress.reps') },
            { value: 'weight' as Metric, label: t('progress.weight') },
          ]}
          value={metric}
          onChange={setMetric}
        />
      </Enter>

      <Enter index={2}>
        <Card level={2} style={{ gap: Spacing.sm }}>
          <SectionTitle
            action={
              cycle && sessions.length > 0 ? (
                <Chip
                  tone={activeCycle ? 'accent' : 'neutral'}
                  label={activeCycle ? t('progress.currentCycle') : t('cycle.cycleCompleted')}
                />
              ) : undefined
            }>
            {metric === 'reps' ? t('progress.repsPerSession') : t('progress.weightPerSession')}
          </SectionTitle>

          {points.length === 0 ? (
            <EmptyState
              icon="analytics-outline"
              title={t('progress.emptyTitle')}
              message={t('progress.noData')}
            />
          ) : (
            <>
              <LineChart
                points={points}
                // La línea de las 15 reps solo tiene sentido en el eje de reps.
                targetY={metric === 'reps' ? CYCLE_END_REPS : undefined}
                targetLabel={metric === 'reps' ? t('progress.cycleEndTarget') : undefined}
              />
              <Divider style={{ marginVertical: Spacing.xs }} />
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <StatTile label={t('progress.sessions')} value={String(sessions.length)} />
                {heaviest ? (
                  <StatTile
                    label={t('progress.bestSet')}
                    value={`${formatWeight(heaviest.weight)} ${unit} × ${heaviest.reps}`}
                    tone="accent"
                  />
                ) : null}
              </View>
              {cycle ? (
                <Text style={[Type.caption, { color: colors.textMuted }]}>
                  {t('cycle.progressFromTo', {
                    from: formatWeight(cycle.startWeight),
                    to: formatWeight(sessions[sessions.length - 1].weight),
                    unit,
                  })}
                </Text>
              ) : null}
            </>
          )}
        </Card>
      </Enter>
    </Screen>
  );
}
