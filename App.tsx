import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RegistrationScreen from './src/screens/RegistrationScreen';
import OtpVerificationScreen from './src/screens/OtpVerificationScreen';
import BiometricLoginScreen from './src/screens/BiometricLoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import { user } from './src/constants/mockData';
import { configureNotifications } from './src/utils/notifications';
import { generateOtpCode } from './src/utils/otp';
import { Country, defaultCountry } from './src/constants/countries';
import { colors } from './src/theme/colors';

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

      {stage === 'home' && <HomeScreen />}
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