import React, { useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BiometricLoginScreen from './src/screens/BiometricLoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import { user } from './src/constants/mockData';

export default function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);

  return (
    <SafeAreaProvider>
      {isUnlocked ? (
        <HomeScreen />
      ) : (
        <BiometricLoginScreen
          userName={user.name}
          avatarUrl={user.avatarUrl}
          onAuthenticated={() => setIsUnlocked(true)}
        />
      )}
    </SafeAreaProvider>
  );
}