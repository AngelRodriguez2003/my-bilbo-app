import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import type { TFunction } from 'i18next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';

import {
  AppButton,
  Card,
  Enter,
  Field,
  Screen,
  SectionTitle,
  Skeleton,
  StatusDot,
} from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { isSupabaseConfigured, NETWORK_ERROR } from '@/lib/supabase';
import { SIGN_OUT_PENDING, useAuthStore, type AuthStatus } from '@/store/auth';
import { useDataStore } from '@/store/data';
import { useSettingsStore } from '@/store/settings';
import { countPendingChanges, useSyncStore } from '@/store/sync';
import { Radius, Spacing } from '@/theme/colors';
import { MEASURE, Type } from '@/theme/typography';
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
      <Text style={[Type.button, { color: colors.accent }]}>{t('common.done')}</Text>
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
      <Screen>
        {header}
        <Enter>
          <Card style={{ gap: Spacing.sm }}>
            <SectionTitle>{t('account.title')}</SectionTitle>
            <Text style={[Type.body, { color: colors.text }]}>{t('account.notConfigured')}</Text>
            <Text style={[Type.small, { color: colors.textMuted, maxWidth: MEASURE }]}>
              {t('account.notConfiguredHint')}
            </Text>
          </Card>
        </Enter>
      </Screen>
    );
  }

  // Mientras se restaura la sesión, el esqueleto de la tarjeta que va a
  // aparecer: se ve dónde va a caer el contenido en vez de una ruleta suelta.
  if (status === 'loading') {
    return (
      <Screen>
        {header}
        <Card style={{ gap: Spacing.md }}>
          <Skeleton width="45%" height={19} />
          <Skeleton height={13} />
          <Skeleton width="70%" height={13} />
          <Skeleton height={48} radius={Radius.md} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      {status === 'signedIn' ? <SignedIn locale={i18n.language} /> : <SignInForm />}
    </Screen>
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
      <Enter index={0}>
        <Card level={2} style={{ gap: Spacing.md }}>
          <SectionTitle>{t('account.title')}</SectionTitle>
          <Text style={[Type.small, { color: colors.textSecondary, maxWidth: MEASURE }]}>
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
            hint={t('account.passwordHint')}
          />

          {error ? <Notice tone="danger" text={humanError(error, t) ?? ''} /> : null}
          {notice === 'confirmEmail' ? (
            <Notice tone="success" text={t('account.confirmEmail')} />
          ) : null}

          <AppButton
            label={t('account.signIn')}
            onPress={() => signIn(email, password)}
            disabled={!valid}
            loading={busy}
          />
          <AppButton
            label={t('account.signUp')}
            variant="secondary"
            onPress={() => signUp(email, password)}
            disabled={!valid || busy}
          />
        </Card>
      </Enter>

      <Enter index={1}>
        <Card tone="sunken" level={0}>
          <Text style={[Type.caption, { color: colors.textMuted, maxWidth: MEASURE }]}>
            {t('account.otherAccountWarning')}
          </Text>
        </Card>
      </Enter>
    </>
  );
}

/** Mensaje en línea con su icono: el error nunca es solo texto rojo suelto. */
function Notice({ tone, text }: { tone: 'danger' | 'success'; text: string }) {
  const { colors } = useTheme();
  const color = tone === 'danger' ? colors.danger : colors.success;
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' }}>
      <Ionicons
        name={tone === 'danger' ? 'alert-circle' : 'checkmark-circle'}
        size={16}
        color={color}
        style={{ marginTop: 2 }}
      />
      <Text style={[Type.small, { color, flex: 1 }]}>{text}</Text>
    </View>
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
      <Enter index={0}>
        <Card level={2} style={{ gap: Spacing.md }}>
          <SectionTitle>{t('account.title')}</SectionTitle>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: Radius.md,
                backgroundColor: colors.accentSoft,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="person" size={19} color={colors.accent} />
            </View>
            <Text style={[Type.bodyStrong, { color: colors.text, flex: 1 }]} numberOfLines={2}>
              {t('account.signedInAs', { email })}
            </Text>
          </View>
        </Card>
      </Enter>

      <Enter index={1}>
        <Card style={{ gap: Spacing.md }}>
          <SectionTitle>{t('account.sync')}</SectionTitle>

          <View style={{ gap: 5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
              <StatusDot color={statusLine.color} pulsing={syncStatus === 'syncing'} />
              <Text style={[Type.bodyStrong, { color: statusLine.color, flex: 1 }]}>
                {statusLine.text}
              </Text>
            </View>
            <Text style={[Type.caption, { color: colors.textMuted }]}>
              {lastSyncedAt
                ? t('account.lastSynced', { date: formatDateTime(lastSyncedAt, locale) })
                : t('account.neverSynced')}
            </Text>
            {syncError ? <Notice tone="danger" text={humanError(syncError, t) ?? ''} /> : null}
          </View>

          <AppButton
            label={t('account.syncNow')}
            icon="sync"
            onPress={() => void syncNow()}
            loading={syncStatus === 'syncing'}
          />

          <View style={{ gap: Spacing.sm }}>
            <AppButton
              label={t('account.fullSync')}
              variant="secondary"
              onPress={() => void syncNow({ full: true })}
              disabled={syncStatus === 'syncing'}
            />
            <Text style={[Type.caption, { color: colors.textMuted, maxWidth: MEASURE }]}>
              {t('account.fullSyncHint')}
            </Text>
          </View>

          <Text style={[Type.caption, { color: colors.textMuted, maxWidth: MEASURE }]}>
            {t('account.offlineHint')}
          </Text>
        </Card>
      </Enter>

      <Enter index={2}>
        <View style={{ gap: Spacing.sm }}>
          {authError ? (
            <Notice
              tone="danger"
              text={
                authError === SIGN_OUT_PENDING
                  ? t('account.signOutPending', { count: pending })
                  : (humanError(authError, t) ?? '')
              }
            />
          ) : null}
          <AppButton
            label={t('account.signOut')}
            variant="danger"
            icon="log-out-outline"
            onPress={() => void signOut()}
            loading={busy}
          />
          <Text style={[Type.caption, { color: colors.textMuted, maxWidth: MEASURE }]}>
            {t('account.signOutHint')}
          </Text>
        </View>
      </Enter>
    </>
  );
}
