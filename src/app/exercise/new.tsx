import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { ExerciseThumb } from '@/components/ExerciseThumb';
import {
  Chip,
  ChipSelector,
  CONTENT_MAX,
  EmptyState,
  Field,
  PressableScale,
} from '@/components/ui';
import {
  catalogIdOf,
  equipmentLabelKey,
  groupLabelKey,
  MUSCLE_GROUPS,
  muscleLabelKey,
  searchCatalog,
  type CatalogExercise,
  type MuscleGroup,
} from '@/lib/catalog';
import { selectVisibleExercises, useDataStore } from '@/store/data';
import { Radius, Spacing } from '@/theme/colors';
import { Type } from '@/theme/typography';
import { useTheme } from '@/theme/ThemeContext';

type GroupFilter = MuscleGroup | 'all';

const THUMB_SIZE = 60;
/** Alto fijo de fila: deja a la lista calcular posiciones sin medir 736 filas. */
const ROW_HEIGHT = THUMB_SIZE + Spacing.sm * 2 + 4;

function CatalogRow({
  entry,
  added,
  onPress,
}: {
  entry: CatalogExercise;
  added: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const details = [
    ...entry.muscles.map((muscle) => t(muscleLabelKey(muscle))),
    ...(entry.equipment ? [t(equipmentLabelKey(entry.equipment))] : []),
  ].join(' · ');

  return (
    <PressableScale
      onPress={onPress}
      disabled={added}
      scaleTo={0.985}
      accessibilityLabel={`${entry.name}, ${details}`}>
      <View
        style={{
          height: ROW_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        }}>
        <ExerciseThumb catalogId={entry.id} size={THUMB_SIZE} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[Type.bodyStrong, { color: colors.text }]} numberOfLines={2}>
            {entry.name}
          </Text>
          <Text style={[Type.caption, { color: colors.textMuted }]} numberOfLines={1}>
            {details}
          </Text>
        </View>
        {added ? (
          // El Chip se alinea arriba por su cuenta; el envoltorio lo centra.
          <View>
            <Chip label={t('catalog.added')} icon="checkmark" tone="success" />
          </View>
        ) : (
          <Ionicons name="add-circle" size={26} color={colors.accent} />
        )}
      </View>
    </PressableScale>
  );
}

/** Salida para lo que no está en el catálogo: se añade con el nombre escrito. */
function CustomRow({ name, onPress }: { name: string; onPress: () => void }) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.985}
      accessibilityLabel={t('catalog.createCustom', { name })}>
      <View
        style={{
          height: ROW_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.md,
        }}>
        <View
          style={{
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: Radius.md,
            backgroundColor: colors.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          <Ionicons name="create-outline" size={24} color={colors.accent} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[Type.bodyStrong, { color: colors.accent }]} numberOfLines={2}>
            {t('catalog.createCustom', { name })}
          </Text>
          <Text style={[Type.caption, { color: colors.textMuted }]}>
            {t('catalog.createCustomHint')}
          </Text>
        </View>
      </View>
    </PressableScale>
  );
}

export default function NewExerciseScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const list = useRef<FlatList<CatalogExercise>>(null);

  const addExercise = useDataStore((s) => s.addExercise);
  const exercises = useDataStore(useShallow(selectVisibleExercises));

  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<GroupFilter>('all');

  const results = useMemo(() => searchCatalog(query, group), [query, group]);
  // Lo que ya está en la lista se marca en vez de ocultarse: si desapareciera,
  // parecería que el catálogo no lo tiene.
  const added = useMemo(() => new Set(exercises.map(catalogIdOf)), [exercises]);
  const customName = query.trim();

  // En web el modal es una ruta más: si se entró directo por URL no hay a
  // dónde volver y hay que ir a la lista explícitamente.
  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const pick = (entry: CatalogExercise) => {
    addExercise(entry.name, entry.id);
    close();
  };

  const createCustom = () => {
    if (!customName) return;
    addExercise(customName);
    close();
  };

  // Un filtro nuevo es una lista nueva: se empieza por arriba, no a media
  // altura de la anterior.
  const scrollToTop = () => list.current?.scrollToOffset({ offset: 0, animated: false });

  const groupOptions = [
    { value: 'all' as const, label: t('catalog.groups.all') },
    ...MUSCLE_GROUPS.map((value) => ({ value, label: t(groupLabelKey(value)) })),
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ width: '100%', maxWidth: CONTENT_MAX, alignSelf: 'center', flex: 1 }}>
        {/* Buscador y filtros quedan fijos: la lista es larga y se busca a
            menudo después de bajar un rato. */}
        <View
          style={{
            paddingHorizontal: Spacing.gutter,
            paddingTop: Spacing.md,
            paddingBottom: Spacing.sm,
            gap: Spacing.md,
          }}>
          <Field
            label={t('catalog.search')}
            placeholder={t('catalog.searchPlaceholder')}
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              scrollToTop();
            }}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          <ChipSelector
            options={groupOptions}
            value={group}
            onChange={(value) => {
              setGroup(value);
              scrollToTop();
            }}
          />
          <Text style={[Type.caption, { color: colors.textMuted }]}>
            {t('catalog.resultsCount', { count: results.length })}
          </Text>
        </View>

        <FlatList
          ref={list}
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CatalogRow
              entry={item}
              added={added.has(item.id)}
              onPress={() => pick(item)}
            />
          )}
          getItemLayout={(_, index) => ({
            length: ROW_HEIGHT,
            offset: ROW_HEIGHT * index,
            index,
          })}
          initialNumToRender={10}
          windowSize={7}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={{
            paddingHorizontal: Spacing.gutter,
            paddingBottom: Spacing.xxl,
          }}
          ListEmptyComponent={
            <EmptyState
              icon="search-outline"
              title={t('catalog.noResultsTitle')}
              message={t('catalog.noResultsBody')}
            />
          }
          ListFooterComponent={
            <View style={{ gap: Spacing.md, paddingTop: Spacing.sm }}>
              {customName ? <CustomRow name={customName} onPress={createCustom} /> : null}
              <Text style={[Type.caption, { color: colors.textMuted, textAlign: 'center' }]}>
                {t('catalog.credit')}
              </Text>
            </View>
          }
        />
      </View>
    </View>
  );
}
