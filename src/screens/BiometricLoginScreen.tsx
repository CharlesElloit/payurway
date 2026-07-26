import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';

type AuthStatus = 'checking' | 'idle' | 'authenticating' | 'error' | 'unsupported';

interface BiometricLoginScreenProps {
    userName: string;
    avatarUrl: string;
    onAuthenticated: () => void;
}

export default function BiometricLoginScreen({ userName, avatarUrl, onAuthenticated }: BiometricLoginScreenProps) {
    const [status, setStatus] = useState<AuthStatus>('checking');
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [biometricLabel, setBiometricLabel] = useState('Biometrics');

    const pulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1.12, duration: 900, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.in(Easing.ease), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [pulse]);

    const promptAuth = useCallback(async () => {
        setErrorMessage(null);
        setStatus('authenticating');

        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                setStatus('unsupported');
                setErrorMessage(
                    !hasHardware
                        ? 'This device has no biometric hardware.'
                        : 'No biometrics are enrolled on this device. Add one in your device settings.'
                );
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
                onAuthenticated();
            } else {
                setStatus('error');
                setErrorMessage('Authentication was cancelled or did not match. Try again.');
            }
        } catch (err) {
            setStatus('error');
            setErrorMessage('Something went wrong starting biometric authentication.');
        }
    }, [onAuthenticated]);

    // Attempt automatically once on mount, like most banking apps do.
    useEffect(() => {
        promptAuth();
    }, [promptAuth]);

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.content}>
                <View style={styles.top}>
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    <Text style={styles.greeting}>Welcome back, {userName.split(' ')[0]}</Text>
                    <Text style={styles.subtitle}>Verify it's you to unlock your account</Text>
                </View>

                <View style={styles.middle}>
                    <Animated.View style={[styles.iconRing, { transform: [{ scale: pulse }] }]}>
                        <View style={styles.iconCircle}>
                            <Ionicons name="finger-print" size={rf(46)} color={colors.accent} />
                        </View>
                    </Animated.View>

                    {status === 'authenticating' && <Text style={styles.statusText}>Waiting for {biometricLabel}…</Text>}
                    {(status === 'error' || status === 'unsupported') && errorMessage && (
                        <Text style={styles.errorText}>{errorMessage}</Text>
                    )}
                </View>

                <View style={styles.bottom}>
                    <TouchableOpacity style={styles.primaryButton} activeOpacity={0.9} onPress={promptAuth}>
                        <Ionicons name="finger-print" size={rf(18)} color={colors.onAccent} style={{ marginRight: 8 }} />
                        <Text style={styles.primaryButtonText}>
                            {status === 'authenticating' ? 'Authenticating…' : `Unlock with ${biometricLabel}`}
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
    iconRing: {
        width: moderateScale(140),
        height: moderateScale(140),
        borderRadius: moderateScale(70),
        borderWidth: 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        width: moderateScale(104),
        height: moderateScale(104),
        borderRadius: moderateScale(52),
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statusText: {
        marginTop: moderateScale(16),
        fontSize: rf(13),
        color: colors.textSecondary,
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