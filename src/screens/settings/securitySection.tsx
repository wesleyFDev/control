import React, { useState } from 'react';
import { ActivityIndicator, Switch, Text, View } from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';

import {
  turnLockOff,
  turnLockOn,
  useLockStatus,
} from '../../security/lockStore';
import { colors } from '../../theme';
import { styles } from './style';

/**
 * Liga e desliga o bloqueio com a digital ou a senha do celular. Ligar e
 * desligar pedem a digital, para ninguém desativar com o app destravado.
 */
export default function SecuritySection() {
  const status = useLockStatus();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const enabled = status === 'unlocked' || status === 'locked';

  const toggle = async (next: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await (next ? turnLockOn() : turnLockOff());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Segurança</Text>
      <View style={styles.card}>
        <View style={styles.item}>
          <View style={styles.icon}>
            <Feather name="lock" size={18} color={colors.primary} />
          </View>
          <View style={styles.itemText}>
            <Text style={styles.itemTitle}>Bloquear com digital ou senha</Text>
            <Text style={styles.itemDescription}>
              Pede a digital ou a senha do celular ao abrir o app e ao voltar
              depois de 1 minuto fora. Esconde o app na tela de recentes e
              bloqueia prints.
            </Text>
            {error && <Text style={styles.error}>{error}</Text>}
          </View>
          {busy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              value={enabled}
              disabled={status === 'checking'}
              onValueChange={toggle}
              trackColor={{ true: colors.primary, false: colors.border }}
              accessibilityLabel="Bloquear com digital ou senha"
            />
          )}
        </View>
      </View>
    </View>
  );
}
