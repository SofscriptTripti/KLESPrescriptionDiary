
import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { RootNavigator } from './src/navigation/RootNavigator';
import { requestStartupPermissions } from './src/utils/permissions';

function App() {
  useEffect(() => {
    // Fires as soon as the app starts, matching the installed MAUI package's
    // permission-prompt behavior — see src/utils/permissions.ts for why.
    requestStartupPermissions();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* This RN version (edge-to-edge enforced on Android) removed
            StatusBar's backgroundColor/translucent props entirely — the status
            bar is always transparent now. The grey backdrop behind its icons
            is painted by Screen.tsx's top safe-area strip instead. */}
        <StatusBar barStyle="light-content" />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default App;
