import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { AppButton, Card, EmptyState, SectionTitle, StatTile } from '@/components/ui';
import {
  CYCLE_END_REPS,
  estimateOneRepMax,
  isCycleEndNear,
  nextWeight,
  projectCycleEnd,
} from '@/lib/bilbo';
import { exerciseName, formatDate, formatWeight } from '@/lib/format';
import {
  selectActiveCycle,
  selectCompletedCycles,
  selectCycleSessions,
  useDataStore,
} from '@/store/data';
import { Spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import type { Cycle, Session } from '@/types/models';

function confirmAction(title: string, message: string, onConfirm: () => void, confirmLabel: string) {
  if (Platform.OS === 'web') {
    // RN-web Alert has no buttons support
    if (globalThis.confirm?.(message)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { style: 'cancel', text: '✕' },
    { style: 'destructive', text: confirmLabel, onPress: onConfirm },
  ]);
}

function ProjectionCard({ cycle, sessions }: { cycle: Cycle; sessions: Session[] }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const unit = t(`common.${cycle.unit}`);

  const last = sessions[sessions.length - 1];
  const projection = projectCycleEnd(
    sessions.map((s) => ({ weight: s.weight, reps: s.reps })),
    cycle.incrementStep,
  );
  const est1rm = last ? estimateOneRepMax(last.weight, last.reps) : null;
  const next = last ? nextWeight(last.weight, cycle.incrementStep) : cycle.startWeight;

  return (
    <Card style={{ gap: Spacing.md }}>
      <SectionTitle>{t('projection.title')}</SectionTitle>
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <StatTile
          label={t('projection.nextWeight')}
          value={`${formatWeight(next)} ${unit}`}
        />
        <StatTile
          label={t('projection.estimatedOneRepMax')}
          value={est1rm ? `≈ ${formatWeight(Math.round(est1rm * 2) / 2)} ${unit}` : '—'}
        />
      </View>
      {projection ? (
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <StatTile
            label={t('projection.cycleEndWeight')}
            value={`≈ ${formatWeight(projection.endWeight)} ${unit}`}
          />
          <StatTile
            label={t('projection.sessionsLeft')}
            value={t('projection.sessionsLeftValue', { count: projection.sessionsLeft })}
          />
        </View>
      ) : (
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          {t('projection.notEnoughData')}
        </Text>
      )}
      {last && isCycleEndNear(last.reps) ? (
        <Text style={{ color: colors.warning, fontSize: 13 }}>{t('cycle.cycleEndNear')}</Text>
      ) : null}
    </Card>
  );
}

function SessionRow({ session, unit }: { session: Session; unit: string }) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const removeSession = useDataStore((s) => s.removeSession);

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        gap: Spacing.sm,
      }}>
      <Text style={{ color: colors.textMuted, fontSize: 12, width: 24 }}>{session.index}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 15, fontWeight: '600' }}>
          {formatWeight(session.weight)} {unit} × {session.reps}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          {formatDate(session.date, i18n.language)}
          {session.notes ? ` · ${session.notes}` : ''}
        </Text>
      </View>
      <Pressable
        hitSlop={8}
        onPress={() =>
          confirmAction(
            t('session.deleteSession'),
            t('session.deleteSessionConfirm'),
            () => removeSession(session.id),
            t('common.delete'),
          )
        }>
        <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const exercise = useDataStore((s) => s.exercises[id]);
  const activeCycle = useDataStore((s) => selectActiveCycle(s, id));
  const sessions = useDataStore(
    useShallow((s) => (activeCycle ? selectCycleSessions(s, activeCycle.id) : [])),
  );
  const completedCycles = useDataStore(useShallow((s) => selectCompletedCycles(s, id)));
  const closeCycle = useDataStore((s) => s.closeCycle);
  const removeExercise = useDataStore((s) => s.removeExercise);

  if (!exercise || exercise.deleted) return null;
  const unit = activeCycle ? t(`common.${activeCycle.unit}`) : t('common.kg');

  return (
    <>
      <Stack.Screen
        options={{
          title: exerciseName(exercise, t),
          headerRight: exercise.isCustom
            ? () => (
                <Pressable
                  hitSlop={8}
                  onPress={() =>
                    confirmAction(
                      t('exercises.deleteExercise'),
                      t('exercises.deleteExerciseConfirm'),
                      () => {
                        removeExercise(exercise.id);
                        router.back();
                      },
                      t('common.delete'),
                    )
                  }>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              )
            : undefined,
        }}
      />
      <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>
        {activeCycle ? (
          <>
            <ProjectionCard cycle={activeCycle} sessions={sessions} />

            <AppButton
              label={`+ ${t('session.logSession')}`}
              onPress={() => router.push(`/session/new?cycleId=${activeCycle.id}`)}
            />

            <Card>
              <SectionTitle>{t('progress.currentCycle')}</SectionTitle>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: Spacing.sm }}>
                {t('cycle.startedOn', { date: formatDate(activeCycle.startDate, i18n.language) })}
                {' · '}
                {formatWeight(activeCycle.startWeight)} {unit} · +
                {formatWeight(activeCycle.incrementStep)} {unit}
              </Text>
              {sessions.length === 0 ? (
                <EmptyState message={t('progress.noData')} />
              ) : (
                [...sessions].reverse().map((session) => (
                  <SessionRow key={session.id} session={session} unit={unit} />
                ))
              )}
            </Card>

            <AppButton
              label={t('cycle.closeCycle')}
              variant="danger"
              onPress={() =>
                confirmAction(
                  t('cycle.closeCycle'),
                  t('cycle.closeCycleConfirm'),
                  () => closeCycle(activeCycle.id),
                  t('common.confirm'),
                )
              }
            />
          </>
        ) : (
          <>
            <EmptyState message={t('exercises.noActiveCycle')} />
            <AppButton
              label={t('cycle.startCycle')}
              onPress={() => router.push(`/cycle/new?exerciseId=${exercise.id}`)}
            />
          </>
        )}

        {completedCycles.length > 0 && (
          <Card>
            <SectionTitle>{t('cycle.history')}</SectionTitle>
            {completedCycles.map((cycle) => (
              <CompletedCycleRow key={cycle.id} cycle={cycle} />
            ))}
          </Card>
        )}
      </ScrollView>
    </>
  );
}

function CompletedCycleRow({ cycle }: { cycle: Cycle }) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const sessions = useDataStore(useShallow((s) => selectCycleSessions(s, cycle.id)));
  const last = sessions[sessions.length - 1];
  const unit = t(`common.${cycle.unit}`);

  return (
    <View style={{ paddingVertical: 10, gap: 2 }}>
      <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
        {formatWeight(cycle.startWeight)} {unit}
        {last ? ` → ${formatWeight(last.weight)} ${unit} × ${last.reps}` : ''}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
        {formatDate(cycle.startDate, i18n.language)}
        {cycle.endDate ? ` — ${formatDate(cycle.endDate, i18n.language)}` : ''}
        {' · '}
        {t('exercises.sessionsCount', { count: sessions.length })}
      </Text>
    </View>
  );
}
