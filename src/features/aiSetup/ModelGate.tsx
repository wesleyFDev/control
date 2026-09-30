import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getModelStatus,
  isSetupSkipped,
  skipSetup,
  type ModelStatus,
} from '../../ai/models/modelManager';
import { EDGES_WITHOUT_HEADER } from '../../components/safeAreaEdges';
import { colors } from '../../theme';
import ModelSetup from './components/ModelSetup';
import { ModelProvider } from './ModelContext';

type GateState =
  | { phase: 'loading' }
  | { phase: 'setup' }
  | { phase: 'ready'; status: ModelStatus };

/**
 * Na abertura, confere se o modelo de IA está instalado. Se não estiver e o
 * usuário ainda não tiver escolhido "Agora não", mostra a tela de download
 * antes do app.
 */
export default function ModelGate({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>({ phase: 'loading' });

  useEffect(() => {
    (async () => {
      try {
        const status = await getModelStatus();
        if (status.state === 'ready' || (await isSetupSkipped())) {
          setState({ phase: 'ready', status });
        } else {
          setState({ phase: 'setup' });
        }
      } catch (error) {
        // Sem acesso à pasta do modelo, o app segue só com as regras.
        console.error('[ModelGate] Falha ao conferir o modelo', error);
        setState({ phase: 'ready', status: { state: 'missing' } });
      }
    })();
  }, []);

  const contextValue = useMemo(
    () =>
      state.phase === 'ready'
        ? {
            status: state.status,
            setStatus: (status: ModelStatus) =>
              setState({ phase: 'ready', status }),
          }
        : null,
    [state],
  );

  if (state.phase === 'loading') {
    return (
      <SafeAreaView style={styles.center} edges={EDGES_WITHOUT_HEADER}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!contextValue) {
    return (
      <SafeAreaView style={styles.container} edges={EDGES_WITHOUT_HEADER}>
        <ModelSetup
          onInstalled={status => setState({ phase: 'ready', status })}
          onSkip={async () => {
            await skipSetup().catch(() => undefined);
            setState({ phase: 'ready', status: { state: 'missing' } });
          }}
        />
      </SafeAreaView>
    );
  }

  return <ModelProvider value={contextValue}>{children}</ModelProvider>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
