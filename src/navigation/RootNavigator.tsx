import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AiModel from '../screens/aiModel/aiModel';
import Categories from '../screens/categories/categories';
import CategoryEdit from '../screens/categoryEdit/categoryEdit';
import { colors } from '../theme';
import AppDrawer from './AppDrawer';
import AuthStack from './AuthStack';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * "Auth" fica fora do drawer. Enquanto não houver login, o app abre direto
 * em "App". Quando a autenticação existir, a rota inicial vai depender da sessão.
 */
export default function RootNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="App"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="App" component={AppDrawer} />
      <Stack.Screen name="Auth" component={AuthStack} />
      <Stack.Group
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="Categories"
          component={Categories}
          options={{ title: 'Categorias' }}
        />
        <Stack.Screen
          name="CategoryEdit"
          component={CategoryEdit}
          options={({ route }) => ({
            title: route.params?.categoryId
              ? 'Editar categoria'
              : 'Nova categoria',
          })}
        />
        <Stack.Screen
          name="AiModel"
          component={AiModel}
          options={{ title: 'Modelo de IA' }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}
