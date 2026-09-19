import { Stack, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { AppButton, Card, Field, SectionTitle } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { isSupabaseConfigured, NETWORK_ERROR } from '@/lib/supabase';
import { SIGN_OUT_PENDING, useAuthStore, type AuthStatus } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { useSettingsStore } from '@/store/settings';
import { countPendingChanges, useSyncStore } from '@/store/sync';
import { Spacing } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeContext';

const MIN_PASSWORD = 6;

/** Traduce el centinela de red; el resto de errores ya vienen redactados. */
function humanError(error: string | null, t: TFunction): string | null {
  if (!error) return null;
  return error === NETWORK_ERROR ? t('account.networkError') : error;
}

/**
 * Salir de esta pantalla. Abriendo /account directamente por URL no hay
 * historial al que volver y el modal se queda sin botón de retroceso, así
 * que en ese caso vamos al inicio en vez de dejar al usuario encerrado.
 */
function useDismiss() {
  const router = useRouter();
  // Estable: es dependencia de un efecto.
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);
}

function DoneButton() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const dismiss = useDismiss();

  return (
    <Pressable
      onPress={dismiss}
      hitSlop={12}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, paddingHorizontal: Spacing.sm })}>
      <Text style={{ color: colors.accent, fontSize: 16, fontWeight: '600' }}>
        {t('common.done')}
      </Text>
    </Pressable>
  );
}

export default function AccountScreen() {
  const { colors } = useTheme();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dismiss = useDismiss();

  const status = useAuthStore((s) => s.status);

  // Cualquier cambio de sesión saca de esta pantalla. Solo reacciona a un
  // cambio real, así que abrirla ya con la sesión puesta la deja abierta —
  // que es lo que se quiere para ver el estado de sincronización.
  const previousStatus = useRef<AuthStatus | null>(null);
  useEffect(() => {
    if (status === 'loading') return;

    const previous = previousStatus.current;
    previousStatus.current = status;
    if (!previous || previous === status) return;

    // Entrar devuelve a la app, donde estaba el usuario. Salir lo lleva a la
    // bienvenida, pero de eso se encarga el layout raíz: es el único sitio
    // donde la ruta /welcome ya existe cuando hace falta navegar a ella.
    if (status === 'signedIn') dismiss();
  }, [status, dismiss]);

  // Con historial detrás, el modal ya trae su flecha de retroceso y un segundo
  // botón para lo mismo solo ensucia la cabecera. El "Listo" existe para el
  // caso contrario: llegar por URL directa, donde no hay flecha ninguna.
  const header = (
    <Stack.Screen options={router.canGoBack() ? {} : { headerRight: () => <DoneButton /> }} />
  );

  if (!isSupabaseConfigured) {
    return (
      <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>
        {header}
        <Card style={{ gap: Spacing.sm }}>
          <SectionTitle>{t('account.title')}</SectionTitle>
          <Text style={{ color: colors.text, fontSize: 14 }}>{t('account.notConfigured')}</Text>
          <Text style={{ color: colors.textMuted, fontSize: 13, lineHeight: 19 }}>
            {t('account.notConfiguredHint')}
          </Text>
        </Card>
      </ScrollView>
    );
  }

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {header}
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>
      {header}
      {status === 'signedIn' ? <SignedIn locale={i18n.language} /> : <SignInForm />}
    </ScrollView>
  );
}

function SignInForm() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const busy = useAuthStore((s) => s.busy);
  const error = useAuthStore((s) => s.error);
  const notice = useAuthStore((s) => s.notice);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const valid = email.includes('@') && password.length >= MIN_PASSWORD;

  return (
    <>
      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>{t('account.title')}</SectionTitle>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
          {t('account.intro')}
        </Text>

        <Field
          label={t('account.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          inputMode="email"
        />
        <Field
          label={t('account.password')}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          secureTextEntry
        />
        <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: -Spacing.sm }}>
          {t('account.passwordHint')}
        </Text>

        {error ? (
          <Text style={{ color: colors.danger, fontSize: 13, lineHeight: 19 }}>
            {humanError(error, t)}
          </Text>
        ) : null}
        {notice === 'confirmEmail' ? (
          <Text style={{ color: colors.success, fontSize: 13, lineHeight: 19 }}>
            {t('account.confirmEmail')}
          </Text>
        ) : null}

        <AppButton
          label={t('account.signIn')}
          onPress={() => signIn(email, password)}
          disabled={!valid || busy}
        />
        <AppButton
          label={t('account.signUp')}
          variant="secondary"
          onPress={() => signUp(email, password)}
          disabled={!valid || busy}
        />
      </Card>

      <Card>
        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>
          {t('account.otherAccountWarning')}
        </Text>
      </Card>
    </>
  );
}

function SignedIn({ locale }: { locale: string }) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const email = useAuthStore((s) => s.email);
  const busy = useAuthStore((s) => s.busy);
  const authError = useAuthStore((s) => s.error);
  const signOut = useAuthStore((s) => s.signOut);

  const syncStatus = useSyncStore((s) => s.status);
  const syncError = useSyncStore((s) => s.error);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const lastPushedAt = useSyncStore((s) => s.lastPushedAt);
  const syncNow = useSyncStore((s) => s.syncNow);

  // Recalcula lo pendiente cuando cambia cualquiera de sus entradas.
  const exercises = useDataStore((s) => s.exercises);
  const cycles = useDataStore((s) => s.cycles);
  const sessions = useDataStore((s) => s.sessions);
  const settings = useSettingsStore((s) => s.settings);
  const pending = useMemo(
    () => countPendingChanges(),
    [exercises, cycles, sessions, settings, lastPushedAt],
  );

  const statusLine =
    syncStatus === 'syncing'
      ? { text: t('account.statusSyncing'), color: colors.textSecondary }
      : syncStatus === 'error'
        ? { text: t('account.statusError'), color: colors.danger }
        : pending > 0
          ? { text: t('account.statusPending', { count: pending }), color: colors.warning }
          : { text: t('account.statusIdle'), color: colors.success };

  return (
    <>
      <Card style={{ gap: Spacing.sm }}>
        <SectionTitle>{t('account.title')}</SectionTitle>
        <Text style={{ color: colors.text, fontSize: 15 }}>
          {t('account.signedInAs', { email })}
        </Text>
      </Card>

      <Card style={{ gap: Spacing.md }}>
        <SectionTitle>{t('account.sync')}</SectionTitle>

        <View style={{ gap: 4 }}>
          <Text style={{ color: statusLine.color, fontSize: 14, fontWeight: '600' }}>
            {statusLine.text}
          </Text>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {lastSyncedAt
              ? t('account.lastSynced', { date: formatDateTime(lastSyncedAt, locale) })
              : t('account.neverSynced')}
          </Text>
          {syncError ? (
            <Text style={{ color: colors.danger, fontSize: 12, lineHeight: 18 }}>
              {humanError(syncError, t)}
            </Text>
          ) : null}
        </View>

        <AppButton
          label={t('account.syncNow')}
          onPress={() => void syncNow()}
          disabled={syncStatus === 'syncing'}
        />

        <View style={{ gap: 6 }}>
          <AppButton
            label={t('account.fullSync')}
            variant="secondary"
            onPress={() => void syncNow({ full: true })}
            disabled={syncStatus === 'syncing'}
          />
          <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>
            {t('account.fullSyncHint')}
          </Text>
        </View>

        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>
          {t('account.offlineHint')}
        </Text>
      </Card>

      <View style={{ gap: Spacing.sm }}>
        {authError ? (
          <Text style={{ color: colors.danger, fontSize: 13, lineHeight: 19 }}>
            {authError === SIGN_OUT_PENDING
              ? t('account.signOutPending', { count: pending })
              : humanError(authError, t)}
          </Text>
        ) : null}
        <AppButton
          label={t('account.signOut')}
          variant="danger"
          onPress={() => void signOut()}
          disabled={busy}
        />
        <Text style={{ color: colors.textMuted, fontSize: 12, lineHeight: 18 }}>
          {t('account.signOutHint')}
        </Text>
      </View>
    </>
  );
}
