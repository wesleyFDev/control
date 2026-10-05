import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Feather,
  type FeatherIconName,
} from '@react-native-vector-icons/feather/static';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { parseDate } from '../../ai/parsers/dateParser';
import type { CreditCardRow } from '../../db/billsSchema';
import {
  createPayable,
  listCards,
} from '../../db/repositories/billsRepository';
import { listMembers } from '../../db/repositories/lookupsRepository';
import type { MemberRow } from '../../db/schema';
import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import {
  monthLabel,
  scheduleBoletoInstallments,
  scheduleCardInstallments,
} from '../../features/bills/schedule';
import { useCategories } from '../../features/expenses/hooks/useCategories';
import type { RootStackScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import { isoToBR, maskDateInput } from '../../utils/dateMask';
import { formatDayLabel, toISODate } from '../../utils/dates';
import { formatBRL, parseBRLInput } from '../../utils/money';
import { styles } from './style';

type Route = RootStackScreenProps<'PayableForm'>['route'];

const QUICK_COUNTS = [1, 2, 3, 4, 5, 6, 10, 12];

function parseTypedDate(text: string): string | null {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    return null;
  }
  const result = parseDate(text);
  return result.found ? result.date : null;
}

/** Nova compra no cartão ou novo boleto, à vista ou parcelado. */
export default function PayableForm() {
  const navigation = useNavigation();
  const params = useRoute<Route>().params;
  const categories = useCategories();
  const [kind, setKind] = useState<'card' | 'boleto'>(params?.kind ?? 'card');
  const [cards, setCards] = useState<CreditCardRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [cardId, setCardId] = useState<string | null>(params?.cardId ?? null);
  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [count, setCount] = useState(1);
  const [countText, setCountText] = useState('1');
  const [dateText, setDateText] = useState(isoToBR(toISODate(new Date())));
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [owner, setOwner] = useState<string>('family');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listCards(), listMembers()]).then(([cardRows, memberRows]) => {
      setCards(cardRows);
      setMembers(memberRows);
      setCardId(current => current ?? cardRows[0]?.id ?? null);
      const self = memberRows.find(m => m.isSelf);
      if (self) {
        setOwner(self.id);
      }
    });
  }, []);

  const totalCents = parseBRLInput(amountText);
  const startDate = parseTypedDate(dateText);
  const card = cards.find(c => c.id === cardId);

  const schedule = useMemo(() => {
    if (!totalCents || !startDate || count < 1 || totalCents < count) {
      return null;
    }
    if (kind === 'card') {
      return card
        ? scheduleCardInstallments({
            totalCents,
            count,
            purchaseDate: startDate,
            closingDay: card.closingDay,
            dueDay: card.dueDay,
          })
        : null;
    }
    return scheduleBoletoInstallments({
      totalCents,
      count,
      firstDueDate: startDate,
    });
  }, [kind, card, totalCents, startDate, count]);

  const save = async () => {
    setError(null);
    if (!startDate) {
      setError('Data inválida. Use dd/mm/aaaa.');
      return;
    }
    if (!categoryId) {
      setError('Escolha uma categoria.');
      return;
    }
    setSaving(true);
    try {
      await createPayable({
        kind,
        cardId: kind === 'card' ? cardId : null,
        description,
        categoryId,
        scope: owner === 'family' ? 'family' : 'personal',
        memberId: owner === 'family' ? null : owner,
        totalCents: totalCents ?? 0,
        installmentsCount: count,
        startDate,
      });
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const setCountValue = (value: number) => {
    setCount(value);
    setCountText(String(value));
  };

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.tabs} accessibilityRole="tablist">
            {(
              [
                ['card', 'Cartão de crédito'],
                ['boleto', 'Boleto'],
              ] as const
            ).map(([key, label]) => (
              <Pressable
                key={key}
                accessibilityRole="tab"
                accessibilityState={{ selected: kind === key }}
                onPress={() => setKind(key)}
                style={[styles.tab, kind === key && styles.tabSelected]}
              >
                <Text
                  style={[
                    styles.tabText,
                    kind === key && styles.tabTextSelected,
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {kind === 'card' && (
            <>
              <Text style={styles.label}>Cartão</Text>
              {cards.length === 0 ? (
                <Text style={styles.hint}>
                  Cadastre um cartão antes, na tela de contas.
                </Text>
              ) : (
                <View style={styles.chips}>
                  {cards.map(c => (
                    <Chip
                      key={c.id}
                      label={c.name}
                      icon="credit-card"
                      selected={c.id === cardId}
                      onPress={() => setCardId(c.id)}
                    />
                  ))}
                </View>
              )}
            </>
          )}

          <Text style={styles.label}>Descrição</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder={
              kind === 'card' ? 'Ex.: TV da sala' : 'Ex.: Mensalidade do curso'
            }
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            accessibilityLabel="Descrição"
            maxLength={60}
          />

          <Text style={styles.label}>Valor total</Text>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder="0,00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            style={styles.input}
            accessibilityLabel="Valor total"
          />

          <Text style={styles.label}>Parcelas</Text>
          <View style={styles.chips}>
            {QUICK_COUNTS.map(n => (
              <Chip
                key={n}
                label={n === 1 ? 'À vista' : `${n}x`}
                selected={count === n}
                onPress={() => setCountValue(n)}
              />
            ))}
          </View>
          <TextInput
            value={countText}
            onChangeText={text => {
              const digits = text.replace(/\D/g, '').slice(0, 2);
              setCountText(digits);
              setCount(Number(digits) || 0);
            }}
            keyboardType="number-pad"
            style={[styles.input, styles.inputSpaced]}
            accessibilityLabel="Número de parcelas"
          />

          <Text style={styles.label}>
            {kind === 'card' ? 'Data da compra' : 'Primeiro vencimento'}
          </Text>
          <TextInput
            value={dateText}
            onChangeText={text => setDateText(maskDateInput(text))}
            placeholder="dd/mm/aaaa"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            style={styles.input}
            accessibilityLabel={
              kind === 'card' ? 'Data da compra' : 'Primeiro vencimento'
            }
            maxLength={10}
          />

          <Text style={styles.label}>Categoria</Text>
          <View style={styles.chips}>
            {categories.map(category => (
              <Chip
                key={category.id}
                label={category.label}
                icon={category.icon}
                selected={category.id === categoryId}
                onPress={() => setCategoryId(category.id)}
              />
            ))}
          </View>

          <Text style={styles.label}>De quem é</Text>
          <View style={styles.chips}>
            <Chip
              label="Família"
              selected={owner === 'family'}
              onPress={() => setOwner('family')}
            />
            {members.map(member => (
              <Chip
                key={member.id}
                label={member.isSelf ? `${member.name} (você)` : member.name}
                selected={owner === member.id}
                onPress={() => setOwner(member.id)}
              />
            ))}
          </View>

          {schedule && (
            <View style={styles.preview} accessibilityLiveRegion="polite">
              <Text style={styles.previewText}>
                {count === 1
                  ? `${formatBRL(schedule[0].amountCents)} à vista`
                  : `${count}x de ${formatBRL(schedule[0].amountCents)}${
                      schedule[count - 1].amountCents !==
                      schedule[0].amountCents
                        ? ` (a última de ${formatBRL(
                            schedule[count - 1].amountCents,
                          )})`
                        : ''
                    }`}
                {kind === 'card'
                  ? `, a primeira na fatura de ${monthLabel(
                      schedule[0].referenceMonth,
                    )} e a última na de ${monthLabel(
                      schedule[count - 1].referenceMonth,
                    )}.`
                  : `, vencendo de ${formatDayLabel(
                      schedule[0].dueDate,
                    )} a ${formatDayLabel(schedule[count - 1].dueDate)}.`}{' '}
                Só vira gasto quando for marcado como pago.
              </Text>
            </View>
          )}

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
              {saving ? 'Salvando...' : 'Salvar'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Chip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: FeatherIconName;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      {icon && (
        <Feather
          name={icon}
          size={13}
          color={selected ? colors.onPrimary : colors.text}
        />
      )}
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}
