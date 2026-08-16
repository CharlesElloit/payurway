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
} from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import { countries, defaultCountry, Country } from '../constants/countries';
import CountryPickerSheet from '../components/CountryPickerSheet';

interface RegistrationScreenProps {
    onContinue: (params: { country: Country; phoneNumber: string }) => void;
}

const INPUT_ACCESSORY_ID = 'phone-input-accessory';

/** Formats raw digits as a US-style number: (929) 630-2390. Falls back to
 * plain digits for other countries, since formatting rules vary widely. */
function formatPhoneForDisplay(digits: string, dialCode: string): string {
    if (dialCode !== '+1') return digits;
    const d = digits.slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export default function RegistrationScreen({ onContinue }: RegistrationScreenProps) {
    const [country, setCountry] = useState<Country>(defaultCountry);
    const [digits, setDigits] = useState('');
    const [countryPickerVisible, setCountryPickerVisible] = useState(false);
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

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
            <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                <View style={styles.header}>
                    {/* No back/dismiss target on a mandatory first-run screen — kept
              visually for fidelity to the reference design, but inert. */}
                    <View style={styles.headerSpacer} />
                    <Text style={styles.headerTitle}>Log in or sign up</Text>
                    <View style={styles.closeButton}>
                        <Ionicons name="close" size={rf(18)} color={colors.textPrimary} />
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.fieldGroup}>
                        <TouchableOpacity
                            style={styles.countryRow}
                            activeOpacity={0.7}
                            onPress={() => setCountryPickerVisible(true)}
                        >
                            <View>
                                <Text style={styles.fieldLabel}>Country/Region</Text>
                                <Text style={styles.countryValue}>
                                    {country.flag} {country.name} ({country.dialCode})
                                </Text>
                            </View>
                            <Ionicons name="chevron-down" size={rf(18)} color={colors.textSecondary} />
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <View style={styles.phoneRow}>
                            <Text style={styles.fieldLabel}>Phone number</Text>
                            <View style={styles.phoneInputRow}>
                                <Text style={styles.dialCodeText}>{country.dialCode}</Text>
                                <TextInput
                                    ref={inputRef}
                                    style={styles.phoneInput}
                                    value={formatPhoneForDisplay(digits, country.dialCode)}
                                    onChangeText={handleChangeDigits}
                                    keyboardType="phone-pad"
                                    placeholder="Phone number"
                                    placeholderTextColor={colors.textMuted}
                                    inputAccessoryViewID={Platform.OS === 'ios' ? INPUT_ACCESSORY_ID : undefined}
                                />
                            </View>
                        </View>
                    </View>

                    <Text style={styles.helperText}>
                        We'll call or text to confirm your number. Standard message and data rates apply.
                    </Text>

                    <TouchableOpacity
                        style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
                        activeOpacity={0.9}
                        disabled={!canContinue}
                        onPress={handleContinue}
                    >
                        <Text style={styles.continueButtonText}>Continue</Text>
                    </TouchableOpacity>

                    <View style={styles.orRow}>
                        <View style={styles.orLine} />
                        <Text style={styles.orText}>or</Text>
                        <View style={styles.orLine} />
                    </View>

                    {/* Visual only — no real OAuth wired up behind these. */}
                    <TouchableOpacity style={styles.altButton} activeOpacity={0.8}>
                        <Ionicons name="mail-outline" size={rf(18)} color={colors.textPrimary} />
                        <Text style={styles.altButtonText}>Continue with email</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.altButton} activeOpacity={0.8}>
                        <AntDesign name="apple" size={rf(18)} color={colors.textPrimary} />
                        <Text style={styles.altButtonText}>Continue with Apple</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.altButton} activeOpacity={0.8}>
                        <AntDesign name="google" size={rf(18)} color="#EA4335" />
                        <Text style={styles.altButtonText}>Continue with Google</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.altButton} activeOpacity={0.8}>
                        <Ionicons name="logo-facebook" size={rf(18)} color="#1877F2" />
                        <Text style={styles.altButtonText}>Continue with Facebook</Text>
                    </TouchableOpacity>
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
                onClose={() => setCountryPickerVisible(false)}
                selected={country}
                onSelect={setCountry}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: moderateScale(16),
        paddingTop: moderateScale(8),
    },
    headerSpacer: {
        width: moderateScale(36),
    },
    headerTitle: {
        fontSize: rf(16),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    closeButton: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: moderateScale(16),
        paddingTop: moderateScale(20),
        paddingBottom: moderateScale(32),
    },
    fieldGroup: {
        backgroundColor: colors.surface,
        borderRadius: moderateScale(16),
        overflow: 'hidden',
    },
    countryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(14),
    },
    fieldLabel: {
        fontSize: rf(11),
        color: colors.textMuted,
        marginBottom: 4,
    },
    countryValue: {
        fontSize: rf(15),
        fontWeight: '600',
        color: colors.textPrimary,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginHorizontal: moderateScale(16),
    },
    phoneRow: {
        paddingHorizontal: moderateScale(16),
        paddingVertical: moderateScale(14),
    },
    phoneInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    dialCodeText: {
        fontSize: rf(15),
        fontWeight: '600',
        color: colors.textPrimary,
        marginRight: moderateScale(8),
    },
    phoneInput: {
        flex: 1,
        fontSize: rf(15),
        fontWeight: '600',
        color: colors.textPrimary,
        padding: 0,
    },
    helperText: {
        fontSize: rf(12),
        color: colors.textMuted,
        marginTop: moderateScale(12),
        lineHeight: rf(17),
    },
    continueButton: {
        marginTop: moderateScale(20),
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
        fontWeight: '700',
        color: colors.onAccent,
    },
    orRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: moderateScale(20),
    },
    orLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    orText: {
        marginHorizontal: moderateScale(12),
        fontSize: rf(12),
        color: colors.textMuted,
    },
    altButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: moderateScale(50),
        borderRadius: moderateScale(25),
        borderWidth: 1.5,
        borderColor: colors.border,
        marginBottom: moderateScale(12),
    },
    altButtonText: {
        marginLeft: moderateScale(10),
        fontSize: rf(14),
        fontWeight: '600',
        color: colors.textPrimary,
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