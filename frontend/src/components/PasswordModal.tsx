import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HalfModal from './Modal';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';

type Mode = 'create' | 'login';

interface PasswordModalProps {
    visible: boolean;
    mode: Mode;
    phone: string;
    onSubmit: (password: string) => void;
    onClose: () => void;
    loading?: boolean;
    biometricAvailable?: boolean;
    onUseBiometric?: () => void;
}

export default function PasswordModal({
    visible,
    mode,
    phone,
    onSubmit,
    onClose,
    loading = false,
    biometricAvailable = false,
    onUseBiometric,
}: PasswordModalProps) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            setPassword('');
            setConfirmPassword('');
            setError(null);
            setShowPassword(false);
            setShowConfirm(false);
        }
    }, [visible]);

    const handleSubmit = () => {
        setError(null);
        if (!password || password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (mode === 'create') {
            if (password !== confirmPassword) {
                setError('Passwords do not match');
                return;
            }
        }
        onSubmit(password);
    };

    const isCreate = mode === 'create';
    const canSubmit = password.length >= 8 && (isCreate ? confirmPassword.length >= 8 : true) && !loading;

    return (
        <HalfModal
            visible={visible}
            onClose={onClose}
            title={isCreate ? 'Set Password' : 'Enter Password'}
            maxHeightPercent={0.85}
        >
            <Text style={styles.phoneLabel}>Phone number</Text>
            <Text style={styles.phoneValue}>{phone}</Text>

            <Text style={styles.description}>
                {isCreate
                    ? 'Create a password for your account. You will use this password to log in next time.'
                    : 'Enter your password to continue.'}
            </Text>

            {biometricAvailable && !isCreate && onUseBiometric && (
                <TouchableOpacity style={styles.biometricBanner} activeOpacity={0.8} onPress={onUseBiometric}>
                    <Ionicons name="finger-print" size={rf(18)} color={colors.onAccent} />
                    <Text style={styles.biometricBannerText}>Use biometric instead</Text>
                </TouchableOpacity>
            )}

            <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        placeholder={isCreate ? 'Enter new password' : 'Enter password'}
                        placeholderTextColor={colors.textMuted}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    <TouchableOpacity onPress={() => setShowPassword((v) => !v)} hitSlop={12}>
                        <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={rf(18)} color={colors.textMuted} />
                    </TouchableOpacity>
                </View>
            </View>

            {isCreate && (
                <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Confirm Password</Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="Confirm password"
                            placeholderTextColor={colors.textMuted}
                            secureTextEntry={!showConfirm}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <TouchableOpacity onPress={() => setShowConfirm((v) => !v)} hitSlop={12}>
                            <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={rf(18)} color={colors.textMuted} />
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
                style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                activeOpacity={0.9}
                onPress={handleSubmit}
                disabled={!canSubmit}
            >
                {loading ? (
                    <ActivityIndicator color={colors.onAccent} />
                ) : (
                    <Text style={styles.submitText}>{isCreate ? 'Create & Continue' : 'Continue'}</Text>
                )}
            </TouchableOpacity>

            {isCreate && (
                <Text style={styles.hint}>Password must be at least 8 characters.</Text>
            )}

            {!isCreate && biometricAvailable && onUseBiometric && (
                <TouchableOpacity style={styles.altButton} activeOpacity={0.7} onPress={onUseBiometric}>
                    <Text style={styles.altButtonText}>Use biometric instead</Text>
                </TouchableOpacity>
            )}
        </HalfModal>
    );
}

const styles = StyleSheet.create({
    phoneLabel: {
        fontSize: rf(11),
        color: colors.textMuted,
        marginTop: moderateScale(8),
    },
    phoneValue: {
        fontSize: rf(15),
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 2,
    },
    description: {
        fontSize: rf(13),
        color: colors.textSecondary,
        marginTop: moderateScale(10),
        lineHeight: rf(18),
    },
    biometricBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: moderateScale(8),
        backgroundColor: colors.accent,
        borderRadius: moderateScale(14),
        paddingVertical: moderateScale(12),
        marginTop: moderateScale(14),
    },
    biometricBannerText: {
        color: colors.onAccent,
        fontWeight: '700',
        fontSize: rf(14),
    },
    fieldGroup: {
        backgroundColor: colors.surface,
        borderRadius: moderateScale(14),
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(10),
        marginTop: moderateScale(14),
        borderWidth: 1,
        borderColor: colors.border,
    },
    fieldLabel: {
        fontSize: rf(11),
        color: colors.textMuted,
        marginBottom: 4,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: rf(15),
        fontWeight: '600',
        color: colors.textPrimary,
        paddingVertical: moderateScale(4),
        paddingRight: moderateScale(8),
    },
    errorText: {
        marginTop: moderateScale(10),
        fontSize: rf(12),
        color: colors.danger,
        textAlign: 'center',
    },
    submitButton: {
        marginTop: moderateScale(20),
        height: moderateScale(52),
        borderRadius: moderateScale(28),
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.5,
    },
    submitText: {
        fontSize: rf(15),
        fontWeight: '800',
        color: colors.onAccent,
    },
    hint: {
        marginTop: moderateScale(10),
        fontSize: rf(11),
        color: colors.textMuted,
        textAlign: 'center',
    },
    altButton: {
        marginTop: moderateScale(14),
        alignItems: 'center',
        paddingVertical: moderateScale(8),
    },
    altButtonText: {
        fontSize: rf(13),
        color: colors.accent,
        fontWeight: '600',
    },
});
