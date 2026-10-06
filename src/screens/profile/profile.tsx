import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signOut } from '../../backend/authService';
import {
  fetchMyProfile,
  updateDisplayName,
  type Profile as ProfileData,
} from '../../backend/familyService';
import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import { backendConfigured } from '../../config/backend';
import { resetFamilySyncState } from '../../sync/familySync';
import { runFamilySync } from '../../sync/runFamilySync';
import { colors } from '../../theme';
import { styles } from './style';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function Profile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!backendConfigured) {
        return;
      }
      fetchMyProfile()
        .then(data => {
          setProfile(data);
          setName(data.displayName);
        })
        .catch(err => setError(errorText(err)));
    }, []),
  );

  const saveName = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await updateDisplayName(name);
      setProfile(p => (p ? { ...p, displayName: name.trim() } : p));
      setMessage('Nome atualizado.');
      // Os outros membros veem o nome novo na próxima sincronização deles.
      runFamilySync().catch(() => undefined);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const confirmSignOut = () =>
    Alert.alert(
      'Sair da conta?',
      'Os gastos continuam no celular. Gastos de família feitos sem conta só sobem quando você entrar de novo.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetFamilySyncState();
              await signOut();
            } catch (err) {
              setError(errorText(err));
            }
          },
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
              A conta usa o backend, que ainda não foi configurado. Preencha
              src/config/backend.ts.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const nameChanged =
    profile !== null &&
    name.trim() !== '' &&
    name.trim() !== profile.displayName;

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {!profile && !error && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        )}

        {profile && (
          <>
            <Text style={styles.sectionTitle}>Conta</Text>
            <View style={styles.card}>
              <Text style={styles.hint}>E-mail</Text>
              <Text style={styles.rowText}>{profile.email}</Text>
              <Text style={styles.hint}>Nome que a família vê</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                maxLength={60}
                accessibilityLabel="Seu nome"
              />
              <Pressable
                accessibilityRole="button"
                disabled={!nameChanged || busy}
                onPress={saveName}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!nameChanged || busy) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>Salvar nome</Text>
              </Pressable>
            </View>
          </>
        )}

        {message && <Text style={styles.hint}>{message}</Text>}
        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          accessibilityRole="button"
          onPress={confirmSignOut}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.dangerText}>Sair da conta</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
