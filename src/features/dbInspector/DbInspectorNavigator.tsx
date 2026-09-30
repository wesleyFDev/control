import React from 'react';
import { Pressable } from 'react-native';
import { Feather } from '@react-native-vector-icons/feather/static';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { colors } from '../../theme';
import TableScreen from './screens/TableScreen';
import TablesScreen from './screens/TablesScreen';

export type DbInspectorParamList = {
  DbTables: undefined;
  DbTable: { table: string };
};

const Stack = createNativeStackNavigator<DbInspectorParamList>();

function MenuButton() {
  const navigation = useNavigation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Abrir menu"
      hitSlop={12}
      onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
    >
      <Feather name="menu" size={22} color={colors.text} />
    </Pressable>
  );
}

/**
 * Pilha própria da ferramenta, dentro de uma única tela do drawer.
 * Assim toda a navegação dela fica nesta pasta e sai junto ao remover.
 */
export default function DbInspectorNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="DbTables"
        component={TablesScreen}
        options={{ title: 'Banco de dados', headerLeft: MenuButton }}
      />
      <Stack.Screen
        name="DbTable"
        component={TableScreen}
        options={({ route }) => ({ title: route.params.table })}
      />
    </Stack.Navigator>
  );
}
