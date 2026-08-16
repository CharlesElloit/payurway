import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import { Country } from '../constants/countries';
import { sendOtpNotification, listenForOtpNotification } from '../utils/notifications';

interface OtpVerificationScreenProps {
    phoneNumber: string;
    country: Country;
    expectedCode: string;
    onVerified: () => void;
    onBack: () => void;
    onResend: () => void;
}

const CODE_LENGTH = 6;
const FALLBACK_DELAY = 1800;
const RESEND_COOLDOWN_SECONDS = 30;

export default function OtpVerificationScreen({
    phoneNumber,
    country,
    expectedCode,
    onVerified,
    onBack,
    onResend,
}: OtpVerificationScreenProps) {
    const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
    const [error, setError] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(RESEND_COOLDOWN_SECONDS);

    const inputRefs = useRef<Array<TextInput | null>>([]);
    const boxScales = useRef(Array.from({ length: CODE_LENGTH }, () => new Animated.Value(1))).current;
    const shakeX = useRef(new Animated.Value(0)).current;

    const fillCode = (code: string) => {
        const codeDigits = code.split('').slice(0, CODE_LENGTH);
        codeDigits.forEach((d, i) => {
            setTimeout(() => {
                setDigits((prev) => {
                    const next = [...prev];
                    next[i] = d;
                    return next;
                });
                Animated.sequence([
                    Animated.timing(boxScales[i], { toValue: 1.15, duration: 80, useNativeDriver: true }),
                    Animated.timing(boxScales[i], { toValue: 1, duration: 120, useNativeDriver: true }),
                ]).start();
            }, i * 90);
        });
    };

    useEffect(() => {
        setError(false);
        let cancelled = false;
        let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

        (async () => {
            const sent = await sendOtpNotification(expectedCode);
            if (!sent && !cancelled) {
                fallbackTimer = setTimeout(() => {
                    if (!cancelled) fillCode(expectedCode);
                }, FALLBACK_DELAY);
            }
        })();

        return () => {
            cancelled = true;
            if (fallbackTimer) clearTimeout(fallbackTimer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expectedCode]);

    useEffect(() => {
        return listenForOtpNotification((code) => {
            if (code === expectedCode) fillCode(code);
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expectedCode]);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleChangeDigit = (text: string, index: number) => {
        const value = text.replace(/[^0-9]/g, '');
        if (!value) {
            setDigits((prev) => {
                const next = [...prev];
                next[index] = '';
                return next;
            });
            return;
        }
        const chars = value.split('');
        setDigits((prev) => {
            const next = [...prev];
            chars.forEach((c, i) => {
                if (index + i < CODE_LENGTH) next[index + i] = c;
            });
            return next;
        });
        const nextIndex = Math.min(index + chars.length, CODE_LENGTH - 1);
        inputRefs.current[nextIndex]?.focus();
    };

    const handleKeyPress = (key: string, index: number) => {
        if (key === 'Backspace' && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const runShake = () => {
        Animated.sequence([
            Animated.timing(shakeX, { toValue: 8, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: -8, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 6, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: -6, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeX, { toValue: 0, duration: 45, useNativeDriver: true }),
        ]).start();
    };

    const handleVerify = () => {
        const entered = digits.join('');
        if (entered.length < CODE_LENGTH) return;

        if (entered === expectedCode) {
            onVerified();
        } else {
            setError(true);
            runShake();
            setDigits(Array(CODE_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        }
    };

    const handleResend = () => {
        if (resendCooldown > 0) return;
        setDigits(Array(CODE_LENGTH).fill(''));
        setResendCooldown(RESEND_COOLDOWN_SECONDS);
        onResend();
    };

    const canVerify = digits.every((d) => d !== '');

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
                    <Ionicons name="chevron-back" size={rf(20)} color={colors.textPrimary} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={styles.title}>Enter verification code</Text>
                <Text style={styles.subtitle}>
                    We sent a code to {country.dialCode} {phoneNumber}.{' '}
                    <Text style={styles.editLink} onPress={onBack}>
                        Edit
                    </Text>
                </Text>

                <Animated.View style={[styles.boxRow, { transform: [{ translateX: shakeX }] }]}>
                    {digits.map((digit, index) => (
                        <View key={index} style={[styles.boxWrapper]}>
                            <Animated.View style={[styles.box, error && styles.boxError, { transform: [{ scale: boxScales[index] }] }]}>
                                <TextInput
                                    ref={(ref) => {
                                        inputRefs.current[index] = ref;
                                    }}
                                    style={styles.boxInput}
                                    value={digit}
                                    onChangeText={(text) => handleChangeDigit(text, index)}
                                    onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                                    keyboardType="number-pad"
                                    maxLength={CODE_LENGTH}
                                    textAlign="center"
                                    autoFocus={index === 0}
                                />
                            </Animated.View>
                        </View>
                    ))}
                </Animated.View>

                {error && <Text style={styles.errorText}>Incorrect code. Try again.</Text>}

                <TouchableOpacity
                    style={[styles.verifyButton, !canVerify && styles.verifyButtonDisabled]}
                    activeOpacity={0.9}
                    disabled={!canVerify}
                    onPress={handleVerify}
                >
                    <Text style={styles.verifyButtonText}>Verify</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendRow} activeOpacity={0.7} onPress={handleResend} disabled={resendCooldown > 0}>
                    <Text style={styles.resendText}>
                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't get a code? "}
                        {resendCooldown === 0 && <Text style={styles.resendLink}>Resend</Text>}
                    </Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: moderateScale(16),
        paddingTop: moderateScale(8),
    },
    backButton: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: moderateScale(24),
        paddingTop: moderateScale(20),
    },
    title: {
        fontSize: rf(22),
        fontWeight: '800',
        color: colors.textPrimary,
    },
    subtitle: {
        fontSize: rf(13),
        color: colors.textSecondary,
        marginTop: moderateScale(8),
        lineHeight: rf(19),
    },
    editLink: {
        color: colors.accent,
        fontWeight: '700',
    },
    boxRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: moderateScale(28),
    },
    boxWrapper: {
        flexBasis: '15%',
    },
    box: {
        height: moderateScale(56),
        borderRadius: moderateScale(14),
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    boxError: {
        borderColor: colors.danger,
    },
    boxInput: {
        width: '100%',
        height: '100%',
        fontSize: rf(22),
        fontWeight: '800',
        color: colors.textPrimary,
        padding: 0,
    },
    errorText: {
        marginTop: moderateScale(12),
        fontSize: rf(12),
        color: colors.danger,
        textAlign: 'center',
    },
    verifyButton: {
        marginTop: moderateScale(28),
        height: moderateScale(52),
        borderRadius: moderateScale(28),
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifyButtonDisabled: {
        opacity: 0.4,
    },
    verifyButtonText: {
        fontSize: rf(15),
        fontWeight: '700',
        color: colors.onAccent,
    },
    resendRow: {
        marginTop: moderateScale(18),
        alignItems: 'center',
    },
    resendText: {
        fontSize: rf(13),
        color: colors.textMuted,
    },
    resendLink: {
        color: colors.accent,
        fontWeight: '700',
    },
});