import React, { useCallback, useState } from 'react';
import {
  AppState,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import type { NotificationCaptureRow } from '../../db/notificationSchema';
import {
  deleteCapturesOf,
  listCapturedApps,
  listNotificationCaptures,
  type CapturedApp,
} from '../../db/repositories/notificationsRepository';
import { getCategory } from '../../features/expenses/categories';
import {
  bankNotifications,
  notificationsSupported,
  type NotificationStatus,
} from '../../integrations/notifications/bankNotifications';
import { ingestBankNotifications } from '../../integrations/notifications/ingestNotifications';
import { colors } from '../../theme';
import { formatDayLabel } from '../../utils/dates';
import { formatBRL } from '../../utils/money';
import { styles } from './style';

/** Como cada app é tratado pelo filtro nativo. */
type AppRule = 'allowed' | 'money' | 'blocked';

type ListFilter = 'all' | 'expenses' | 'ignored';

const RULE_LABEL: Record<AppRule, string> = {
  allowed: 'Todas',
  money: 'Só com R$',
  blocked: 'Bloquear',
};

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatMoment(ms: number): string {
  if (!ms) {
    return 'nunca';
  }
  const date = new Date(ms);
  return `${date.toLocaleDateString('pt-BR')} às ${date
    .toLocaleTimeString('pt-BR')
    .slice(0, 5)}`;
}

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR').slice(0, 5);
}

/**
 * Notificações capturadas de qualquer app que mostre valor em R$, mais os
 * apps marcados para sempre capturar. O usuário vê de quais apps vieram e
 * decide, app por app, o que continua sendo capturado.
 */
export default function BankNotificationsScreen() {
  const [status, setStatus] = useState<NotificationStatus | null>(null);
  const [apps, setApps] = useState<CapturedApp[]>([]);
  const [captures, setCaptures] = useState<NotificationCaptureRow[]>([]);
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const [appFilter, setAppFilter] = useState<string | null>(null);
  const [customPackage, setCustomPackage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    async (filter: ListFilter = listFilter, app: string | null = appFilter) => {
      if (!notificationsSupported) {
        return;
      }
      try {
        await ingestBankNotifications();
        const [nextStatus, nextApps, rows] = await Promise.all([
          bankNotifications.getStatus(),
          listCapturedApps(),
          listNotificationCaptures({
            packageName: app,
            expense:
              filter === 'all'
                ? undefined
                : filter === 'expenses'
                ? true
                : false,
          }),
        ]);
        setStatus(nextStatus);
        setApps(nextApps);
        setCaptures(rows);
        setError(null);
      } catch (err) {
        setError(errorText(err));
      }
    },
    [listFilter, appFilter],
  );

  // Recarrega ao abrir a tela e ao voltar das configurações do sistema.
  useFocusEffect(
    useCallback(() => {
      reload();
      const subscription = AppState.addEventListener('change', state => {
        if (state === 'active') {
          reload();
        }
      });
      return () => subscription.remove();
    }, [reload]),
  );

  if (!notificationsSupported) {
    return (
      <SafeAreaView style={styles.center} edges={EDGES_WITH_HEADER}>
        <Text style={styles.hint}>
          A leitura de notificações só existe no Android. O iOS não deixa um app
          ler as notificações de outro.
        </Text>
      </SafeAreaView>
    );
  }

  const ruleOf = (packageName: string): AppRule =>
    status?.blockedPackages.includes(packageName)
      ? 'blocked'
      : status?.allowedPackages.includes(packageName)
      ? 'allowed'
      : 'money';

  const setRule = async (packageName: string, rule: AppRule) => {
    if (!status) {
      return;
    }
    const allowed = status.allowedPackages.filter(p => p !== packageName);
    const blocked = status.blockedPackages.filter(p => p !== packageName);
    if (rule === 'allowed') {
      allowed.push(packageName);
    }
    if (rule === 'blocked') {
      blocked.push(packageName);
    }
    try {
      await bankNotifications.setAllowedPackages(allowed);
      await bankNotifications.setBlockedPackages(blocked);
      if (rule === 'blocked') {
        await deleteCapturesOf(packageName);
      }
      await reload();
    } catch (err) {
      setError(errorText(err));
    }
  };

  const addCustom = () => {
    const packageName = customPackage.trim();
    if (!/^[a-zA-Z][\w]*(\.[\w]+)+$/.test(packageName)) {
      setError('Pacote inválido. Use o formato com.banco.app.');
      return;
    }
    setCustomPackage('');
    setRule(packageName, 'allowed');
  };

  const changeListFilter = (filter: ListFilter) => {
    setListFilter(filter);
    reload(filter, appFilter);
  };

  const changeAppFilter = (app: string | null) => {
    setAppFilter(app);
    reload(listFilter, app);
  };

  const connected =
    !!status &&
    status.lastConnectedAt > 0 &&
    status.lastConnectedAt >= status.lastDisconnectedAt;

  // Apps vistos nas capturas e apps com regra configurada, sem repetir.
  const ruleApps = [
    ...apps.map(a => ({
      packageName: a.packageName,
      label: a.appLabel,
      app: a,
    })),
    ...[...(status?.allowedPackages ?? []), ...(status?.blockedPackages ?? [])]
      .filter(p => !apps.some(a => a.packageName === p))
      .map(p => ({ packageName: p, label: p, app: undefined })),
  ];

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Situação</Text>
        <View style={styles.card}>
          <StatusRow
            ok={!!status?.permissionGranted}
            okText="Acesso às notificações liberado"
            failText="Acesso às notificações não liberado"
          />
          <StatusRow
            ok={connected}
            okText={`Serviço conectado desde ${formatMoment(
              status?.lastConnectedAt ?? 0,
            )}`}
            failText={
              status?.lastConnectedAt
                ? `Serviço desconectado pelo sistema em ${formatMoment(
                    status.lastDisconnectedAt,
                  )}`
                : 'O sistema ainda não conectou o serviço'
            }
          />
          <Text style={styles.hint}>
            Última notificação capturada:{' '}
            {formatMoment(status?.lastCapturedAt ?? 0)}
          </Text>

          {!status?.permissionGranted && (
            <ActionButton
              label="Liberar acesso às notificações"
              primary
              onPress={() =>
                bankNotifications
                  .openPermissionSettings()
                  .catch(err => setError(errorText(err)))
              }
            />
          )}
          {status?.permissionGranted && !connected && (
            <>
              <Text style={styles.hint}>
                O acesso está liberado, mas o Android não manteve o serviço
                ligado. Em celulares Xiaomi, Redmi e Poco, abra as configurações
                do app, ative "Início automático" e, em "Economia de bateria",
                escolha "Sem restrições". Depois toque em "Reconectar".
              </Text>
              <ActionButton
                label="Abrir configurações do app"
                onPress={() =>
                  bankNotifications
                    .openAppSettings()
                    .catch(err => setError(errorText(err)))
                }
              />
              <ActionButton
                label="Reconectar"
                onPress={() =>
                  bankNotifications
                    .requestRebind()
                    .then(() => setTimeout(() => reload(), 1500))
                    .catch(err => setError(errorText(err)))
                }
              />
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Filtros</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowText}>
              Capturar de qualquer app as notificações com valor em R$
            </Text>
            <Switch
              value={status?.moneyFromAnyApp ?? true}
              onValueChange={enabled =>
                bankNotifications
                  .setMoneyFromAnyApp(enabled)
                  .then(() => reload())
                  .catch(err => setError(errorText(err)))
              }
              trackColor={{ true: colors.primary, false: colors.border }}
              accessibilityLabel="Capturar de qualquer app com valor em R$"
            />
          </View>
          <Text style={styles.hint}>
            Ligado, o app descobre sozinho de onde vêm as notificações do banco.
            Depois de identificar os seus bancos, você pode desligar e deixar só
            os apps marcados como "Todas".
          </Text>

          {ruleApps.length === 0 && (
            <Text style={styles.hint}>
              Nenhum app ainda. Faça uma compra ou um Pix e abra esta tela de
              novo.
            </Text>
          )}
          {ruleApps.map(({ packageName, label, app }) => {
            const rule = ruleOf(packageName);
            return (
              <View key={packageName} style={styles.appRule}>
                <Text style={styles.appName}>{label}</Text>
                <Text style={styles.captureMeta}>
                  {packageName}
                  {app
                    ? ` · ${app.total} capturadas, ${app.expenses} gastos`
                    : ''}
                </Text>
                <View style={styles.segment}>
                  {(['allowed', 'money', 'blocked'] as AppRule[]).map(
                    option => (
                      <Pressable
                        key={option}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: rule === option }}
                        accessibilityLabel={`${label}: ${RULE_LABEL[option]}`}
                        onPress={() => setRule(packageName, option)}
                        style={[
                          styles.segmentOption,
                          rule === option && styles.segmentSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.segmentText,
                            rule === option && styles.segmentTextSelected,
                          ]}
                        >
                          {RULE_LABEL[option]}
                        </Text>
                      </Pressable>
                    ),
                  )}
                </View>
              </View>
            );
          })}

          <View style={styles.addRow}>
            <TextInput
              value={customPackage}
              onChangeText={setCustomPackage}
              onSubmitEditing={addCustom}
              placeholder="Sempre capturar: com.banco.app"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Pacote de um app para sempre capturar"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adicionar app"
              onPress={addCustom}
              style={({ pressed }) => [
                styles.iconButton,
                pressed && styles.pressed,
              ]}
            >
              <Feather name="plus" size={20} color={colors.primary} />
            </Pressable>
          </View>
          <Text style={styles.hint}>
            "Todas": captura tudo do app, mesmo sem valor. "Só com R$": só as
            que mostram valor. "Bloquear": nunca captura e apaga as já
            guardadas.
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.sectionTitle}>Notificações capturadas</Text>
        <View style={styles.chips}>
          {(
            [
              ['all', 'Todas'],
              ['expenses', 'Gastos'],
              ['ignored', 'Ignoradas'],
            ] as [ListFilter, string][]
          ).map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              selected={listFilter === key}
              onPress={() => changeListFilter(key)}
            />
          ))}
        </View>
        {apps.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            <Chip
              label="Todos os apps"
              selected={appFilter === null}
              onPress={() => changeAppFilter(null)}
            />
            {apps.map(app => (
              <Chip
                key={app.packageName}
                label={app.appLabel}
                selected={appFilter === app.packageName}
                onPress={() => changeAppFilter(app.packageName)}
              />
            ))}
          </ScrollView>
        )}

        {captures.length === 0 && (
          <Text style={styles.hint}>Nenhuma notificação com esse filtro.</Text>
        )}
        {captures.map(capture => (
          <View key={capture.id} style={styles.capture}>
            <View style={styles.captureText}>
              <Text style={styles.captureMeta}>
                {capture.appLabel ?? capture.packageName} ·{' '}
                {formatDayLabel(capture.date)} às {timeOf(capture.postedAt)}
              </Text>
              <Text style={styles.captureTitle} numberOfLines={1}>
                {capture.title}
              </Text>
              <Text style={styles.captureBody}>{capture.text}</Text>
              <Text
                style={[
                  styles.verdict,
                  capture.isExpenseCandidate
                    ? styles.verdictYes
                    : styles.verdictNo,
                ]}
              >
                {capture.isExpenseCandidate
                  ? `Gasto${capture.merchant ? ` em ${capture.merchant}` : ''}${
                      capture.categoryId
                        ? ` · ${getCategory(capture.categoryId).label}`
                        : ' · categoria pela IA na revisão'
                    }`
                  : `Ignorada: ${capture.ignoreReason}`}
              </Text>
            </View>
            {capture.amountCents !== null && (
              <Text style={styles.captureAmount}>
                {formatBRL(capture.amountCents)}
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusRow({
  ok,
  okText,
  failText,
}: {
  ok: boolean;
  okText: string;
  failText: string;
}) {
  return (
    <View style={styles.row}>
      <Feather
        name={ok ? 'check-circle' : 'alert-circle'}
        size={18}
        color={ok ? colors.primary : colors.me}
      />
      <Text style={styles.rowText}>{ok ? okText : failText}</Text>
    </View>
  );
}

function ActionButton({
  label,
  primary,
  onPress,
}: {
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        primary ? styles.primaryButton : styles.secondaryButton,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={primary ? styles.primaryButtonText : styles.secondaryButtonText}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}
