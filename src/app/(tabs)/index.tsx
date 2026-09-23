import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import {
  AppButton,
  Card,
  Chip,
  CONTENT_MAX,
  EmptyState,
  Enter,
  Field,
  Glow,
  IconButton,
  PressableScale,
  ProgressTrack,
  SkeletonList,
  StatusDot,
} from '@/components/ui';
import { cycleProgress } from '@/lib/bilbo';
import { confirmAction } from '@/lib/confirm';
import { exerciseName, formatWeight } from '@/lib/format';
import { useHydrated } from '@/lib/useHydrated';
import {
  selectActiveCycle,
  selectCycleSessions,
  selectVisibleExercises,
  useDataStore,
} from '@/store/data';
import { Spacing } from '@/theme/colors';
import { Type } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';
import type { Exercise } from '@/types/models';

/** Lado del botón de borrar y ancho del galón: la fila les reserva su hueco. */
const ACTION_SIZE = 32;
const CHEVRON_SIZE = 17;

function ExerciseRow({ exercise, index }: { exercise: Exercise; index: number }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const activeCycle = useDataStore((s) => selectActiveCycle(s, exercise.id));
  const sessions = useDataStore(
    useShallow((s) => (activeCycle ? selectCycleSessions(s, activeCycle.id) : [])),
  );
  const removeExercise = useDataStore((s) => s.removeExercise);

  const lastSession = sessions[sessions.length - 1];
  const progress = cycleProgress(sessions.map((s) => ({ weight: s.weight, reps: s.reps })));

  const confirmRemove = () =>
    confirmAction(
      t('exercises.deleteExercise'),
      t('exercises.deleteExerciseConfirm'),
      () => removeExercise(exercise.id),
      t('common.delete'),
    );

  return (
    <Enter index={index}>
      {/* El botón de borrar es hermano de la tarjeta, no hijo: anidarlo dentro
          de otro pulsable produce un <button> dentro de otro en web —HTML
          inválido— y deja el icono sin foco propio de teclado. Va colocado
          encima del hueco que le reserva la fila. */}
      <View>
        <PressableScale
          onPress={() => router.push(`/exercise/${exercise.id}`)}
          accessibilityLabel={exerciseName(exercise, t)}
          scaleTo={0.985}>
          <Card style={{ gap: Spacing.sm }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: Spacing.sm,
                minHeight: ACTION_SIZE,
              }}>
              {activeCycle ? <StatusDot color={colors.success} pulsing /> : null}
              <Text style={[Type.heading, { color: colors.text, flex: 1 }]} numberOfLines={1}>
                {exerciseName(exercise, t)}
              </Text>
              <View style={{ width: ACTION_SIZE }} />
              <Ionicons name="chevron-forward" size={CHEVRON_SIZE} color={colors.textMuted} />
            </View>

            <Text
              style={[Type.small, { color: activeCycle ? colors.textSecondary : colors.textMuted }]}>
              {activeCycle
                ? lastSession
                  ? t('exercises.lastSession', {
                      weight: formatWeight(lastSession.weight),
                      unit: t(`common.${activeCycle.unit}`),
                      reps: lastSession.reps,
                    })
                  : t('exercises.activeCycle')
                : t('exercises.noActiveCycle')}
            </Text>

            {activeCycle && sessions.length > 0 ? (
              <View style={{ gap: 6 }}>
                <ProgressTrack value={progress} />
                <Text style={[Type.caption, { color: colors.textMuted }]}>
                  {t('exercises.sessionsCount', { count: sessions.length })}
                </Text>
              </View>
            ) : null}
          </Card>
        </PressableScale>

        <View
          style={{
            position: 'absolute',
            top: Spacing.md,
            right: Spacing.md + CHEVRON_SIZE + Spacing.sm,
            width: ACTION_SIZE,
            height: ACTION_SIZE,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <IconButton
            icon="trash-outline"
            accessibilityLabel={t('exercises.deleteExercise')}
            onPress={confirmRemove}
          />
        </View>
      </View>
    </Enter>
  );
}

/** Resumen de la lista: cuántos ciclos hay vivos ahora mismo. */
function ListHeader({ exercises }: { exercises: Exercise[] }) {
  const { t } = useTranslation();
  const activeCount = useDataStore(
    (s) => exercises.filter((exercise) => selectActiveCycle(s, exercise.id)).length,
  );

  if (exercises.length === 0) return null;

  return (
    <Enter>
      <View style={{ flexDirection: 'row', gap: Spacing.sm, paddingBottom: Spacing.xs }}>
        <Chip
          icon={activeCount > 0 ? 'flame' : 'moon-outline'}
          tone={activeCount > 0 ? 'accent' : 'neutral'}
          label={
            activeCount > 0
              ? t('exercises.activeCount', { count: activeCount })
              : t('exercises.noneActive')
          }
        />
      </View>
    </Enter>
  );
}

export default function ExercisesScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const hydrated = useHydrated(useDataStore);
  const exercises = useDataStore(useShallow(selectVisibleExercises));
  const addExercise = useDataStore((s) => s.addExercise);

  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');

  const submitNew = () => {
    if (!name.trim()) return;
    addExercise(name);
    setName('');
    setAdding(false);
  };

  // Sin <Enter>: el campo lleva autoFocus y la animación de entrada lo dejaría
  // sin foco (y sin teclado) justo cuando el usuario va a escribir.
  const addForm = adding ? (
    <Card style={{ gap: Spacing.md }} level={2}>
      <Field
        label={t('exercises.exerciseName')}
        value={name}
        onChangeText={setName}
        autoFocus
        onSubmitEditing={submitNew}
        returnKeyType="done"
      />
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        <AppButton
          label={t('common.cancel')}
          variant="secondary"
          onPress={() => {
            setName('');
            setAdding(false);
          }}
          style={{ flex: 1 }}
        />
        <AppButton
          label={t('common.add')}
          onPress={submitNew}
          disabled={!name.trim()}
          style={{ flex: 1 }}
        />
      </View>
    </Card>
  ) : (
    <AppButton
      label={t('exercises.addExercise')}
      icon="add"
      variant="secondary"
      onPress={() => setAdding(true)}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Glow height={260} />
      {hydrated ? (
        <FlatList
          style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center' }}
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <ExerciseRow exercise={item} index={index} />}
          contentContainerStyle={{
            paddingHorizontal: Spacing.gutter,
            paddingTop: Spacing.md,
            paddingBottom: Spacing.xxl,
            gap: Spacing.sm,
          }}
          ListHeaderComponent={<ListHeader exercises={exercises} />}
          ListEmptyComponent={
            <EmptyState
              icon="barbell-outline"
              title={t('exercises.emptyTitle')}
              message={t('exercises.emptyBody')}
            />
          }
          ListFooterComponent={
            <View style={{ marginTop: Spacing.md }}>{addForm}</View>
          }
        />
      ) : (
        <View
          style={{
            width: '100%',
            maxWidth: CONTENT_MAX,
            alignSelf: 'center',
            paddingHorizontal: Spacing.gutter,
            paddingTop: Spacing.md,
          }}>
          <SkeletonList />
        </View>
      )}
    </View>
  );
}
