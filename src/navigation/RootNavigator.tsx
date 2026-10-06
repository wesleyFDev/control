import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useSession } from '../backend/session';
import { backendConfigured } from '../config/backend';
import AiModel from '../screens/aiModel/aiModel';
import BankDetail from '../screens/banks/bankDetail';
import BankNotificationsScreen from '../screens/bankNotifications/bankNotifications';
import CardForm from '../screens/bills/cardForm';
import InvoiceScreen from '../screens/bills/invoice';
import PayableForm from '../screens/bills/payableForm';
import Categories from '../screens/categories/categories';
import PluggyIntegration from '../screens/pluggy/pluggy';
import CategoryEdit from '../screens/categoryEdit/categoryEdit';
import { colors } from '../theme';
import AppDrawer from './AppDrawer';
import AuthStack from './AuthStack';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * "Auth" fica fora do drawer. Sem sessão, só as telas de entrar e criar
 * conta existem; ao entrar, a navegação troca sozinha para o app. A sessão
 * fica guardada no aparelho, então o app abre direto mesmo sem internet.
 * Enquanto o backend não estiver configurado, o app abre sem login.
 */
export default function RootNavigator() {
  const { loading, session } = useSession();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (backendConfigured && !session) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthStack} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName="App"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="App" component={AppDrawer} />
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
        <Stack.Screen
          name="Pluggy"
          component={PluggyIntegration}
          options={{ title: 'Pluggy' }}
        />
        <Stack.Screen
          name="BankNotifications"
          component={BankNotificationsScreen}
          options={{ title: 'Notificações do banco' }}
        />
        <Stack.Screen
          name="BankDetail"
          component={BankDetail}
          options={{ title: 'Banco' }}
        />
        <Stack.Screen
          name="CardForm"
          component={CardForm}
          options={({ route }) => ({
            title: route.params?.cardId ? 'Editar cartão' : 'Novo cartão',
          })}
        />
        <Stack.Screen
          name="PayableForm"
          component={PayableForm}
          options={({ route }) => ({
            title:
              route.params?.kind === 'boleto' ? 'Novo boleto' : 'Nova compra',
          })}
        />
        <Stack.Screen
          name="Invoice"
          component={InvoiceScreen}
          options={{ title: 'Fatura' }}
        />
      </Stack.Group>
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
});
