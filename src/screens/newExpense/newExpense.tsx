import React from 'react';
import { Text, View } from 'react-native';
import { styles } from './style';

export default function NewExpense() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Adicionar gasto</Text>
    </View>
  );
}
