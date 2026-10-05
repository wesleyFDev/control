import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  createCard,
  deleteCard,
  listCards,
  updateCard,
} from '../../db/repositories/billsRepository';
import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import type { RootStackScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import { styles } from './style';

type Route = RootStackScreenProps<'CardForm'>['route'];

export default function CardForm() {
  const navigation = useNavigation();
  const cardId = useRoute<Route>().params?.cardId;
  const [name, setName] = useState('');
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!cardId) {
      return;
    }
    listCards().then(cards => {
      const card = cards.find(c => c.id === cardId);
      if (card) {
        setName(card.name);
        setClosingDay(String(card.closingDay));
        setDueDay(String(card.dueDay));
      }
    });
  }, [cardId]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const input = {
        name,
        closingDay: Number(closingDay),
        dueDay: Number(dueDay),
      };
      if (cardId) {
        await updateCard(cardId, input);
      } else {
        await createCard(input);
      }
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(
      'Apagar o cartão?',
      'As faturas já pagas continuam nos gastos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () =>
            deleteCard(cardId as string)
              .then(() => navigation.goBack())
              .catch(err =>
                setError(err instanceof Error ? err.message : String(err)),
              ),
        },
      ],
    );

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Nome</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Ex.: Nubank"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          accessibilityLabel="Nome do cartão"
          maxLength={40}
        />
        <Text style={styles.label}>Dia do fechamento da fatura</Text>
        <TextInput
          value={closingDay}
          onChangeText={t => setClosingDay(t.replace(/\D/g, '').slice(0, 2))}
          placeholder="Ex.: 3"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={styles.input}
          accessibilityLabel="Dia do fechamento"
        />
        <Text style={styles.label}>Dia do vencimento da fatura</Text>
        <TextInput
          value={dueDay}
          onChangeText={t => setDueDay(t.replace(/\D/g, '').slice(0, 2))}
          placeholder="Ex.: 10"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          style={styles.input}
          accessibilityLabel="Dia do vencimento"
        />
        <Text style={styles.hint}>
          Compras feitas a partir do dia do fechamento entram na fatura
          seguinte. Mudar os dias vale só para as compras novas.
        </Text>

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          accessibilityRole="button"
          disabled={saving}
          onPress={save}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.pressed,
            saving && styles.disabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            {saving ? 'Salvando...' : 'Salvar cartão'}
          </Text>
        </Pressable>
        {cardId && (
          <Pressable
            accessibilityRole="button"
            onPress={confirmDelete}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.dangerText}>Apagar cartão</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
