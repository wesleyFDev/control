import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Login from '../screens/auth/login/login';
import Register from '../screens/auth/register/register';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen
        name="Login"
        component={Login}
        options={{ title: 'Entrar' }}
      />
      <Stack.Screen
        name="Register"
        component={Register}
        options={{ title: 'Criar conta' }}
      />
    </Stack.Navigator>
  );
}
