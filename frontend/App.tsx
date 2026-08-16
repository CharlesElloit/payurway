import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RegistrationScreen from './frontend/src/screens/RegistrationScreen';
import OtpVerificationScreen from './frontend/src/screens/OtpVerificationScreen';
import BiometricLoginScreen from './frontend/src/screens/BiometricLoginScreen';
import HomeScreen from './frontend/src/screens/HomeScreen';
import { user } from './frontend/src/constants/mockData';
import { configureNotifications } from './frontend/src/utils/notifications';
import { generateOtpCode } from './frontend/src/utils/otp';
import { Country, defaultCountry } from './frontend/src/constants/countries';
import { colors } from './frontend/src/theme/colors';

const HAS_REGISTERED_KEY = 'pmb_has_registered';

type AppStage = 'loading' | 'registration' | 'otp' | 'biometric' | 'home';

export default function App() {
  const [stage, setStage] = useState<AppStage>('loading');
  const [country, setCountry] = useState<Country>(defaultCountry);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');

  useEffect(() => {
    configureNotifications();
    (async () => {
      try {
        const flag = await AsyncStorage.getItem(HAS_REGISTERED_KEY);
        setStage(flag === 'true' ? 'biometric' : 'registration');
      } catch {
        setStage('registration');
      }
    })();
  }, []);

  const handleRegistrationContinue = ({ country: c, phoneNumber: p }: { country: Country; phoneNumber: string }) => {
    setCountry(c);
    setPhoneNumber(p);
    setOtpCode(generateOtpCode());
    setStage('otp');
  };

  const handleResendOtp = () => {
    setOtpCode(generateOtpCode());
  };

  const handleOtpVerified = async () => {
    try {
      await AsyncStorage.setItem(HAS_REGISTERED_KEY, 'true');
    } catch {
      // Non-fatal
    }
    setStage('biometric');
  };

  // Handler passed to HomeScreen & ProfileScreen to redirect back to registration
  const handleLogout = () => {
    setStage('registration');
  };

  if (stage === 'loading') {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      {stage === 'registration' && <RegistrationScreen onContinue={handleRegistrationContinue} />}

      {stage === 'otp' && (
        <OtpVerificationScreen
          phoneNumber={phoneNumber}
          country={country}
          expectedCode={otpCode}
          onVerified={handleOtpVerified}
          onBack={() => setStage('registration')}
          onResend={handleResendOtp}
        />
      )}

      {stage === 'biometric' && (
        <BiometricLoginScreen
          userName={user.name}
          avatarUrl={user.avatarUrl}
          onAuthenticated={() => setStage('home')}
        />
      )}

      {stage === 'home' && <HomeScreen onLogout={handleLogout} />}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});