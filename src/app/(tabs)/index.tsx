import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { AppButton, Card, EmptyState, Field } from '@/components/ui';
import { formatWeight } from '@/lib/format';
import { exerciseName } from '@/lib/format';
import {
  selectActiveCycle,
  selectCycleSessions,
  selectVisibleExercises,
  useDataStore,
} from '@/store/data';
import { Spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';
import type { Exercise } from '@/types/models';

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();

  const activeCycle = useDataStore((s) => selectActiveCycle(s, exercise.id));
  const lastSession = useDataStore((s) => {
    if (!activeCycle) return undefined;
    const sessions = selectCycleSessions(s, activeCycle.id);
    return sessions[sessions.length - 1];
  });

  return (
    <Pressable onPress={() => router.push(`/exercise/${exercise.id}`)}>
      <Card
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <View style={{ gap: 4, flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
            {exerciseName(exercise, t)}
          </Text>
          {activeCycle ? (
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              {lastSession
                ? t('exercises.lastSession', {
                    weight: formatWeight(lastSession.weight),
                    unit: t(`common.${activeCycle.unit}`),
                    reps: lastSession.reps,
                  })
                : t('exercises.activeCycle')}
            </Text>
          ) : (
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              {t('exercises.noActiveCycle')}
            </Text>
          )}
        </View>
        {activeCycle ? (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.success,
              marginRight: 4,
            }}
          />
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </Card>
    </Pressable>
  );
}

export default function ExercisesScreen() {
  const { t } = useTranslation();
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

  return (
    <FlatList
      data={exercises}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <ExerciseRow exercise={item} />}
      contentContainerStyle={{ padding: Spacing.md, gap: Spacing.sm }}
      ListEmptyComponent={<EmptyState message={t('progress.noData')} />}
      ListFooterComponent={
        <View style={{ marginTop: Spacing.sm, gap: Spacing.sm }}>
          {adding ? (
            <Card style={{ gap: Spacing.sm }}>
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
                  onPress={() => setAdding(false)}
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
              label={`+ ${t('exercises.addExercise')}`}
              variant="secondary"
              onPress={() => setAdding(true)}
            />
          )}
        </View>
      }
    />
  );
}
