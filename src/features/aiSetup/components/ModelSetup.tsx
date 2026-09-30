import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';

import {
  downloadModel,
  type DownloadProgress,
  type DownloadTask,
  type ModelStatus,
} from '../../../ai/models/modelManager';
import {
  DEFAULT_MODEL_ID,
  formatBytes,
  MODELS,
} from '../../../ai/models/registry';
import { colors, fonts } from '../../../theme';

type Props = {
  onInstalled: (status: ModelStatus) => void;
  /** Mostra o botão "Agora não". Só na primeira abertura do app. */
  onSkip?: () => void;
};

const PHASE_LABEL: Record<DownloadProgress['phase'], string> = {
  downloading: 'Baixando o modelo...',
  verifying: 'Conferindo o arquivo...',
  checking: 'Testando o modelo no aparelho...',
};

export default function ModelSetup({ onInstalled, onSkip }: Props) {
  const [selectedId, setSelectedId] = useState(DEFAULT_MODEL_ID);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const task = useRef<DownloadTask | null>(null);

  const selected = MODELS.find(m => m.id === selectedId) ?? MODELS[0];
  const busy = progress !== null;

  const start = async () => {
    setError(null);
    setProgress({ phase: 'verifying', receivedBytes: 0, totalBytes: 0 });
    task.current = downloadModel(selected, setProgress);
    try {
      const status = await task.current.promise;
      onInstalled(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProgress(null);
    } finally {
      task.current = null;
    }
  };

  const percent =
    progress && progress.totalBytes > 0
      ? Math.min(
          100,
          Math.round((progress.receivedBytes / progress.totalBytes) * 100),
        )
      : 0;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Feather name="cpu" size={32} color={colors.primary} />
      </View>
      <Text style={styles.title}>Assistente offline</Text>
      <Text style={styles.text}>
        Para entender frases como "gastei 45 no mercado ontem", o app usa um
        modelo de IA que roda no próprio celular. Ele é baixado uma única vez.
        Depois disso, tudo funciona sem internet.
      </Text>

      <Text style={styles.label}>Escolha o modelo</Text>
      {MODELS.map(model => {
        const isSelected = model.id === selectedId;
        return (
          <Pressable
            key={model.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected, disabled: busy }}
            disabled={busy}
            onPress={() => setSelectedId(model.id)}
            style={[styles.option, isSelected && styles.optionSelected]}
          >
            <View style={styles.optionHeader}>
              <Feather
                name={isSelected ? 'check-circle' : 'circle'}
                size={18}
                color={isSelected ? colors.primary : colors.textMuted}
              />
              <Text style={styles.optionTitle}>{model.label}</Text>
              <Text style={styles.optionSize}>
                {formatBytes(model.sizeBytes)}
              </Text>
            </View>
            <Text style={styles.optionText}>{model.description}</Text>
            <Text style={styles.optionHint}>
              Recomendado para celulares com {model.minRamGb} GB de RAM ou mais.
            </Text>
          </Pressable>
        );
      })}

      <View style={styles.notice}>
        <Feather name="wifi" size={16} color={colors.textMuted} />
        <Text style={styles.noticeText}>
          Use o Wi-Fi e deixe o app aberto durante o download.
        </Text>
      </View>

      {progress && (
        <View style={styles.progress} accessibilityLiveRegion="polite">
          <Text style={styles.progressLabel}>
            {PHASE_LABEL[progress.phase]}
          </Text>
          {progress.phase === 'downloading' ? (
            <>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${percent}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {formatBytes(progress.receivedBytes)} de{' '}
                {formatBytes(progress.totalBytes)} · {percent}%
              </Text>
            </>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {busy ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => task.current?.cancel()}
          disabled={progress?.phase !== 'downloading'}
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.pressed,
            progress?.phase !== 'downloading' && styles.disabled,
          ]}
        >
          <Text style={styles.secondaryButtonText}>Cancelar download</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={start}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
          ]}
        >
          <Feather name="download" size={18} color={colors.onPrimary} />
          <Text style={styles.primaryButtonText}>
            {error
              ? 'Tentar de novo'
              : `Baixar ${formatBytes(selected.sizeBytes)}`}
          </Text>
        </Pressable>
      )}

      {onSkip && !busy && (
        <Pressable
          accessibilityRole="button"
          onPress={onSkip}
          style={({ pressed }) => [
            styles.linkButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.linkText}>Agora não</Text>
          <Text style={styles.linkHint}>
            O chat entende frases simples sem o modelo. Você pode baixar depois
            em Configurações.
          </Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  hero: {
    alignSelf: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  text: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },
  label: {
    marginTop: 24,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  option: {
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  optionSize: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  optionText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  optionHint: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.textMuted,
  },
  progress: {
    marginTop: 20,
    gap: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  bar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  barFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  error: {
    marginTop: 16,
    fontSize: 14,
    color: colors.me,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
  secondaryButton: {
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: colors.text,
  },
  linkButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
    gap: 4,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  linkHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.5,
  },
});
