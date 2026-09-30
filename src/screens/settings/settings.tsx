import React from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import { styles } from './style';

export default function Settings() {
  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <Text style={styles.title}>Configurações</Text>
    </SafeAreaView>
  );
}
