import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';
import {
  Feather,
  type FeatherIconName,
} from '@react-native-vector-icons/feather/static';

import { colors, fonts } from '../theme';
import type { AppDrawerParamList } from './types';

type RouteName = keyof AppDrawerParamList;

type Item = {
  route: RouteName;
  label: string;
  icon: FeatherIconName;
};

/** Ações principais, no topo do drawer. */
const QUICK_ACTIONS: Item[] = [
  { route: 'Chat', label: 'Conversar com a IA', icon: 'message-circle' },
  { route: 'NewExpense', label: 'Digitar gasto', icon: 'edit-3' },
];

/** Demais telas, abaixo das ações principais. */
const MENU_ITEMS: Item[] = [
  { route: 'Reports', label: 'Relatórios', icon: 'pie-chart' },
  { route: 'Details', label: 'Detalhes', icon: 'list' },
  { route: 'Family', label: 'Família', icon: 'users' },
  { route: 'Profile', label: 'Perfil', icon: 'user' },
  { route: 'Settings', label: 'Configurações', icon: 'settings' },
];

export default function DrawerContent(props: DrawerContentComponentProps) {
  const { state, navigation } = props;
  const activeRoute = state.routes[state.index]?.name;

  const go = (route: RouteName) => navigation.navigate(route);

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.brand}>Gastos da Família</Text>

      <View style={styles.quickActions}>
        {QUICK_ACTIONS.map((item, index) => {
          const primary = index === 0;
          const focused = activeRoute === item.route;
          return (
            <Pressable
              key={item.route}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              onPress={() => go(item.route)}
              style={({ pressed }) => [
                styles.action,
                primary ? styles.actionPrimary : styles.actionSecondary,
                focused && !primary && styles.actionSecondaryFocused,
                pressed && styles.pressed,
              ]}
            >
              <Feather
                name={item.icon}
                size={18}
                color={primary ? colors.onPrimary : colors.primary}
              />
              <Text
                style={[
                  styles.actionText,
                  primary
                    ? styles.actionTextPrimary
                    : styles.actionTextSecondary,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.divider} />

      {MENU_ITEMS.map(item => {
        const focused = activeRoute === item.route;
        return (
          <Pressable
            key={item.route}
            accessibilityRole="button"
            accessibilityState={{ selected: focused }}
            onPress={() => go(item.route)}
            style={({ pressed }) => [
              styles.item,
              focused && styles.itemFocused,
              pressed && styles.pressed,
            ]}
          >
            <Feather
              name={item.icon}
              size={18}
              color={focused ? colors.primary : colors.textMuted}
            />
            <Text style={[styles.itemText, focused && styles.itemTextFocused]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  brand: {
    fontFamily: fonts.serif,
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
    marginBottom: 20,
  },
  quickActions: {
    gap: 10,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 12,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
  },
  actionSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionSecondaryFocused: {
    borderColor: colors.primary,
  },
  actionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionTextPrimary: {
    color: colors.onPrimary,
  },
  actionTextSecondary: {
    color: colors.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 20,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
  },
  itemFocused: {
    backgroundColor: colors.primarySoft,
  },
  itemText: {
    fontSize: 15,
    color: colors.text,
  },
  itemTextFocused: {
    color: colors.primary,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
