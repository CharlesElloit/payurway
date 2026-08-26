import React, { useEffect, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RegistrationScreen from './src/screens/RegistrationScreen';
import OtpVerificationScreen from './src/screens/OtpVerificationScreen';
import BiometricLoginScreen from './src/screens/BiometricLoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PasswordModal from './src/components/PasswordModal';
import { configureNotifications } from './src/utils/notifications';
import { Country, defaultCountry } from './src/constants/countries';
import { colors } from './src/theme/colors';
import { apiClient } from './src/services/api';
import { authService } from './src/services/authService';
import { getBiometricPrefs, BiometricPrefs } from './src/utils/biometricPrefs';

const HAS_REGISTERED_KEY = 'pmb_has_registered';
const USER_STORAGE_KEY = 'pmb_user';

type AppStage = 'loading' | 'registration' | 'otp' | 'biometric' | 'home';

interface StoredUser {
  id: string;
  phone: string;
  firstName?: string;
  lastName?: string;
  isVerified: boolean;
}

export default function App() {
  const [stage, setStage] = useState<AppStage>('loading');
  const [country, setCountry] = useState<Country>(defaultCountry);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [serverOtp, setServerOtp] = useState('');
  const [currentUser, setCurrentUser] = useState<StoredUser | null>(null);
  const [registrationPhone, setRegistrationPhone] = useState('');
  const [biometricPrefs, setBiometricPrefs] = useState<BiometricPrefs>({
    enabled: false,
    type: 'fingerprint',
    isDefault: false,
    credentialId: null,
  });

  // Password-modal flow state
  const [showSetPasswordModal, setShowSetPasswordModal] = useState(false);
  const [showLoginPasswordModal, setShowLoginPasswordModal] = useState(false);
  const [pendingFullPhone, setPendingFullPhone] = useState('');
  const [pendingCountry, setPendingCountry] = useState<Country>(defaultCountry);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const refreshBiometricPrefs = useCallback(async () => {
    const prefs = await getBiometricPrefs();
    setBiometricPrefs(prefs);
    return prefs;
  }, []);

  useEffect(() => {
    configureNotifications();
    (async () => {
      try {
        await apiClient.init();
        const flag = await AsyncStorage.getItem(HAS_REGISTERED_KEY);
        const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
        const prefs = await getBiometricPrefs();
        setBiometricPrefs(prefs);

        if (flag === 'true' && userJson) {
          setCurrentUser(JSON.parse(userJson));
          if (prefs.enabled && prefs.isDefault && apiClient.getAccessToken()) {
            setStage('biometric');
          } else if (apiClient.getAccessToken()) {
            setStage('home');
          } else {
            setStage('registration');
          }
        } else {
          setStage('registration');
        }
      } catch {
        setStage('registration');
      }
    })();
  }, []);

  useEffect(() => {
    if (stage === 'registration') {
      refreshBiometricPrefs();
    }
  }, [stage, refreshBiometricPrefs]);

  // ── Step 1: user entered phone and pressed Continue ──
  const handleRegistrationContinue = useCallback(
    async ({ country: c, phoneNumber: p }: { country: Country; phoneNumber: string }) => {
      setCountry(c);
      setPendingCountry(c);
      setPhoneNumber(p);
      const fullPhone = `${c.dialCode}${p}`;
      setRegistrationPhone(fullPhone);
      setPendingFullPhone(fullPhone);

      try {
        const check = await authService.checkPhone(fullPhone);

        if (!check.exists) {
          // New number → ask to set a password
          setShowSetPasswordModal(true);
          return;
        }

        // Existing number → check biometric default
        const prefs = await getBiometricPrefs();
        setBiometricPrefs(prefs);
        if (prefs.enabled && prefs.isDefault && prefs.credentialId) {
          // Biometric is default → prompt biometric, with password as fallback
          // Set a placeholder currentUser so BiometricLoginScreen can render
          setCurrentUser({ id: 'pending', phone: fullPhone, isVerified: check.isVerified });
          setStage('biometric');
          return;
        }

        // Otherwise ask for password
        setShowLoginPasswordModal(true);
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to check phone. Please try again.');
      }
    },
    []
  );

  // ── New user: set password → register → OTP ──
  const handleSetPasswordSubmit = useCallback(
    async (password: string) => {
      setIsAuthLoading(true);
      try {
        const result: any = await authService.register({
          phone: pendingFullPhone,
          password,
        });

        // New user always gets OTP
        if (result.otp) {
          setServerOtp(result.otp);
          setShowSetPasswordModal(false);
          setStage('otp');
          return;
        }
        // Fallback if backend returns requiresVerification
        if (result.requiresVerification) {
          const otpResult = await authService.resendOtp(pendingFullPhone);
          setServerOtp(otpResult.otp);
          setShowSetPasswordModal(false);
          setStage('otp');
          return;
        }
        // Unexpected: direct login (should not happen for new user)
        if (result.accessToken && result.refreshToken) {
          await apiClient.setTokens(result.accessToken, result.refreshToken);
          const user = result.user;
          setCurrentUser(user);
          await AsyncStorage.setItem(HAS_REGISTERED_KEY, 'true');
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
          setShowSetPasswordModal(false);
          const prefs = await getBiometricPrefs();
          if (prefs.enabled && prefs.isDefault) setStage('biometric');
          else setStage('home');
        }
      } catch (error: any) {
        Alert.alert('Error', error?.message || 'Failed to register. Please try again.');
      } finally {
        setIsAuthLoading(false);
      }
    },
    [pendingFullPhone]
  );

  // ── Existing user: enter password → login ──
  const handleLoginPasswordSubmit = useCallback(
    async (password: string) => {
      setIsAuthLoading(true);
      try {
        const result: any = await authService.login(pendingFullPhone, password);

        if (result.requiresVerification) {
          // Unverified → OTP flow
          const otp = result.otp || (await authService.resendOtp(pendingFullPhone)).otp;
          setServerOtp(otp);
          setShowLoginPasswordModal(false);
          setStage('otp');
          return;
        }

        if (result.accessToken && result.refreshToken) {
          await apiClient.setTokens(result.accessToken, result.refreshToken);
          const user = result.user;
          setCurrentUser(user);
          await AsyncStorage.setItem(HAS_REGISTERED_KEY, 'true');
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
          const prefs = await getBiometricPrefs();
          setBiometricPrefs(prefs);
          setShowLoginPasswordModal(false);
          // If this phone was used for biometric before, keep biometric default behavior
          if (prefs.enabled && prefs.isDefault) {
            setStage('biometric');
          } else {
            setStage('home');
          }
          return;
        }

        // Fallback
        Alert.alert('Error', 'Unexpected login response.');
      } catch (error: any) {
        // For legacy users created with deterministic password, try fallback
        const legacyPwd = `PMB_${pendingFullPhone}_auth`;
        if (error?.statusCode === 401 || error?.message?.toLowerCase().includes('invalid')) {
          try {
            const fallback: any = await authService.login(pendingFullPhone, legacyPwd);
            if (fallback.accessToken) {
              await apiClient.setTokens(fallback.accessToken, fallback.refreshToken);
              const user = fallback.user;
              setCurrentUser(user);
              await AsyncStorage.setItem(HAS_REGISTERED_KEY, 'true');
              await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
              setShowLoginPasswordModal(false);
              Alert.alert(
                'Password updated?',
                'Your account used an old password. Please update it in Profile → Change Password.'
              );
              setStage('home');
              return;
            }
          } catch {
            // ignore fallback
          }
        }
        Alert.alert('Error', error?.message || 'Invalid password. Please try again.');
      } finally {
        setIsAuthLoading(false);
      }
    },
    [pendingFullPhone]
  );

  const handleResendOtp = useCallback(async () => {
    try {
      const result = await authService.resendOtp(registrationPhone);
      setServerOtp(result.otp);
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to resend code. Please try again.');
    }
  }, [registrationPhone]);

  const handleOtpVerified = useCallback(async () => {
    try {
      const result = await authService.verifyOtp(registrationPhone, serverOtp);
      await apiClient.setTokens(result.accessToken, result.refreshToken);
      const user = result.user;
      setCurrentUser(user);
      await AsyncStorage.setItem(HAS_REGISTERED_KEY, 'true');
      await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      const prefs = await getBiometricPrefs();
      setBiometricPrefs(prefs);
      if (prefs.enabled && prefs.isDefault) {
        setStage('biometric');
      } else {
        setStage('home');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Verification failed. Please try again.');
    }
  }, [registrationPhone, serverOtp]);

  const handleBiometricAuthenticated = useCallback(
    async (userFromBiometric?: StoredUser) => {
      if (userFromBiometric) {
        setCurrentUser(userFromBiometric);
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userFromBiometric));
        await AsyncStorage.setItem(HAS_REGISTERED_KEY, 'true');
      } else if (currentUser) {
        // Try to refresh user from token if we have a placeholder
        try {
          const profile = await authService.getProfile();
          setCurrentUser(profile as any);
          await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(profile));
        } catch {
          // keep placeholder
        }
      }
      setStage('home');
    },
    [currentUser]
  );

  const handleBiometricQuickLogin = useCallback(() => {
    // From registration screen biometric circle (quick access)
    if (currentUser) {
      setStage('biometric');
    } else {
      (async () => {
        const userJson = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (userJson) {
          setCurrentUser(JSON.parse(userJson));
          setStage('biometric');
        } else if (pendingFullPhone) {
          // Use pending phone as placeholder for biometric login
          setCurrentUser({ id: 'pending', phone: pendingFullPhone, isVerified: true });
          setStage('biometric');
        } else {
          Alert.alert('No account', 'Please enter your phone number to continue, then you can use biometrics on next login.');
        }
      })();
    }
  }, [currentUser, pendingFullPhone]);

  const handleLogout = useCallback(async () => {
    await apiClient.logout();
    await AsyncStorage.removeItem(USER_STORAGE_KEY);
    setCurrentUser(null);
    await refreshBiometricPrefs();
    setStage('registration');
  }, [refreshBiometricPrefs]);

  const handleBiometricFallback = useCallback(() => {
    // User tapped "Use password instead" on biometric screen
    setShowLoginPasswordModal(true);
  }, []);

  // When user chooses "Use biometric instead" from password modal, close it and show biometric
  const handleSwitchToBiometric = useCallback(() => {
    setShowLoginPasswordModal(false);
    if (pendingFullPhone) {
      setCurrentUser({ id: 'pending', phone: pendingFullPhone, isVerified: true });
      setStage('biometric');
    } else {
      Alert.alert('Error', 'No phone set for biometric.');
    }
  }, [pendingFullPhone]);

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
      {stage === 'registration' && (
        <RegistrationScreen
          onContinue={handleRegistrationContinue}
          onBiometricPress={handleBiometricQuickLogin}
          biometricEnabled={biometricPrefs.enabled}
          biometricType={biometricPrefs.type}
        />
      )}

      {stage === 'otp' && (
        <OtpVerificationScreen
          phoneNumber={phoneNumber}
          country={pendingCountry || country}
          expectedCode={serverOtp}
          onVerified={handleOtpVerified}
          onBack={() => setStage('registration')}
          onResend={handleResendOtp}
        />
      )}

      {stage === 'biometric' && currentUser && (
        <BiometricLoginScreen
          userName={currentUser.firstName || currentUser.phone}
          avatarUrl={`https://i.pravatar.cc/150?u=${currentUser.id}`}
          userPhone={currentUser.phone}
          onAuthenticated={handleBiometricAuthenticated}
          onFallback={handleBiometricFallback}
        />
      )}

      {stage === 'home' && currentUser && <HomeScreen onLogout={handleLogout} user={currentUser} />}

      {/* Password modals overlay any stage so they remain accessible */}
      <PasswordModal
        visible={showSetPasswordModal}
        mode="create"
        phone={pendingFullPhone}
        onSubmit={handleSetPasswordSubmit}
        onClose={() => setShowSetPasswordModal(false)}
        loading={isAuthLoading}
      />
      <PasswordModal
        visible={showLoginPasswordModal}
        mode="login"
        phone={pendingFullPhone}
        onSubmit={handleLoginPasswordSubmit}
        onClose={() => setShowLoginPasswordModal(false)}
        loading={isAuthLoading}
        biometricAvailable={!!(biometricPrefs.enabled && biometricPrefs.credentialId)}
        onUseBiometric={handleSwitchToBiometric}
      />
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
