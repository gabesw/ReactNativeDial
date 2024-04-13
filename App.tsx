import 'react-native-gesture-handler';
import 'react-native-reanimated';

import { GestureHandlerRootView } from 'react-native-gesture-handler';
import React from 'react';
import { Text } from 'react-native';
// You can import from local files
import { Dial } from './components/RadialControl';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import tailwind from 'twrnc';

export default function App() {
  return (
    <GestureHandlerRootView
      style={tailwind.style('flex-1 justify-center bg-gray-100')}>
      <SafeAreaProvider>
        <Dial
          onValueChange={(angle) => {console.warn("Angle has changed to:", angle)}}
          highlightAllPrevious={false}
          num_notches={3}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
