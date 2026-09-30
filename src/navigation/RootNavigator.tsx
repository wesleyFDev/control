import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
    </Stack.Navigator>
  );
}
