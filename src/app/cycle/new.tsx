import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import {
  AppButton,
  Card,
  Chip,
  Enter,
  Field,
  Screen,
  SectionTitle,
  SegmentedControl,
} from '@/components/ui';
import { estimateOneRepMax, startWeightFromOneRepMax } from '@/lib/bilbo';
import { exerciseName, formatWeight, parseDecimal } from '@/lib/format';
import { useDataStore } from '@/store/data';
import { useSettingsStore } from '@/store/settings';
import { Motion, Radius, Spacing } from '@/theme/colors';
import { Type } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';
import type { Unit } from '@/types/models';

type Mode = '1rm' | 'manual';

export default function NewCycleScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const { t } = useTranslation();

  const defaults = useSettingsStore((s) => s.settings);
  const startCycle = useDataStore((s) => s.startCycle);
  const exercise = useDataStore((s) => s.exercises[exerciseId]);

  const [mode, setMode] = useState<Mode>('1rm');
  const [unit, setUnit] = useState<Unit>(defaults.defaultUnit);
  const [oneRepMaxRaw, setOneRepMaxRaw] = useState('');
  const [startWeightRaw, setStartWeightRaw] = useState('');
  const [incrementRaw, setIncrementRaw] = useState(String(defaults.defaultIncrement));

  // Optional Epley calculator: estimate 1RM from a recent set (weight × reps).
  const [showCalc, setShowCalc] = useState(false);
  const [calcWeightRaw, setCalcWeightRaw] = useState('');
  const [calcRepsRaw, setCalcRepsRaw] = useState('');
  const calcWeight = parseDecimal(calcWeightRaw);
  const calcReps = parseDecimal(calcRepsRaw);
  const estimated =
    calcWeight && calcReps ? Math.round(estimateOneRepMax(calcWeight, calcReps) * 2) / 2 : null;

  const increment = parseDecimal(incrementRaw);
  const oneRepMax = parseDecimal(oneRepMaxRaw);
  const suggested =
    mode === '1rm' && oneRepMax && increment
      ? startWeightFromOneRepMax(oneRepMax, increment)
      : null;
  const manualWeight = parseDecimal(startWeightRaw);

  // In 1RM mode the user may still override the suggested weight.
  const startWeight = mode === '1rm' ? (manualWeight ?? suggested) : manualWeight;
  const canSubmit = Boolean(exerciseId && startWeight && increment);

  const submit = () => {
    if (!canSubmit || !startWeight || !increment) return;
    startCycle({
      exerciseId,
      unit,
      startWeight,
      incrementStep: increment,
      oneRepMax: mode === '1rm' ? (oneRepMax ?? undefined) : undefined,
    });
    // dismissTo pops the modal back to the existing exercise detail (single
    // instance → single back), and navigates there if it isn't in the stack
    // (deep-link case) without leaving a GO_BACK behind.
    router.dismissTo(`/exercise/${exerciseId}`);
  };

  const unitLabel = t(`common.${unit}`);

  return (
    <Screen>
      {exercise ? (
        <Stack.Screen
          options={{ title: `${t('cycle.newCycle')} · ${exerciseName(exercise, t)}` }}
        />
      ) : null}

      {exercise ? (
        <Enter index={0}>
          <View style={{ gap: Spacing.xs }}>
            <Text style={[Type.label, { color: colors.textMuted }]}>{t('tabs.exercises')}</Text>
            <Text style={[Type.title, { color: colors.text }]}>{exerciseName(exercise, t)}</Text>
          </View>
        </Enter>
      ) : null}

      <Enter index={1}>
        <SegmentedControl
          options={[
            { value: '1rm' as Mode, label: t('cycle.fromOneRepMax') },
            { value: 'manual' as Mode, label: t('cycle.manualWeight') },
          ]}
          value={mode}
          onChange={setMode}
        />
      </Enter>

      {/* Sin <Enter>: dentro va el campo con autoFocus y la animación de
          entrada se lo lleva por delante. */}
      <Card level={2} style={{ gap: Spacing.md }}>
        {mode === '1rm' ? (
          <>
            <Field
              label={t('cycle.oneRepMax', { unit: unitLabel })}
              value={oneRepMaxRaw}
              onChangeText={setOneRepMaxRaw}
              keyboardType="decimal-pad"
              autoFocus
              error={
                oneRepMaxRaw.trim() !== '' && !oneRepMax ? t('common.invalidNumber') : undefined
              }
            />
            {suggested !== null && (
              <Animated.View entering={FadeIn.duration(Motion.base)}>
                <Chip
                  icon="sparkles-outline"
                  tone="accent"
                  label={`${t('cycle.suggestedStart')}: ${formatWeight(suggested)} ${unitLabel}`}
                />
              </Animated.View>
            )}

            <AppButton
              label={t('cycle.calc1rm')}
              variant="ghost"
              icon={showCalc ? 'chevron-up' : 'calculator-outline'}
              onPress={() => setShowCalc((open) => !open)}
            />
            {showCalc && (
              <Animated.View
                entering={FadeIn.duration(Motion.base)}
                exiting={FadeOut.duration(Motion.fast)}
                style={{
                  gap: Spacing.sm,
                  padding: Spacing.md,
                  borderRadius: Radius.md,
                  backgroundColor: colors.surfaceHigh,
                }}>
                <Text style={[Type.caption, { color: colors.textMuted }]}>
                  {t('cycle.calc1rmHint')}
                </Text>
                <Field
                  label={t('cycle.calcWeight', { unit: unitLabel })}
                  value={calcWeightRaw}
                  onChangeText={setCalcWeightRaw}
                  keyboardType="decimal-pad"
                />
                <Field
                  label={t('cycle.calcReps')}
                  value={calcRepsRaw}
                  onChangeText={setCalcRepsRaw}
                  keyboardType="number-pad"
                />
                {estimated !== null && (
                  <>
                    <View style={{ gap: 2 }}>
                      <Text style={[Type.label, { color: colors.textMuted }]}>
                        {t('cycle.estimatedOneRepMax')}
                      </Text>
                      <Text style={[Type.stat, { color: colors.text }]}>
                        {formatWeight(estimated)} {unitLabel}
                      </Text>
                    </View>
                    <AppButton
                      label={t('cycle.useEstimate', {
                        value: formatWeight(estimated),
                        unit: unitLabel,
                      })}
                      variant="secondary"
                      onPress={() => {
                        setOneRepMaxRaw(String(estimated));
                        setShowCalc(false);
                      }}
                    />
                  </>
                )}
              </Animated.View>
            )}

            <Field
              label={t('cycle.startWeight', { unit: unitLabel })}
              value={startWeightRaw}
              onChangeText={setStartWeightRaw}
              keyboardType="decimal-pad"
              placeholder={suggested !== null ? formatWeight(suggested) : undefined}
            />
          </>
        ) : (
          <Field
            label={t('cycle.startWeight', { unit: unitLabel })}
            value={startWeightRaw}
            onChangeText={setStartWeightRaw}
            keyboardType="decimal-pad"
            autoFocus
            error={
              startWeightRaw.trim() !== '' && !manualWeight
                ? t('common.invalidNumber')
                : undefined
            }
          />
        )}

        <Field
          label={t('cycle.increment', { unit: unitLabel })}
          value={incrementRaw}
          onChangeText={setIncrementRaw}
          keyboardType="decimal-pad"
        error={incrementRaw.trim() !== '' && !increment ? t('common.invalidNumber') : undefined}
        />
      </Card>

      <Enter index={3}>
        <Card style={{ gap: Spacing.sm }}>
          <SectionTitle>{t('cycle.unit')}</SectionTitle>
          <SegmentedControl
            options={[
              { value: 'kg' as Unit, label: t('common.kg') },
              { value: 'lb' as Unit, label: t('common.lb') },
            ]}
            value={unit}
            onChange={setUnit}
          />
        </Card>
      </Enter>

      <Enter index={4}>
        <AppButton
          label={t('cycle.startCycle')}
          icon="play"
          onPress={submit}
          disabled={!canSubmit}
        />
      </Enter>
    </Screen>
  );
}
