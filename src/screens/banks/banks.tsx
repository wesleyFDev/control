import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import { backendConfigured } from '../../config/backend';
import {
  listBanks,
  type BankSummary,
} from '../../db/repositories/pluggyRepository';
import { syncBankData } from '../../integrations/bankData/syncBankData';
import { colors } from '../../theme';
import { formatBRL } from '../../utils/money';
import { bankName, formatMoment, isCreditAccount } from './bankFormat';
import { styles } from './style';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Bancos conectados pela Pluggy, com saldo das contas e limite dos cartões.
 * Os dados ficam separados dos gastos: cada transação só vira gasto quando
 * o usuário a passa, na tela do banco.
 */
export default function Banks() {
  const navigation = useNavigation();
  const [banks, setBanks] = useState<BankSummary[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setBanks(await listBanks());
    } catch (err) {
      setError(errorText(err));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const sync = async () => {
    setSyncing(true);
    setError(null);
    setMessage(null);
    try {
      const result = await syncBankData();
      setMessage(
        `${result.items} banco(s) e ${result.transactions} transação(ões) atualizados.`,
      );
      if (result.errors.length > 0) {
        setError(
          result.errors
            .map(e => `${e.itemId.slice(0, 8)}: ${e.message}`)
            .join('\n'),
        );
      }
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <ScrollView contentContainerStyle={styles.content}>
        {!backendConfigured && (
          <View style={styles.notice}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={styles.noticeText}>
              A atualização passa pelo backend, que ainda não foi configurado.
              Os dados já baixados continuam aparecendo aqui.
            </Text>
          </View>
        )}

        {banks.length === 0 && (
          <View style={styles.empty}>
            <Feather name="briefcase" size={28} color={colors.textMuted} />
            <Text style={styles.hint}>Nenhum banco conectado ainda.</Text>
          </View>
        )}

        {banks.map(({ item, accounts }) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${bankName(item)}`}
            onPress={() =>
              navigation.navigate('BankDetail', { itemId: item.id })
            }
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardHeader}>
              <Feather name="briefcase" size={18} color={colors.primary} />
              <Text style={styles.cardTitle}>{bankName(item)}</Text>
              <Feather
                name="chevron-right"
                size={18}
                color={colors.textMuted}
              />
            </View>
            <Text style={styles.meta}>
              Atualizado pelo banco: {formatMoment(item.bankUpdatedAt)}
            </Text>
            <Text style={styles.meta}>
              Baixado no app: {formatMoment(item.lastSyncedAt)}
            </Text>
            {item.lastError && (
              <Text style={styles.error}>Último erro: {item.lastError}</Text>
            )}
            {accounts.map(account => (
              <View key={account.id} style={styles.row}>
                <Feather
                  name={
                    isCreditAccount(account.type)
                      ? 'credit-card'
                      : 'dollar-sign'
                  }
                  size={16}
                  color={colors.textMuted}
                />
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>
                    {account.marketingName ?? account.name}
                  </Text>
                  <Text style={styles.meta}>
                    {isCreditAccount(account.type)
                      ? 'Limite disponível'
                      : 'Saldo'}
                  </Text>
                </View>
                <Text style={styles.amount}>
                  {isCreditAccount(account.type)
                    ? account.availableCreditLimitCents !== null
                      ? formatBRL(account.availableCreditLimitCents)
                      : '—'
                    : formatBRL(account.balanceCents)}
                </Text>
              </View>
            ))}
          </Pressable>
        ))}

        {message && <Text style={styles.hint}>{message}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          accessibilityRole="button"
          disabled={syncing || !backendConfigured}
          onPress={sync}
          style={({ pressed }) => [
            styles.primaryButton,
            (syncing || !backendConfigured) && styles.disabled,
            pressed && styles.pressed,
          ]}
        >
          {syncing ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Feather name="refresh-cw" size={16} color={colors.onPrimary} />
          )}
          <Text style={styles.primaryButtonText}>Atualizar</Text>
        </Pressable>
        <Text style={styles.hint}>
          O banco atualiza os dados na Pluggy uma vez por dia. Atualizar aqui
          baixa o que a Pluggy já tem.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
