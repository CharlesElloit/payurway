import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import FingerprintScanner, { ScannerStatus } from '../components/FingerprintScanner';

interface BiometricLoginScreenProps {
    userName: string;
    avatarUrl: string;
    onAuthenticated: () => void;
}

export default function BiometricLoginScreen({ userName, avatarUrl, onAuthenticated }: BiometricLoginScreenProps) {
    const [scannerStatus, setScannerStatus] = useState<ScannerStatus>('idle');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [biometricLabel, setBiometricLabel] = useState('Biometrics');
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (resetTimer.current) clearTimeout(resetTimer.current);
        };
    }, []);

    const promptAuth = useCallback(async () => {
        setErrorMessage(null);
        // Our own animated scanner starts immediately — this is the UI the person
        // actually watches. The OS-level Face ID / fingerprint confirmation below
        // is mandated by the platform and can't be replaced, but Face ID has no
        // real system UI, and Android's biometric sheet only appears briefly.
        setScannerStatus('scanning');

        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                setScannerStatus('error');
                setErrorMessage(
                    !hasHardware
                        ? 'This device has no biometric hardware.'
                        : 'No biometrics are enrolled on this device. Add one in your device settings.'
                );
                resetTimer.current = setTimeout(() => setScannerStatus('idle'), 1400);
                return;
            }

            const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
            setBiometricLabel(
                types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION) ? 'Face ID' : 'Fingerprint'
            );

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Unlock PayMyBills',
                cancelLabel: 'Cancel',
                disableDeviceFallback: false,
            });

            if (result.success) {
                setScannerStatus('success');
                // Let the checkmark/ring animation play before handing off to Home.
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
    }, [onAuthenticated]);

    // Attempt automatically once on mount, like most banking apps do.
    useEffect(() => {
        promptAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const statusLabel =
        scannerStatus === 'scanning'
            ? `Waiting for ${biometricLabel}…`
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
                        <Text style={[styles.statusText, scannerStatus === 'success' && styles.statusTextSuccess]}>
                            {statusLabel}
                        </Text>
                    )}
                    {scannerStatus === 'error' && errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
                </View>

                <View style={styles.bottom}>
                    <TouchableOpacity
                        style={styles.primaryButton}
                        activeOpacity={0.9}
                        onPress={promptAuth}
                        disabled={scannerStatus === 'scanning' || scannerStatus === 'success'}
                    >
                        <Ionicons name="finger-print" size={rf(18)} color={colors.onAccent} style={{ marginRight: 8 }} />
                        <Text style={styles.primaryButtonText}>
                            {scannerStatus === 'scanning' ? 'Authenticating…' : `Unlock with ${biometricLabel}`}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.7} onPress={onAuthenticated}>
                        <Text style={styles.secondaryButtonText}>Use passcode instead</Text>
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