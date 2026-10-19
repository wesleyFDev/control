import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';

import { colors, fonts } from '../theme';
import { initLock, unlock, useLockStatus } from './lockStore';

/**
 * Cobre o app inteiro enquanto o bloqueio estiver ativo. As telas continuam
 * montadas por baixo, para o usuário voltar exatamente onde estava, mas
 * ficam escondidas e fora do alcance do leitor de tela.
 */
export default function AppLockGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = useLockStatus();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    initLock();
  }, []);

  // Pede a digital assim que trava, se o app estiver na frente.
  useEffect(() => {
    if (status !== 'locked') {
      return;
    }
    setFailed(false);
    const tryUnlock = () =>
      unlock().then(ok => {
        if (!ok) {
          setFailed(true);
        }
      });
    if (AppState.currentState === 'active') {
      tryUnlock();
    }
  }, [status]);

  const covered = status === 'checking' || status === 'locked';

  return (
    <View style={styles.root}>
      <View
        style={styles.root}
        importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={covered}
      >
        {children}
      </View>
      {covered && (
        <View style={styles.cover}>
          {status === 'checking' ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <View style={styles.icon}>
                <Feather name="lock" size={30} color={colors.primary} />
              </View>
              <Text style={styles.title}>App bloqueado</Text>
              <Text style={styles.text}>
                Use a digital ou a senha do celular para ver os seus gastos.
              </Text>
              {failed && (
                <Text style={styles.failed}>
                  Não foi possível confirmar. Tente de novo.
                </Text>
              )}
              <Pressable
                accessibilityRole="button"
                onPress={() => unlock().then(ok => setFailed(!ok))}
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.pressed,
                ]}
              >
                <Feather name="unlock" size={18} color={colors.onPrimary} />
                <Text style={styles.buttonText}>Desbloquear</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  cover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 32,
    backgroundColor: colors.background,
  },
  icon: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: colors.primarySoft,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: 'center',
  },
  failed: {
    fontSize: 13,
    color: colors.me,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  pressed: {
    opacity: 0.7,
  },
});
