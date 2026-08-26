import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import FingerprintScanner, { ScannerStatus } from '../components/FingerprintScanner';
import { apiClient } from '../services/api';
import { authService } from '../services/authService';
import { getBiometricPrefs, BiometricType, BIOMETRIC_CREDENTIAL_KEY } from '../utils/biometricPrefs';

interface BiometricLoginScreenProps {
    userName: string;
    avatarUrl: string;
    userPhone: string;
    onAuthenticated: () => void;
    onFallback?: () => void;
}

export default function BiometricLoginScreen({
    userName,
    avatarUrl,
    userPhone,
    onAuthenticated,
    onFallback,
}: BiometricLoginScreenProps) {
    const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [biometricLabel, setBiometricLabel] = useState('Biometrics');
    const [biometricType, setBiometricType] = useState<BiometricType>('fingerprint');
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        (async () => {
            const prefs = await getBiometricPrefs();
            setBiometricType(prefs.type);
            if (prefs.type === 'face') setBiometricLabel('Face ID');
            else if (prefs.type === 'voice') setBiometricLabel('Voice');
            else setBiometricLabel('Fingerprint');
        })();
        return () => {
            if (resetTimer.current) clearTimeout(resetTimer.current);
        };
    }, []);

    const registerBiometricCredential = useCallback(async () => {
        try {
            const existing = await AsyncStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
            if (existing) return;

            const challengeRes = await authService.getBiometricChallenge();
            const credentialId = `bio_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
            const publicKey = `device_key_${credentialId}`;

            await authService.registerBiometric({
                credentialId,
                publicKey,
                deviceName: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} Device`,
                deviceType: biometricType,
            });

            await AsyncStorage.setItem(
                BIOMETRIC_CREDENTIAL_KEY,
                JSON.stringify({ credentialId, registeredAt: new Date().toISOString(), type: biometricType })
            );
        } catch {
            // Non-critical — biometric registration is optional
        }
    }, []);

    const handleBiometricLogin = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
            if (!stored) return;

            const { credentialId } = JSON.parse(stored);
            const challengeRes = await authService.getBiometricLoginChallenge();

            const result = await authService.biometricLogin({
                phone: userPhone,
                credentialId,
                signature: `device_signed_${challengeRes.challenge}`,
                challenge: challengeRes.challenge,
            });

            await apiClient.setTokens(result.accessToken, result.refreshToken);
        } catch {
            // Biometric login may fail if credential is stale — non-fatal
        }
    }, [userPhone]);

    const promptAuth = useCallback(async () => {
        setErrorMessage(null);
        setScannerStatus('scanning');

        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                // For voice type we still require mic, but if no biometric hardware and type is voice allow fallback prompt
                if (biometricType !== 'voice') {
                    setScannerStatus('error');
                    setErrorMessage(
                        !hasHardware
                            ? 'This device has no biometric hardware.'
                            : 'No biometrics are enrolled on this device. Add one in your device settings.'
                    );
                    resetTimer.current = setTimeout(() => setScannerStatus('idle'), 1400);
                    return;
                }
            }

            // If prefs specify explicit label, keep it; otherwise infer from hardware
            if (biometricType === 'fingerprint' || biometricType === 'face') {
                const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
                const inferred =
                    biometricType === 'face'
                        ? 'Face ID'
                        : types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) && biometricType === 'fingerprint'
                          ? 'Fingerprint'
                          : biometricType === 'fingerprint'
                            ? 'Fingerprint'
                            : biometricLabel;
                setBiometricLabel(inferred);
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock PayMyBills',
                cancelLabel: 'Cancel',
                disableDeviceFallback: false,
            });

            if (result.success) {
                setScannerStatus('success');
                await registerBiometricCredential();
                await handleBiometricLogin();
                resetTimer.current = setTimeout(onAuthenticated, 500);
            } else {
                setScannerStatus('error');
                setErrorMessage('Authentication was cancelled or did not match. Try again.');
                resetTimer.current = setTimeout(() => setScannerStatus('idle'), 1400);
            }
        } catch (err) {
            setScannerStatus('error');
            setErrorMessage('Something went wrong starting biometric authentication.');
            resetTimer.current = setTimeout(() => setScannerStatus('idle'), 1400);
        }
    }, [onAuthenticated, registerBiometricCredential, handleBiometricLogin, biometricType, biometricLabel]);

    useEffect(() => {
        promptAuth();
    }, []);

    const statusLabel =
        scannerStatus === 'scanning'
            ? `Waiting for ${biometricLabel}\u2026`
            : scannerStatus === 'success'
                ? 'Verified'
                : null;

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.content}>
                <View style={styles.top}>
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    <Text style={styles.greeting}>Welcome back, {userName.split(' ')[0]}</Text>
                    <Text style={styles.subtitle}>Verify it's you to unlock your account</Text>
                </View>

                <View style={styles.middle}>
                    <FingerprintScanner status={scannerStatus} size={moderateScale(150)} />

                    {statusLabel && (
                        <Text
                            style={[
                                styles.statusText,
                                scannerStatus === 'success' && styles.statusTextSuccess,
                            ]}
                        >
                            {statusLabel}
                        </Text>
                    )}
                    {scannerStatus === 'error' && errorMessage && (
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    )}
                </View>

                <View style={styles.bottom}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        activeOpacity={0.9}
                        onPress={promptAuth}
                        disabled={scannerStatus === 'scanning' || scannerStatus === 'success'}
                    >
                        <Ionicons
                            name={biometricType === 'face' ? 'scan-outline' : biometricType === 'voice' ? 'mic-outline' : 'finger-print'}
                            size={rf(18)}
                            color={colors.onAccent}
                            style={{ marginRight: 8 }}
                        />
                        <Text style={styles.primaryButtonText}>
                            {scannerStatus === 'scanning'
                                ? 'Authenticating\u2026'
                                : `Unlock with ${biometricLabel}`}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        activeOpacity={0.7}
                        onPress={onFallback ?? onAuthenticated}
                    >
                        <Text style={styles.secondaryButtonText}>Use password instead</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        paddingHorizontal: moderateScale(24),
        justifyContent: 'space-between',
    },
    top: {
        alignItems: 'center',
        marginTop: moderateScale(48),
    },
    avatar: {
        width: moderateScale(76),
        height: moderateScale(76),
        borderRadius: moderateScale(38),
        marginBottom: moderateScale(16),
        borderWidth: 2,
        borderColor: colors.accent,
    },
    greeting: {
        fontSize: rf(20),
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: rf(13),
        color: colors.textSecondary,
        marginTop: moderateScale(6),
        textAlign: 'center',
    },
    middle: {
        alignItems: 'center',
    },
    statusText: {
        marginTop: moderateScale(16),
        fontSize: rf(13),
        color: colors.textSecondary,
    },
    statusTextSuccess: {
        color: colors.success,
        fontWeight: '700',
    },
    errorText: {
        marginTop: moderateScale(16),
        fontSize: rf(13),
        color: colors.danger,
        textAlign: 'center',
        paddingHorizontal: moderateScale(16),
    },
    bottom: {
        marginBottom: moderateScale(32),
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
        borderRadius: moderateScale(28),
        height: moderateScale(52),
    },
    primaryButtonText: {
        fontSize: rf(15),
        fontWeight: '700',
        color: colors.onAccent,
    },
    secondaryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: moderateScale(16),
        paddingVertical: moderateScale(8),
    },
    secondaryButtonText: {
        fontSize: rf(13),
        color: colors.textSecondary,
        fontWeight: '600',
    },
});
