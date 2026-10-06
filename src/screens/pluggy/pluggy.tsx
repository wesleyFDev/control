import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  addCloudItem,
  deleteCredentials,
  getCredentialsStatus,
  listCloudItems,
  removeCloudItem,
  saveCredentials,
  type CloudPluggyItem,
  type CredentialsStatus,
} from '../../backend/pluggyService';
import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import { backendConfigured } from '../../config/backend';
import { colors } from '../../theme';
import { styles } from './style';

/** Limite do plano gratuito do Meu Pluggy. */
const MAX_ITEMS = 5;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function formatDateTime(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  return `${date.toLocaleDateString('pt-BR')} às ${date
    .toLocaleTimeString('pt-BR')
    .slice(0, 5)}`;
}

/**
 * Configuração do Meu Pluggy no backend. As credenciais vão para a Edge
 * Function, que confere na Pluggy, cifra e guarda; o celular não as guarda.
 * Os dados dos bancos aparecem na tela "Bancos".
 */
export default function PluggyIntegration() {
  const navigation = useNavigation();
  const [status, setStatus] = useState<CredentialsStatus | null>(null);
  const [items, setItems] = useState<CloudPluggyItem[]>([]);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [newItemId, setNewItemId] = useState('');
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [nextStatus, nextItems] = await Promise.all([
      getCredentialsStatus(),
      listCloudItems(),
    ]);
    setStatus(nextStatus);
    setItems(nextItems);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (backendConfigured) {
        reload().catch(err => setError(errorText(err)));
      }
    }, [reload]),
  );

  const run = async (label: string, task: () => Promise<void>) => {
    setError(null);
    setProgress(label);
    try {
      await task();
      await reload();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setProgress(null);
    }
  };

  const save = () =>
    run('Conferindo na Pluggy...', async () => {
      await saveCredentials(clientId, clientSecret);
      setClientId('');
      setClientSecret('');
    });

  const forget = () =>
    Alert.alert(
      'Apagar as credenciais?',
      'O app deixa de atualizar os bancos. Os dados já baixados continuam no celular.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => run('Apagando...', deleteCredentials),
        },
      ],
    );

  const addItem = () => {
    if (!newItemId.trim()) {
      return;
    }
    run('Adicionando...', async () => {
      await addCloudItem(newItemId);
      setNewItemId('');
    });
  };

  const removeItem = (itemId: string) =>
    Alert.alert(
      'Remover a conexão?',
      'O banco some da tela "Bancos" na próxima atualização. Os gastos já criados a partir dele continuam.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => run('Removendo...', () => removeCloudItem(itemId)),
        },
      ],
    );

  if (!backendConfigured) {
    return (
      <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
        <View style={styles.content}>
          <View style={styles.notice}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={styles.noticeText}>
              A Pluggy é chamada pelo backend, que ainda não foi configurado.
              Preencha src/config/backend.ts.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const busy = progress !== null;
  const canSave = clientId.trim() !== '' && clientSecret.trim() !== '';

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.notice}>
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={styles.noticeText}>
              As credenciais ficam cifradas no backend e as chamadas à Pluggy
              saem de lá. O Meu Pluggy atualiza os bancos a cada 24 horas.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Credenciais</Text>
          {status === null ? (
            <ActivityIndicator color={colors.primary} />
          ) : status.configured ? (
            <View style={styles.card}>
              <Text style={styles.accountName}>Guardadas no backend</Text>
              {status.updatedAt && (
                <Text style={styles.accountMeta}>
                  Desde {formatDateTime(status.updatedAt)}
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={forget}
                style={({ pressed }) => [
                  styles.linkButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.dangerText}>Apagar credenciais</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <TextInput
                value={clientId}
                onChangeText={setClientId}
                placeholder="Client ID"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Client ID"
              />
              <TextInput
                value={clientSecret}
                onChangeText={setClientSecret}
                placeholder="Client Secret"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.inputSpacing]}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                accessibilityLabel="Client Secret"
              />
              <Text style={styles.hint}>
                O backend confere na Pluggy antes de guardar. Depois disso, nem
                o app consegue ler de volta.
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={!canSave || busy}
                onPress={save}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.pressed,
                  (!canSave || busy) && styles.disabled,
                ]}
              >
                <Text style={styles.secondaryButtonText}>
                  Guardar credenciais
                </Text>
              </Pressable>
            </>
          )}

          <Text style={styles.sectionTitle}>
            Conexões ({items.length}/{MAX_ITEMS})
          </Text>
          {items.map(item => (
            <View key={item.itemId} style={styles.itemRow}>
              <View style={styles.accountText}>
                <Text style={styles.itemId} numberOfLines={1}>
                  {item.itemId}
                </Text>
                <Text style={styles.accountMeta}>
                  Adicionada em {formatDateTime(item.createdAt)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remover conexão ${item.itemId}`}
                hitSlop={10}
                onPress={() => removeItem(item.itemId)}
              >
                <Feather name="x" size={18} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          {items.length < MAX_ITEMS && (
            <View style={styles.addRow}>
              <TextInput
                value={newItemId}
                onChangeText={setNewItemId}
                onSubmitEditing={addItem}
                placeholder="Cole um itemId do Dashboard"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, styles.addInput]}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Novo itemId"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Adicionar conexão"
                disabled={!newItemId.trim() || busy}
                onPress={addItem}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.pressed,
                  (!newItemId.trim() || busy) && styles.disabled,
                ]}
              >
                <Feather name="plus" size={20} color={colors.primary} />
              </Pressable>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('App', { screen: 'Banks' })}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="briefcase" size={16} color={colors.onPrimary} />
            <Text style={styles.primaryButtonText}>Ver os bancos</Text>
          </Pressable>

          {progress && (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.hint}>{progress}</Text>
            </View>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
