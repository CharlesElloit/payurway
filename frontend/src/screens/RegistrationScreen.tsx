import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Platform,
    InputAccessoryView,
    KeyboardAvoidingView,
    StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import { countries, defaultCountry, Country } from '../constants/countries';
import CountryPickerSheet from '../components/CountryPickerSheet';
import { BiometricType, getBiometricIconName } from '../utils/biometricPrefs';

interface RegistrationScreenProps {
    onContinue: (params: { country: Country; phoneNumber: string }) => void;
    onBiometricPress?: () => void;
    biometricEnabled?: boolean;
    biometricType?: BiometricType;
}

const INPUT_ACCESSORY_ID = 'phone-input-accessory';

function formatPhoneForDisplay(digits: string, dialCode: string): string {
    if (dialCode !== '+1') return digits;
    const d = digits.slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function RegistrationScreen({
    onContinue,
    onBiometricPress,
    biometricEnabled = false,
    biometricType = 'fingerprint',
}: RegistrationScreenProps) {
    const [country, setCountry] = useState<Country>(defaultCountry);
    const [digits, setDigits] = useState('');
    const [countryPickerVisible, setCountryPickerVisible] = useState(false);
    const [countryFocused, setCountryFocused] = useState(false);
    const inputRef = useRef<TextInput>(null);

    const handleChangeDigits = (text: string) => {
        setDigits(text.replace(/[^0-9]/g, '').slice(0, 15));
    };

    const canContinue = digits.length >= 7;

    const handleContinue = () => {
        if (!canContinue) return;
        inputRef.current?.blur();
        onContinue({ country, phoneNumber: digits });
    };

    const biometricIcon = getBiometricIconName(biometricType) as any;

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor={colors.background} />
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {/* G Logo - matches design */}
                    <View style={styles.logoContainer}>
                        <LinearGradient
                            colors={['#FF9500', '#FF6A00', '#FF3B30']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.logoGradient}
                        >
                            <Text style={styles.logoText}>G</Text>
                        </LinearGradient>
                    </View>

                    {/* Main Card */}
                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>Login / signup</Text>

                        {/* Field group - Country/Region + Phone number */}
                        <View style={[styles.fieldGroup, countryFocused && styles.fieldGroupFocused]}>
                            <TouchableOpacity
                                style={styles.countryRow}
                                activeOpacity={0.7}
                                onPress={() => {
                                    setCountryFocused(true);
                                    setCountryPickerVisible(true);
                                }}
                                onPressOut={() => setCountryFocused(false)}
                            >
                                <View style={styles.countryRowLeft}>
                                    <Text style={styles.fieldLabel}>Country/Region</Text>
                                    <Text style={styles.countryValue}>
                                        {country.name} ({country.dialCode})
                                    </Text>
                                </View>
                                <Ionicons name="chevron-down" size={rf(16)} color={colors.textSecondary} />
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            <View style={styles.phoneRow}>
                                <Text style={styles.fieldLabel}>Phone number</Text>
                                <View style={styles.phoneInputRow}>
                                    <TextInput
                                        ref={inputRef}
                                        style={styles.phoneInput}
                                        value={formatPhoneForDisplay(digits, country.dialCode)}
                                        onChangeText={handleChangeDigits}
                                        keyboardType="phone-pad"
                                        placeholder="Phone number"
                                        placeholderTextColor={colors.textMuted}
                                        inputAccessoryViewID={Platform.OS === 'ios' ? INPUT_ACCESSORY_ID : undefined}
                                        onFocus={() => setCountryFocused(false)}
                                    />
                                </View>
                            </View>
                        </View>

                        <Text style={styles.helperText}>
                            We&apos;ll send you a verification code to this number to confirm the number.
                        </Text>

                        {/* Continue Row + Biometric */}
                        <View style={styles.actionRow}>
                            <TouchableOpacity
                                style={[styles.continueButton, !canContinue && styles.continueButtonDisabled, biometricEnabled && { flex: 1 }]}
                                activeOpacity={0.9}
                                disabled={!canContinue}
                                onPress={handleContinue}
                            >
                                <Text style={styles.continueButtonText}>Continue</Text>
                            </TouchableOpacity>

                            {biometricEnabled && onBiometricPress && (
                                <TouchableOpacity
                                    style={styles.biometricCircle}
                                    activeOpacity={0.8}
                                    onPress={onBiometricPress}
                                >
                                    <Ionicons name={biometricIcon} size={rf(26)} color={colors.accent} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Agreement footer */}
                    <Text style={styles.footerText}>
                        By clicking continue you agree to the{' '}
                        <Text style={styles.footerLink}>Term of Service</Text>,{' '}
                        <Text style={styles.footerLink}>Payments</Text> and{' '}
                        <Text style={styles.footerLink}>Privacy policy</Text>.
                    </Text>
                </ScrollView>
            </KeyboardAvoidingView>

            {Platform.OS === 'ios' && (
                <InputAccessoryView nativeID={INPUT_ACCESSORY_ID}>
                    <View style={styles.accessoryBar}>
                        <TouchableOpacity onPress={() => inputRef.current?.blur()}>
                            <Text style={styles.accessoryDismiss}>Dismiss</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleContinue} disabled={!canContinue}>
                            <Text style={[styles.accessoryContinue, !canContinue && styles.accessoryContinueDisabled]}>
                                Continue
                            </Text>
                        </TouchableOpacity>
                    </View>
                </InputAccessoryView>
            )}

            <CountryPickerSheet
                visible={countryPickerVisible}
                onClose={() => {
                    setCountryPickerVisible(false);
                    setCountryFocused(false);
                }}
                selected={country}
                onSelect={(c) => {
                    setCountry(c);
                    setCountryFocused(false);
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    flex: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        paddingHorizontal: moderateScale(16),
        paddingTop: moderateScale(28),
        paddingBottom: moderateScale(32),
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: moderateScale(28),
        marginTop: moderateScale(8),
    },
    logoGradient: {
        width: moderateScale(64),
        height: moderateScale(64),
        borderRadius: moderateScale(20),
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF6A00',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    logoText: {
        fontSize: rf(38),
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: -1,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    card: {
        backgroundColor: '#161618',
        borderRadius: moderateScale(20),
        paddingHorizontal: moderateScale(16),
        paddingTop: moderateScale(20),
        paddingBottom: moderateScale(16),
        borderWidth: 1,
        borderColor: '#222224',
    },
    cardTitle: {
        fontSize: rf(15),
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: moderateScale(18),
    },
    fieldGroup: {
        backgroundColor: '#000',
        borderRadius: moderateScale(14),
        overflow: 'hidden',
        borderWidth: 1.2,
        borderColor: colors.accent,
    },
    fieldGroupFocused: {
        borderColor: colors.accent,
        shadowColor: colors.accent,
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    countryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(12),
        backgroundColor: '#0A0A0A',
    },
    countryRowLeft: {
        flex: 1,
    },
    fieldLabel: {
        fontSize: rf(10),
        color: colors.textMuted,
        marginBottom: 3,
        fontWeight: '500',
        letterSpacing: 0.3,
    },
    countryValue: {
        fontSize: rf(14),
        fontWeight: '600',
        color: colors.textPrimary,
    },
    divider: {
        height: 1,
        backgroundColor: '#1F1F1F',
        marginHorizontal: moderateScale(14),
    },
    phoneRow: {
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(12),
        backgroundColor: '#0A0A0A',
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    phoneInput: {
        flex: 1,
        fontSize: rf(14),
        fontWeight: '500',
        color: colors.textPrimary,
        padding: 0,
        minHeight: rf(20),
    },
    helperText: {
        fontSize: rf(11.5),
        color: colors.textMuted,
        marginTop: moderateScale(12),
        lineHeight: rf(16),
        paddingHorizontal: moderateScale(2),
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: moderateScale(18),
        gap: moderateScale(12),
    },
    continueButton: {
        flex: 1,
        height: moderateScale(52),
        borderRadius: moderateScale(28),
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
    continueButtonDisabled: {
        opacity: 0.4,
    },
    continueButtonText: {
        fontSize: rf(15),
        fontWeight: '800',
        color: colors.onAccent,
        letterSpacing: 0.2,
    },
    biometricCircle: {
        width: moderateScale(52),
        height: moderateScale(52),
        borderRadius: moderateScale(26),
        borderWidth: 1.5,
        borderColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    footerText: {
        fontSize: rf(11),
        color: colors.textMuted,
        textAlign: 'left',
        marginTop: moderateScale(18),
        lineHeight: rf(15),
        paddingHorizontal: moderateScale(4),
    },
    footerLink: {
        color: colors.accent,
        fontWeight: '600',
    },
    accessoryBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#1C1C1E',
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(10),
    },
    accessoryDismiss: {
        fontSize: rf(15),
        color: colors.textSecondary,
    },
    accessoryContinue: {
        fontSize: rf(15),
        fontWeight: '700',
        color: colors.accent,
    },
    accessoryContinueDisabled: {
        color: colors.textMuted,
    },
});
