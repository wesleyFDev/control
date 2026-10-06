import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createFamily,
  joinFamily,
  leaveFamily,
  regenerateInviteCode,
  type MyFamily,
} from '../../backend/familyService';
import { useSession } from '../../backend/session';
import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import { backendConfigured } from '../../config/backend';
import { resetFamilySyncState } from '../../sync/familySync';
import { runFamilySync } from '../../sync/runFamilySync';
import { colors } from '../../theme';
import { styles } from './style';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Família na nuvem: criar, entrar por código de convite, ver os membros e
 * sair. Só os gastos marcados como "Família" são compartilhados; os
 * pessoais continuam só no celular de cada um.
 */
export default function Family() {
  const { session } = useSession();
  const myUserId = session?.user.id ?? null;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [mine, setMine] = useState<MyFamily | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!backendConfigured) {
      setLoading(false);
      return;
    }
    try {
      const result = await runFamilySync();
      if (result.status === 'ok') {
        setMine(result.family);
        setLastSync(
          `Sincronizado agora: ${result.pushed} enviado(s), ${result.pulled} recebido(s).`,
        );
      } else {
        setMine(null);
        setLastSync(null);
      }
      setError(null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await task();
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const create = () =>
    run(async () => {
      await createFamily(newName);
      setNewName('');
    });

  const join = () =>
    run(async () => {
      await joinFamily(code);
      setCode('');
    });

  const confirmLeave = () =>
    Alert.alert(
      'Sair da família?',
      'Você deixa de ver e de enviar gastos da família. Os gastos que já estão no seu celular continuam aqui.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () =>
            run(async () => {
              await leaveFamily();
              await resetFamilySyncState();
            }),
        },
      ],
    );

  const confirmNewCode = () =>
    Alert.alert(
      'Gerar outro código?',
      'O código atual deixa de funcionar. Quem já está na família continua.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Gerar',
          onPress: () =>
            run(async () => {
              await regenerateInviteCode();
            }),
        },
      ],
    );

  const shareCode = (family: MyFamily['family']) =>
    Share.share({
      message: `Entre na família "${family.name}" no app de gastos com o código ${family.inviteCode}`,
    }).catch(() => undefined);

  if (!backendConfigured) {
    return (
      <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
        <View style={styles.content}>
          <View style={styles.notice}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={styles.noticeText}>
              A família usa o backend, que ainda não foi configurado. Preencha
              src/config/backend.ts.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={busy}
            onRefresh={() => run(async () => undefined)}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.notice}>
          <Feather name="lock" size={16} color={colors.primary} />
          <Text style={styles.noticeText}>
            Só os gastos marcados como "Família" vão para a nuvem e aparecem
            para todos. Os seus gastos pessoais ficam só neste celular.
          </Text>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {mine ? (
          <>
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>Família</Text>
              <Text style={styles.summaryTitle}>{mine.family.name}</Text>
              <Text style={styles.summaryLabel}>Código de convite</Text>
              <Text style={styles.code} selectable>
                {mine.family.inviteCode}
              </Text>
              <View style={styles.codeActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => shareCode(mine.family)}
                  style={({ pressed }) => [
                    styles.codeAction,
                    pressed && styles.pressed,
                  ]}
                >
                  <Feather name="share-2" size={16} color={colors.onInk} />
                  <Text style={styles.codeActionText}>Compartilhar</Text>
                </Pressable>
                {mine.family.role === 'owner' && (
                  <Pressable
                    accessibilityRole="button"
                    disabled={busy}
                    onPress={confirmNewCode}
                    style={({ pressed }) => [
                      styles.codeAction,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Feather name="refresh-cw" size={16} color={colors.onInk} />
                    <Text style={styles.codeActionText}>Novo código</Text>
                  </Pressable>
                )}
              </View>
            </View>

            <Text style={styles.sectionTitle}>
              Membros ({mine.members.length})
            </Text>
            <View style={styles.card}>
              {mine.members.map((member, index) => (
                <View
                  key={member.userId}
                  style={[styles.row, index === 0 && styles.rowFirst]}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {member.displayName.slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.rowText}>
                    {member.displayName}
                    {member.userId === myUserId ? ' (você)' : ''}
                  </Text>
                  {member.role === 'owner' && (
                    <Text style={styles.badge}>Dono</Text>
                  )}
                </View>
              ))}
            </View>

            {lastSync && <Text style={styles.hint}>{lastSync}</Text>}

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={confirmLeave}
              style={({ pressed }) => [
                styles.secondaryButton,
                busy && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.dangerText}>Sair da família</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Criar uma família</Text>
            <View style={styles.card}>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="Nome da família"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                maxLength={60}
                accessibilityLabel="Nome da família"
              />
              <Pressable
                accessibilityRole="button"
                disabled={busy || !newName.trim()}
                onPress={create}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (busy || !newName.trim()) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Feather name="users" size={16} color={colors.onPrimary} />
                <Text style={styles.primaryButtonText}>Criar</Text>
              </Pressable>
              <Text style={styles.hint}>
                Depois é só compartilhar o código de convite com quem vai
                participar.
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Entrar numa família</Text>
            <View style={styles.card}>
              <TextInput
                value={code}
                onChangeText={text => setCode(text.toUpperCase())}
                placeholder="Código de convite"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.codeInput]}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={10}
                accessibilityLabel="Código de convite"
              />
              <Pressable
                accessibilityRole="button"
                disabled={busy || !code.trim()}
                onPress={join}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (busy || !code.trim()) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Feather name="log-in" size={16} color={colors.onPrimary} />
                <Text style={styles.primaryButtonText}>Entrar</Text>
              </Pressable>
              <Text style={styles.hint}>
                Ao entrar, os gastos de família que você já tem no celular são
                enviados para a família.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
