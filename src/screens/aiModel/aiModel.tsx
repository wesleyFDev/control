import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { SafeAreaView } from 'react-native-safe-area-context';

import { deleteInstalledModel } from '../../ai/models/modelManager';
import { formatBytes } from '../../ai/models/registry';
import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import ModelSetup from '../../features/aiSetup/components/ModelSetup';
import { useModelStatus } from '../../features/aiSetup/ModelContext';
import { colors } from '../../theme';
import { styles } from './style';

export default function AiModel() {
  const { status, setStatus } = useModelStatus();
  const [changing, setChanging] = useState(false);

  const confirmRemove = () => {
    Alert.alert(
      'Remover o modelo?',
      'O arquivo sai do celular e o chat volta a entender só frases simples. Para usar de novo, será preciso baixar outra vez.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            deleteInstalledModel()
              .then(() => setStatus({ state: 'missing' }))
              .catch(err =>
                Alert.alert('Não foi possível remover', String(err)),
              );
          },
        },
      ],
    );
  };

  if (status.state !== 'ready' || changing) {
    return (
      <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
        <ModelSetup
          onInstalled={next => {
            setChanging(false);
            setStatus(next);
          }}
        />
      </SafeAreaView>
    );
  }

  const { model } = status;

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Feather name="check-circle" size={20} color={colors.primary} />
            <Text style={styles.title}>Modelo instalado</Text>
          </View>
          <Text style={styles.name}>{model.label}</Text>
          <Text style={styles.text}>{model.description}</Text>
          <Text style={styles.meta}>
            {model.fileName} · {formatBytes(model.sizeBytes)}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => setChanging(true)}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Feather name="refresh-cw" size={16} color={colors.primary} />
          <Text style={styles.buttonText}>Trocar de modelo</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={confirmRemove}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Feather name="trash-2" size={16} color={colors.me} />
          <Text style={[styles.buttonText, styles.danger]}>Remover modelo</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
