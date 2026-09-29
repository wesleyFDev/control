import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Feather,
  type FeatherIconName,
} from '@react-native-vector-icons/feather/static';

import Chat from '../screens/chat/chat';
import type { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconProps = { color: string; size: number };

function createTabIcon(name: FeatherIconName) {
  return ({ color, size }: TabIconProps) => (
    <Feather name={name} color={color} size={size} />
  );
}

const ChatIcon = createTabIcon('message-circle');
const ExpensesIcon = createTabIcon('list');
const ReportsIcon = createTabIcon('pie-chart');
const MembersIcon = createTabIcon('users');

export default function MainTabs() {
  return (
    <Tab.Navigator initialRouteName="Chat">
      <Tab.Screen
        name="Chat"
        component={Chat}
        options={{ title: 'Chat', tabBarIcon: ChatIcon }}
      />
     
    </Tab.Navigator>
  );
}
