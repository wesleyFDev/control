import React from 'react';
import {
  createDrawerNavigator,
  type DrawerContentComponentProps,
} from '@react-navigation/drawer';

// Ferramenta temporária. Ver src/features/dbInspector/README.md.
import DbInspectorNavigator from '../features/dbInspector/DbInspectorNavigator';
import Chat from '../screens/chat/chat';
import Details from '../screens/details/details';
import Family from '../screens/family/family';
import NewExpense from '../screens/newExpense/newExpense';
import Profile from '../screens/profile/profile';
import Reports from '../screens/reports/reports';
import Settings from '../screens/settings/settings';
import { colors } from '../theme';
import DrawerContent from './DrawerContent';
import type { AppDrawerParamList } from './types';

const Drawer = createDrawerNavigator<AppDrawerParamList>();

function renderDrawerContent(props: DrawerContentComponentProps) {
  return <DrawerContent {...props} />;
}

export default function AppDrawer() {
  return (
    <Drawer.Navigator
      initialRouteName="Chat"
      drawerContent={renderDrawerContent}
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTintColor: colors.text,
        drawerStyle: { backgroundColor: colors.background },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Drawer.Screen
        name="Chat"
        component={Chat}
        options={{ title: 'Chat com a IA', headerShown: false }}
      />
      <Drawer.Screen
        name="NewExpense"
        component={NewExpense}
        options={{ title: 'Adicionar gasto' }}
      />
      <Drawer.Screen
        name="Reports"
        component={Reports}
        options={{ title: 'Relatórios' }}
      />
      <Drawer.Screen
        name="Details"
        component={Details}
        options={{ title: 'Detalhes' }}
      />
      <Drawer.Screen
        name="Family"
        component={Family}
        options={{ title: 'Família' }}
      />
      <Drawer.Screen
        name="Profile"
        component={Profile}
        options={{ title: 'Perfil' }}
      />
      <Drawer.Screen
        name="Settings"
        component={Settings}
        options={{ title: 'Configurações' }}
      />
      <Drawer.Screen
        name="DbInspector"
        component={DbInspectorNavigator}
        options={{ title: 'Banco de dados', headerShown: false }}
      />
    </Drawer.Navigator>
  );
}
