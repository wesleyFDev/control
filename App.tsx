import React from 'react';
import { StatusBar, StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import DatabaseGate from './src/db/DatabaseGate';
import ModelGate from './src/features/aiSetup/ModelGate';
import NotificationsIngestor from './src/integrations/notifications/NotificationsIngestor';
import Navigation from './src/navigation';
import FamilySyncer from './src/sync/FamilySyncer';

export default function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <DatabaseGate>
          <ModelGate>
            <NotificationsIngestor />
            <FamilySyncer />
            <Navigation />
          </ModelGate>
        </DatabaseGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
