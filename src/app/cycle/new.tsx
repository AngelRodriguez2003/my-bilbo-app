import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { AppButton, Card, Field, SegmentedControl } from '@/components/ui';
import { estimateOneRepMax, startWeightFromOneRepMax } from '@/lib/bilbo';
import { formatWeight, parseDecimal } from '@/lib/format';
import { useDataStore } from '@/store/data';
import { useSettingsStore } from '@/store/settings';
import { Spacing } from '@/theme/colors';
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
    router.back();
  };

  const unitLabel = t(`common.${unit}`);

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>
      <SegmentedControl
        options={[
          { value: '1rm' as Mode, label: t('cycle.fromOneRepMax') },
          { value: 'manual' as Mode, label: t('cycle.manualWeight') },
        ]}
        value={mode}
        onChange={setMode}
      />

      <Card style={{ gap: Spacing.md }}>
        {mode === '1rm' ? (
          <>
            <Field
              label={t('cycle.oneRepMax', { unit: unitLabel })}
              value={oneRepMaxRaw}
              onChangeText={setOneRepMaxRaw}
              keyboardType="decimal-pad"
              autoFocus
            />
            {suggested !== null && (
              <Text style={{ color: colors.accent, fontSize: 13 }}>
                {t('cycle.suggestedStart')}: {formatWeight(suggested)} {unitLabel}
              </Text>
            )}

            <Pressable onPress={() => setShowCalc((v) => !v)} hitSlop={6}>
              <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '600' }}>
                {showCalc ? '−' : '+'} {t('cycle.calc1rm')}
              </Text>
            </Pressable>
            {showCalc && (
              <View
                style={{
                  gap: Spacing.sm,
                  padding: Spacing.md,
                  borderRadius: 12,
                  backgroundColor: colors.surfaceHigh,
                }}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
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
                    <Text style={{ color: colors.text, fontSize: 14 }}>
                      {t('cycle.estimatedOneRepMax')}: {formatWeight(estimated)} {unitLabel}
                    </Text>
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
              </View>
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
          />
        )}

        <Field
          label={t('cycle.increment', { unit: unitLabel })}
          value={incrementRaw}
          onChangeText={setIncrementRaw}
          keyboardType="decimal-pad"
        />

        <View style={{ gap: 6 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{t('cycle.unit')}</Text>
          <SegmentedControl
            options={[
              { value: 'kg' as Unit, label: t('common.kg') },
              { value: 'lb' as Unit, label: t('common.lb') },
            ]}
            value={unit}
            onChange={setUnit}
          />
        </View>
      </Card>

      <AppButton label={t('cycle.startCycle')} onPress={submit} disabled={!canSubmit} />
    </ScrollView>
  );
}
