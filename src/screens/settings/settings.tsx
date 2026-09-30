import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  Feather,
  type FeatherIconName,
} from '@react-native-vector-icons/feather/static';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EDGES_WITH_HEADER } from '../../components/safeAreaEdges';
import { colors } from '../../theme';
import { styles } from './style';

type Item = {
  title: string;
  description: string;
  icon: FeatherIconName;
  /** Tela aberta pelo item. Precisa ser uma rota sem parâmetros. */
  route: 'Categories' | 'AiModel';
};

type Section = {
  title: string;
  items: Item[];
};

/**
 * Cada item abre uma tela própria. Novas configurações entram aqui,
 * dentro da seção a que pertencem.
 */
const SECTIONS: Section[] = [
  {
    title: 'Assistente',
    items: [
      {
        title: 'Modelo de IA',
        description:
          'Baixe, troque ou remova o modelo que entende as frases no chat.',
        icon: 'cpu',
        route: 'AiModel',
      },
      {
        title: 'Categorias e palavras-chave',
        description:
          'Crie categorias e ensine quais palavras levam a cada uma no chat.',
        icon: 'layers',
        route: 'Categories',
      },
    ],
  },
];

export default function Settings() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={EDGES_WITH_HEADER}>
      <ScrollView contentContainerStyle={styles.content}>
        {SECTIONS.map(section => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, index) => (
                <Pressable
                  key={item.title}
                  accessibilityRole="button"
                  onPress={() => navigation.navigate(item.route)}
                  style={({ pressed }) => [
                    styles.item,
                    index > 0 && styles.itemDivider,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={styles.icon}>
                    <Feather
                      name={item.icon}
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Text style={styles.itemDescription}>
                      {item.description}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={18}
                    color={colors.textMuted}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
