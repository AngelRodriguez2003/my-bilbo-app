import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import {
  AppButton,
  Card,
  Chip,
  Divider,
  EmptyState,
  Enter,
  IconButton,
  ProgressTrack,
  Screen,
  SectionTitle,
  StatTile,
} from '@/components/ui';
import {
  cycleProgress,
  estimateOneRepMax,
  isCycleEndNear,
  nextWeight,
  projectCycleEnd,
} from '@/lib/bilbo';
import { confirmAction } from '@/lib/confirm';
import { exerciseName, formatDate, formatWeight } from '@/lib/format';
import {
  selectActiveCycle,
  selectCompletedCycles,
  selectCycleSessions,
  useDataStore,
} from '@/store/data';
import { Radius, Spacing } from '@/theme/colors';
import { Type } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';
import type { Cycle, Session } from '@/types/models';

/**
 * El bloque que manda en la pantalla: cuánto peso toca la próxima vez. Es el
 * único dato que el usuario necesita de pie delante de la barra.
 */
function NextSetHero({
  cycle,
  sessions,
  onLog,
}: {
  cycle: Cycle;
  sessions: Session[];
  onLog: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const unit = t(`common.${cycle.unit}`);

  const last = sessions[sessions.length - 1];
  const next = last ? nextWeight(last.weight, cycle.incrementStep) : cycle.startWeight;

  return (
    <Card level={2} style={{ gap: Spacing.md, paddingVertical: Spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[Type.label, { color: colors.textMuted }]}>{t('session.nextSet')}</Text>
        <Chip label={t('session.sessionNumber', { index: sessions.length + 1 })} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm }}>
        <Text style={[Type.hero, { color: colors.text }]}>{formatWeight(next)}</Text>
        <Text style={[Type.title, { color: colors.textSecondary }]}>{unit}</Text>
      </View>

      <AppButton label={t('session.logSession')} icon="add" onPress={onLog} />
    </Card>
  );
}

/** Dónde va el ciclo: del peso inicial al peso con el que se espera cerrarlo. */
function CycleProgressCard({ cycle, sessions }: { cycle: Cycle; sessions: Session[] }) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const unit = t(`common.${cycle.unit}`);

  const points = sessions.map((s) => ({ weight: s.weight, reps: s.reps }));
  const projection = projectCycleEnd(points, cycle.incrementStep);
  const progress = cycleProgress(points);
  const last = sessions[sessions.length - 1];

  return (
    <Card style={{ gap: Spacing.sm }}>
      <SectionTitle>{t('cycle.progressTitle')}</SectionTitle>
      <ProgressTrack value={progress} height={9} />
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm }}>
        <Text style={[Type.caption, { color: colors.textSecondary }]}>
          {t('cycle.progressFromTo', {
            from: formatWeight(cycle.startWeight),
            to: formatWeight(projection?.endWeight ?? last?.weight ?? cycle.startWeight),
            unit,
          })}
        </Text>
        <Text style={[Type.caption, { color: colors.textMuted }]}>
          {t('cycle.startedOn', { date: formatDate(cycle.startDate, i18n.language) })}
        </Text>
      </View>
    </Card>
  );
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
      <View style={{ flexDirection: 'row', gap: Spacing.md }}>
        <StatTile
          label={t('projection.nextWeight')}
          value={`${formatWeight(next)} ${unit}`}
          tone="accent"
        />
        <StatTile
          label={t('projection.estimatedOneRepMax')}
          value={est1rm ? `≈ ${formatWeight(Math.round(est1rm * 2) / 2)} ${unit}` : '—'}
        />
      </View>
      {projection ? (
        <>
          <Divider />
          <View style={{ flexDirection: 'row', gap: Spacing.md }}>
            <StatTile
              label={t('projection.cycleEndWeight')}
              value={`≈ ${formatWeight(projection.endWeight)} ${unit}`}
            />
            <StatTile
              label={t('projection.sessionsLeft')}
              value={t('projection.sessionsLeftValue', { count: projection.sessionsLeft })}
            />
          </View>
        </>
      ) : (
        <Text style={[Type.small, { color: colors.textMuted }]}>
          {t('projection.notEnoughData')}
        </Text>
      )}
    </Card>
  );
}

/** Aviso de fin de ciclo: el momento en que el método pide cerrar y reiniciar. */
function CycleEndNotice() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Card tone="accent" level={0} style={{ flexDirection: 'row', gap: Spacing.sm }}>
      <Ionicons name="flag" size={18} color={colors.accent} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[Type.bodyStrong, { color: colors.text }]}>
          {t('cycle.cycleEndNearTitle')}
        </Text>
        <Text style={[Type.small, { color: colors.textSecondary }]}>{t('cycle.cycleEndNear')}</Text>
      </View>
    </Card>
  );
}

function SessionRow({
  session,
  unit,
  maxReps,
}: {
  session: Session;
  unit: string;
  maxReps: number;
}) {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const removeSession = useDataStore((s) => s.removeSession);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 9 }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: Radius.xs,
          backgroundColor: colors.surfaceHigh,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Text style={[Type.caption, { color: colors.textSecondary }]}>{session.index}</Text>
      </View>

      <View style={{ flex: 1, gap: 5 }}>
        <Text style={[Type.bodyStrong, { color: colors.text }]}>
          {formatWeight(session.weight)} {unit} × {session.reps}
        </Text>
        {/* Barra de repeticiones: el descenso del ciclo se ve de un vistazo. */}
        <ProgressTrack value={maxReps > 0 ? session.reps / maxReps : 0} height={4} />
        <Text style={[Type.caption, { color: colors.textMuted }]} numberOfLines={1}>
          {formatDate(session.date, i18n.language)}
          {session.notes ? ` · ${session.notes}` : ''}
        </Text>
      </View>

      <IconButton
        icon="trash-outline"
        size={16}
        accessibilityLabel={t('session.deleteSession')}
        onPress={() =>
          confirmAction(
            t('session.deleteSession'),
            t('session.deleteSessionConfirm'),
            () => removeSession(session.id),
            t('common.delete'),
          )
        }
      />
    </View>
  );
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();
  const { t } = useTranslation();
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
  const last = sessions[sessions.length - 1];
  const maxReps = sessions.reduce((top, session) => Math.max(top, session.reps), 0);

  return (
    <>
      <Stack.Screen
        options={{
          title: exerciseName(exercise, t),
          // También los de ejemplo: si la lista trae uno repetido de otro
          // dispositivo, no poder borrarlo deja al usuario sin salida.
          headerRight: () => (
            <IconButton
              icon="trash-outline"
              size={19}
              color={colors.danger}
              accessibilityLabel={t('exercises.deleteExercise')}
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
              }
            />
          ),
        }}
      />
      <Screen glow>
        {activeCycle ? (
          <>
            <Enter index={0}>
              <NextSetHero
                cycle={activeCycle}
                sessions={sessions}
                onLog={() => router.push(`/session/new?cycleId=${activeCycle.id}`)}
              />
            </Enter>

            {last && isCycleEndNear(last.reps) ? (
              <Enter index={1}>
                <CycleEndNotice />
              </Enter>
            ) : null}

            {sessions.length > 0 ? (
              <Enter index={2}>
                <CycleProgressCard cycle={activeCycle} sessions={sessions} />
              </Enter>
            ) : null}

            <Enter index={3}>
              <ProjectionCard cycle={activeCycle} sessions={sessions} />
            </Enter>

            <Enter index={4}>
              <Card>
                <SectionTitle>{t('progress.currentCycle')}</SectionTitle>
                {sessions.length === 0 ? (
                  <EmptyState
                    icon="flash-outline"
                    title={t('session.emptyTitle')}
                    message={t('session.emptyBody')}
                  />
                ) : (
                  [...sessions]
                    .reverse()
                    .map((session) => (
                      <SessionRow
                        key={session.id}
                        session={session}
                        unit={unit}
                        maxReps={maxReps}
                      />
                    ))
                )}
              </Card>
            </Enter>

            <Enter index={5}>
              {/* Cerrar el ciclo es raro y definitivo: no compite con la acción
                  principal, se queda como texto al final de la pantalla. */}
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
            </Enter>
          </>
        ) : (
          <Enter>
            <Card level={2} style={{ gap: Spacing.md }}>
              <EmptyState
                icon="flame-outline"
                title={t('cycle.noActiveCycleTitle')}
                message={t('cycle.noActiveCycleBody')}
              />
              <AppButton
                label={t('cycle.startCycle')}
                icon="play"
                onPress={() => router.push(`/cycle/new?exerciseId=${exercise.id}`)}
              />
            </Card>
          </Enter>
        )}

        {completedCycles.length > 0 && (
          <Enter index={6}>
            <Card level={0} tone="sunken">
              <SectionTitle>{t('cycle.history')}</SectionTitle>
              {completedCycles.map((cycle, index) => (
                <View key={cycle.id}>
                  {index > 0 ? <Divider /> : null}
                  <CompletedCycleRow cycle={cycle} />
                </View>
              ))}
            </Card>
          </Enter>
        )}
      </Screen>
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
    <View style={{ paddingVertical: 11, gap: 3 }}>
      <Text style={[Type.bodyStrong, { color: colors.text }]}>
        {formatWeight(cycle.startWeight)} {unit}
        {last ? ` → ${formatWeight(last.weight)} ${unit} × ${last.reps}` : ''}
      </Text>
      <Text style={[Type.caption, { color: colors.textMuted }]}>
        {formatDate(cycle.startDate, i18n.language)}
        {cycle.endDate ? ` — ${formatDate(cycle.endDate, i18n.language)}` : ''}
        {' · '}
        {t('exercises.sessionsCount', { count: sessions.length })}
      </Text>
    </View>
  );
}
