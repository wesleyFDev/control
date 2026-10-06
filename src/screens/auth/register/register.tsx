import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signUp } from '../../../backend/authService';
import { EDGES_WITH_HEADER } from '../../../components/safeAreaEdges';
import type { AuthStackScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme';
import { styles } from './style';

const MIN_PASSWORD = 6;

export default function Register({
  navigation,
}: AuthStackScreenProps<'Register'>) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmEmail, setConfirmEmail] = useState(false);

  const canSubmit =
    name.trim() !== '' &&
    email.trim() !== '' &&
    password.length >= MIN_PASSWORD &&
    !busy;

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { needsConfirmation } = await signUp(name, email, password);
      // Sem confirmação, a sessão chega e a navegação abre o app sozinha.
      if (needsConfirmation) {
        setConfirmEmail(true);
        setBusy(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  if (confirmEmail) {
    return (
      <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
        <View style={styles.content}>
          <Text style={styles.title}>Confirme seu e-mail</Text>
          <Text style={styles.subtitle}>
            Enviamos um link para {email.trim()}. Depois de confirmar, volte e
            entre com a sua senha.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Login')}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Ir para entrar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Seu nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Como a família vai te ver"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoComplete="name"
            maxLength={60}
            accessibilityLabel="Seu nome"
          />
          <Text style={styles.label}>E-mail</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            accessibilityLabel="E-mail"
          />
          <Text style={styles.label}>Senha</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            onSubmitEditing={submit}
            placeholder={`Pelo menos ${MIN_PASSWORD} caracteres`}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            accessibilityLabel="Senha"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            accessibilityRole="button"
            disabled={!canSubmit}
            onPress={submit}
            style={({ pressed }) => [
              styles.primaryButton,
              !canSubmit && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            {busy && <ActivityIndicator color={colors.onPrimary} />}
            <Text style={styles.primaryButtonText}>Criar conta</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
