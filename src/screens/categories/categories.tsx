import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import {
  Feather,
  type FeatherIconName,
} from '@react-native-vector-icons/feather/static';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import {
  listCategoriesWithKeywords,
  type CategoryWithKeywords,
} from '../../db/repositories/categoriesRepository';
import { colors } from '../../theme';
import { styles } from './style';

function keywordSummary(keywords: string[]): string {
  if (keywords.length === 0) {
    return 'Nenhuma palavra-chave';
  }
  const shown = keywords.slice(0, 4).join(', ');
  const rest = keywords.length - 4;
  return rest > 0 ? `${shown} e mais ${rest}` : shown;
}

export default function Categories() {
  const navigation = useNavigation();
  const [items, setItems] = useState<CategoryWithKeywords[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      listCategoriesWithKeywords()
        .then(list => active && setItems(list))
        .catch(err => active && setError(String(err?.message ?? err)));
      return () => {
        active = false;
      };
    }, []),
  );

  if (error) {
    return (
      <SafeAreaView style={styles.center} edges={EDGES_WITH_HEADER}>
        <Text style={styles.emptyTitle}>Não foi possível carregar.</Text>
        <Text style={styles.emptyText}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!items) {
    return (
      <SafeAreaView style={styles.center} edges={EDGES_WITH_HEADER}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.hint}>
            O chat escolhe a categoria pela primeira palavra-chave que aparece
            na frase. Toque em uma categoria para editar.
          </Text>
        }
        ItemSeparatorComponent={Separator}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Editar categoria ${item.name}`}
            onPress={() =>
              navigation.navigate('CategoryEdit', { categoryId: item.id })
            }
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
          >
            <View style={styles.icon}>
              <Feather
                name={item.icon as FeatherIconName}
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={styles.itemText}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.itemDescription} numberOfLines={1}>
                {keywordSummary(item.keywords)}
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      />
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate('CategoryEdit', {})}
        style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
      >
        <Feather name="plus" size={18} color={colors.onPrimary} />
        <Text style={styles.addButtonText}>Nova categoria</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}
