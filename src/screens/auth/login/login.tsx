import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { signIn } from '../../../backend/authService';
import { EDGES_WITH_HEADER } from '../../../components/safeAreaEdges';
import type { AuthStackScreenProps } from '../../../navigation/types';
import { colors } from '../../../theme';
import { styles } from './style';

/**
 * Entrar com e-mail e senha. Depois do login a sessão fica guardada no
 * aparelho, e o app abre direto nas próximas vezes, mesmo sem internet.
 */
export default function Login({ navigation }: AuthStackScreenProps<'Login'>) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim() !== '' && password !== '' && !busy;

  const submit = async () => {
    if (!canSubmit) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // A navegação troca sozinha para o app quando a sessão chega.
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

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
          <Text style={styles.title}>Bem-vindo</Text>
          <Text style={styles.subtitle}>
            Seus gastos pessoais ficam só no celular. A conta serve para
            compartilhar os gastos da família.
          </Text>

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
            placeholder="Sua senha"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            secureTextEntry
            autoComplete="password"
            textContentType="password"
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
            <Text style={styles.primaryButtonText}>Entrar</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('Register')}
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
          >
            <Text style={styles.linkText}>Criar uma conta</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
