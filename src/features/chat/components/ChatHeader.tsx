import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { DrawerActions, useNavigation } from '@react-navigation/native';

import { colors, fonts } from '../../../theme';

export default function ChatHeader() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Abrir menu"
        hitSlop={12}
        onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        style={styles.back}
      >
        <Feather name="menu" size={22} color={colors.text} />
      </Pressable>
      <View>
        <Text style={styles.title}>Assistente</Text>
        <View style={styles.badge}>
          <Feather name="shield" size={11} color={colors.primary} />
          <Text style={styles.badgeText}>IA local · funciona offline</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  back: {
    padding: 4,
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
  },
  badgeText: {
    fontSize: 11,
    color: colors.primary,
  },
});
