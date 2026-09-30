import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import {
  createCategory,
  deleteCategory,
  getCategoryWithKeywords,
  normalizeKeyword,
  updateCategory,
} from '../../db/repositories/categoriesRepository';
import { DEFAULT_CATEGORY_ID } from '../../features/expenses/categories';
import type { RootStackScreenProps } from '../../navigation/types';
import { colors } from '../../theme';
import { styles } from './style';

/** Ícones do Feather oferecidos para as categorias. */
const ICONS: FeatherIconName[] = [
  'shopping-cart',
  'shopping-bag',
  'coffee',
  'navigation',
  'truck',
  'home',
  'zap',
  'droplet',
  'wifi',
  'film',
  'music',
  'tv',
  'heart',
  'activity',
  'book',
  'briefcase',
  'gift',
  'smile',
  'sun',
  'map',
  'globe',
  'smartphone',
  'scissors',
  'tool',
  'credit-card',
  'package',
  'award',
  'tag',
];

type Route = RootStackScreenProps<'CategoryEdit'>['route'];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function CategoryEdit() {
  const navigation = useNavigation();
  const route = useRoute<Route>();
  const categoryId = route.params?.categoryId;

  const [loading, setLoading] = useState(Boolean(categoryId));
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<FeatherIconName>('tag');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) {
      return;
    }
    getCategoryWithKeywords(categoryId)
      .then(category => {
        if (category) {
          setName(category.name);
          setIcon(category.icon as FeatherIconName);
          setKeywords(category.keywords);
        }
      })
      .catch(err => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [categoryId]);

  const addKeyword = () => {
    const keyword = normalizeKeyword(newKeyword);
    if (!keyword) {
      return;
    }
    if (!keywords.includes(keyword)) {
      setKeywords(current => [...current, keyword]);
    }
    setNewKeyword('');
  };

  const removeKeyword = (keyword: string) =>
    setKeywords(current => current.filter(k => k !== keyword));

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      // Uma palavra digitada e ainda não adicionada também entra.
      const pending = normalizeKeyword(newKeyword);
      const all = pending ? [...keywords, pending] : keywords;
      const input = { name, icon, keywords: all };
      if (categoryId) {
        await updateCategory(categoryId, input);
      } else {
        await createCategory(input);
      }
      navigation.goBack();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!categoryId) {
      return;
    }
    Alert.alert(
      'Apagar categoria?',
      `"${name}" some das listas e o chat deixa de usá-la. Os gastos antigos continuam com ela.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: () => {
            deleteCategory(categoryId)
              .then(() => navigation.goBack())
              .catch(err => setError(errorMessage(err)));
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center} edges={EDGES_WITH_HEADER}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const canDelete = Boolean(categoryId) && categoryId !== DEFAULT_CATEGORY_ID;

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <KeyboardAvoidingView
        style={styles.body}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.label}>Nome</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Ex.: Pets"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            accessibilityLabel="Nome da categoria"
            maxLength={40}
          />

          <Text style={styles.label}>Ícone</Text>
          <View style={styles.icons}>
            {ICONS.map(option => {
              const selected = option === icon;
              return (
                <Pressable
                  key={option}
                  accessibilityRole="radio"
                  accessibilityLabel={`Ícone ${option}`}
                  accessibilityState={{ selected }}
                  onPress={() => setIcon(option)}
                  style={[styles.iconOption, selected && styles.iconSelected]}
                >
                  <Feather
                    name={option}
                    size={20}
                    color={selected ? colors.onPrimary : colors.text}
                  />
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Palavras-chave</Text>
          <Text style={styles.hint}>
            Quando uma dessas palavras aparece na frase do chat, o gasto vai
            para esta categoria. Acentos e maiúsculas não fazem diferença.
          </Text>
          <View style={styles.keywordRow}>
            <TextInput
              value={newKeyword}
              onChangeText={setNewKeyword}
              onSubmitEditing={addKeyword}
              submitBehavior="submit"
              returnKeyType="done"
              placeholder="Ex.: ração"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.keywordInput]}
              accessibilityLabel="Nova palavra-chave"
              autoCapitalize="none"
              maxLength={40}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Adicionar palavra-chave"
              onPress={addKeyword}
              style={({ pressed }) => [
                styles.addKeyword,
                pressed && styles.pressed,
              ]}
            >
              <Feather name="plus" size={20} color={colors.primary} />
            </Pressable>
          </View>
          <View style={styles.chips}>
            {keywords.length === 0 && (
              <Text style={styles.hint}>Nenhuma palavra-chave ainda.</Text>
            )}
            {keywords.map(keyword => (
              <View key={keyword} style={styles.chip}>
                <Text style={styles.chipText}>{keyword}</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${keyword}`}
                  hitSlop={8}
                  onPress={() => removeKeyword(keyword)}
                >
                  <Feather name="x" size={14} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            accessibilityRole="button"
            disabled={saving}
            onPress={save}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.pressed,
              saving && styles.disabled,
            ]}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Text>
          </Pressable>

          {canDelete && (
            <Pressable
              accessibilityRole="button"
              onPress={confirmDelete}
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.pressed,
              ]}
            >
              <Feather name="trash-2" size={16} color={colors.me} />
              <Text style={styles.deleteButtonText}>Apagar categoria</Text>
            </Pressable>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
