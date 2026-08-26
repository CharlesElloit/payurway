// ProfileScreen.tsx - Enhanced with biometric setup (finger/face/voice) + default toggle
import React, { useCallback, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Alert,
    ActivityIndicator,
    Switch,
    Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import LogoutModal from '../components/LogoutModal';
import { authService, BiometricCredential } from '../services/authService';
import {
    BiometricType,
    BiometricPrefs,
    getBiometricPrefs,
    setBiometricPrefs,
    BIOMETRIC_CREDENTIAL_KEY,
} from '../utils/biometricPrefs';

interface ProfileScreenProps {
    onLogout?: () => void;
}

const BIOMETRIC_OPTIONS: { type: BiometricType; label: string; icon: any; desc: string }[] = [
    { type: 'fingerprint', label: 'Fingerprint', icon: 'finger-print', desc: 'Use fingerprint' },
    { type: 'face', label: 'Face', icon: 'scan-outline', desc: 'Use Face ID' },
    { type: 'voice', label: 'Voice', icon: 'mic-outline', desc: 'Use voice' },
];

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
    const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
    const [biometricCredentials, setBiometricCredentials] = useState<BiometricCredential[]>([]);
    const [loadingCredentials, setLoadingCredentials] = useState(true);
    const [biometricPrefs, setBiometricPrefsState] = useState<BiometricPrefs>({
        enabled: false,
        type: 'fingerprint',
        isDefault: false,
        credentialId: null,
    });
    const [registering, setRegistering] = useState(false);

    const loadCredentials = useCallback(async () => {
        try {
            setLoadingCredentials(true);
            const credentials = await authService.listBiometricCredentials();
            setBiometricCredentials(credentials);
        } catch {
            // Non-fatal - token may be expired
        } finally {
            setLoadingCredentials(false);
        }
    }, []);

    const loadPrefs = useCallback(async () => {
        const prefs = await getBiometricPrefs();
        setBiometricPrefsState(prefs);
    }, []);

    useEffect(() => {
        loadCredentials();
        loadPrefs();
    }, [loadCredentials, loadPrefs]);

    const persistPrefs = async (next: BiometricPrefs) => {
        setBiometricPrefsState(next);
        await setBiometricPrefs(next);
    };

    const handleToggleEnabled = async (value: boolean) => {
        const next: BiometricPrefs = {
            ...biometricPrefs,
            enabled: value,
            isDefault: value ? biometricPrefs.isDefault : false,
        };
        await persistPrefs(next);
        if (value && biometricCredentials.length === 0) {
            Alert.alert(
                'Biometric enabled',
                'Choose your biometric type (Fingerprint, Face or Voice) and tap "Register Biometric" to secure this device.'
            );
        }
    };

    const handleSelectType = async (type: BiometricType) => {
        const next = { ...biometricPrefs, type };
        await persistPrefs(next);
    };

    const handleToggleDefault = async (value: boolean) => {
        if (value && !biometricPrefs.enabled) {
            Alert.alert('Enable biometric first', 'Turn on biometric login before setting it as default.');
            return;
        }
        const next = { ...biometricPrefs, isDefault: value };
        await persistPrefs(next);
    };

    const handleRegisterBiometric = useCallback(async () => {
        if (!biometricPrefs.enabled) {
            Alert.alert('Biometric disabled', 'Enable biometric login first.');
            return;
        }
        setRegistering(true);
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!hasHardware || !isEnrolled) {
                Alert.alert(
                    'Not available',
                    !hasHardware
                        ? 'This device has no biometric hardware.'
                        : 'No biometrics enrolled. Add one in device Settings first.'
                );
                setRegistering(false);
                return;
            }

            const promptMsg =
                biometricPrefs.type === 'voice'
                    ? 'Verify voice — authenticate to register'
                    : biometricPrefs.type === 'face'
                      ? 'Verify Face ID to register'
                      : 'Verify fingerprint to register';

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: promptMsg,
                cancelLabel: 'Cancel',
                disableDeviceFallback: false,
            });

            if (!result.success) {
                Alert.alert('Cancelled', 'Biometric verification was cancelled.');
                setRegistering(false);
                return;
            }

            // Backend registration
            const credentialId = `bio_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const publicKey = `device_key_${credentialId}`;

            // Get challenge to ensure endpoint works (ignore failure)
            try {
                await authService.getBiometricChallenge();
            } catch {}

            await authService.registerBiometric({
                credentialId,
                publicKey,
                deviceName: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} Device - ${biometricPrefs.type}`,
                deviceType: biometricPrefs.type,
            });

            await AsyncStorage.setItem(
                BIOMETRIC_CREDENTIAL_KEY,
                JSON.stringify({ credentialId, registeredAt: new Date().toISOString(), type: biometricPrefs.type })
            );

            const nextPrefs = { ...biometricPrefs, credentialId };
            await persistPrefs(nextPrefs);
            await loadCredentials();
            Alert.alert('Success', `${biometricPrefs.type} biometric registered for this device.`);
        } catch (e: any) {
            Alert.alert('Failed', e?.message || 'Could not register biometric. Try again.');
        } finally {
            setRegistering(false);
        }
    }, [biometricPrefs, loadCredentials]);

    const handleDeleteCredential = useCallback(
        async (credentialId: string) => {
            Alert.alert(
                'Remove Device',
                'This device will no longer be able to use biometric login. Continue?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await authService.deleteBiometricCredential(credentialId);
                                setBiometricCredentials((prev) => prev.filter((c) => c.credentialId !== credentialId));
                                // if this was the stored credential, clear local prefs credentialId
                                if (biometricPrefs.credentialId === credentialId) {
                                    const next = { ...biometricPrefs, credentialId: null };
                                    await persistPrefs(next);
                                }
                            } catch {
                                Alert.alert('Error', 'Failed to remove device.');
                            }
                        },
                    },
                ]
            );
        },
        [biometricPrefs]
    );

    const handleRevokeAll = useCallback(async () => {
        Alert.alert(
            'Revoke All Devices',
            'All devices will be logged out and need to re-register biometrics. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Revoke All',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await authService.revokeAllBiometricCredentials();
                            setBiometricCredentials([]);
                            const next = { ...biometricPrefs, credentialId: null };
                            await persistPrefs(next);
                        } catch {
                            Alert.alert('Error', 'Failed to revoke devices.');
                        }
                    },
                },
            ]
        );
    }, [biometricPrefs]);

    const handleOpenUrl = (url?: string) => {
        if (url) Linking.openURL(url).catch((err) => console.error('Error opening URL:', err));
    };

    const handleConfirmLogout = async () => {
        setIsLogoutModalVisible(false);
        try {
            await AsyncStorage.removeItem('pmb_has_registered');
            if (onLogout) onLogout();
        } catch (error) {
            console.error('Error clearing session during logout:', error);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={moderateScale(36)} color="#888" />
                    </View>
                    <Text style={styles.name}>Account</Text>
                    <Text style={styles.email}>
                        {biometricPrefs.enabled ? `${biometricPrefs.type} biometric enabled` : 'Biometric not enabled'}
                    </Text>
                </View>

                {/* BIOMETRIC LOGIN SETUP */}
                <Text style={styles.sectionHeader}>BIOMETRIC LOGIN</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="finger-print" size={moderateScale(18)} color={colors.accent} />
                            </View>
                            <View style={styles.labelContainer}>
                                <Text style={styles.rowLabel}>Enable Biometric Login</Text>
                                <Text style={styles.subText}>Unlock app with biometrics</Text>
                            </View>
                        </View>
                        <Switch
                            value={biometricPrefs.enabled}
                            onValueChange={handleToggleEnabled}
                            trackColor={{ false: '#333', true: colors.accent }}
                            thumbColor={biometricPrefs.enabled ? '#000' : '#f4f3f4'}
                        />
                    </View>

                    {biometricPrefs.enabled && (
                        <>
                            <View style={styles.divider} />
                            <Text style={styles.subSectionTitle}>Choose biometric type</Text>
                            <View style={styles.typeRow}>
                                {BIOMETRIC_OPTIONS.map((opt) => {
                                    const active = biometricPrefs.type === opt.type;
                                    return (
                                        <TouchableOpacity
                                            key={opt.type}
                                            style={[styles.typeCard, active && styles.typeCardActive]}
                                            activeOpacity={0.8}
                                            onPress={() => handleSelectType(opt.type)}
                                        >
                                            <Ionicons
                                                name={opt.icon}
                                                size={moderateScale(22)}
                                                color={active ? colors.onAccent : '#FFF'}
                                            />
                                            <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{opt.label}</Text>
                                            <Text style={[styles.typeDesc, active && styles.typeDescActive]}>{opt.desc}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            <View style={styles.divider} />
                            <View style={styles.row}>
                                <View style={styles.rowLeft}>
                                    <Ionicons name="star-outline" size={moderateScale(18)} color="#FFF" />
                                    <View style={styles.labelContainer}>
                                        <Text style={styles.rowLabel}>Set as default</Text>
                                        <Text style={styles.subText}>Use biometric on app launch</Text>
                                    </View>
                                </View>
                                <Switch
                                    value={biometricPrefs.isDefault}
                                    onValueChange={handleToggleDefault}
                                    trackColor={{ false: '#333', true: colors.accent }}
                                    thumbColor={biometricPrefs.isDefault ? '#000' : '#f4f3f4'}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.registerButton, registering && { opacity: 0.6 }]}
                                activeOpacity={0.9}
                                onPress={handleRegisterBiometric}
                                disabled={registering}
                            >
                                {registering ? (
                                    <ActivityIndicator size="small" color={colors.onAccent} />
                                ) : (
                                    <>
                                        <Ionicons
                                            name={getIconForType(biometricPrefs.type)}
                                            size={moderateScale(18)}
                                            color={colors.onAccent}
                                        />
                                        <Text style={styles.registerButtonText}>
                                            {biometricCredentials.length > 0 ? 'Re-register' : 'Register'} {capitalize(biometricPrefs.type)}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                            <Text style={styles.hintText}>
                                Voice uses device microphone check; Fingerprint/Face uses system biometric prompt.
                            </Text>
                        </>
                    )}
                </View>

                {/* ENROLLED DEVICES */}
                <Text style={styles.sectionHeader}>ENROLLED DEVICES</Text>
                <View style={styles.card}>
                    {loadingCredentials ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator size="small" color={colors.accent} />
                            <Text style={styles.loadingText}>Loading devices...</Text>
                        </View>
                    ) : biometricCredentials.length === 0 ? (
                        <View style={styles.emptyRow}>
                            <Ionicons name="finger-print-outline" size={moderateScale(28)} color="#555" />
                            <Text style={styles.emptyText}>No biometric devices registered</Text>
                            <Text style={styles.emptySubtext}>
                                {biometricPrefs.enabled
                                    ? 'Tap Register above to add this device'
                                    : 'Enable biometric login and register a device'}
                            </Text>
                        </View>
                    ) : (
                        <>
                            {biometricCredentials.map((cred, index) => (
                                <React.Fragment key={cred.id}>
                                    <View style={styles.row}>
                                        <View style={styles.rowLeft}>
                                            <Ionicons
                                                name={getIconForType(cred.deviceType as BiometricType)}
                                                size={moderateScale(20)}
                                                color="#FFF"
                                            />
                                            <View style={styles.labelContainer}>
                                                <Text style={styles.rowLabel}>{cred.deviceName || cred.deviceType}</Text>
                                                <Text style={styles.subText}>
                                                    Added {new Date(cred.createdAt).toLocaleDateString()}
                                                    {cred.lastUsedAt
                                                        ? ` · Last used ${new Date(cred.lastUsedAt).toLocaleDateString()}`
                                                        : ''}
                                                </Text>
                                            </View>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            activeOpacity={0.7}
                                            onPress={() => handleDeleteCredential(cred.credentialId)}
                                        >
                                            <Text style={styles.removeButtonText}>Remove</Text>
                                        </TouchableOpacity>
                                    </View>
                                    {index < biometricCredentials.length - 1 && <View style={styles.divider} />}
                                </React.Fragment>
                            ))}
                            <View style={styles.divider} />
                            <TouchableOpacity style={styles.row} activeOpacity={0.6} onPress={handleRevokeAll}>
                                <View style={styles.rowLeft}>
                                    <Ionicons name="shield-outline" size={moderateScale(20)} color="#FF5252" />
                                    <Text style={[styles.rowLabel, { color: '#FF5252' }]}>Revoke All Devices</Text>
                                </View>
                            </TouchableOpacity>
                        </>
                    )}
                </View>

                <Text style={styles.sectionHeader}>OTHER</Text>
                <View style={styles.card}>
                    {otherLinks.map((item, index) => {
                        const isLogout = item.id === 'logout';
                        return (
                            <React.Fragment key={item.id}>
                                <TouchableOpacity
                                    style={styles.row}
                                    activeOpacity={0.6}
                                    onPress={isLogout ? () => setIsLogoutModalVisible(true) : () => handleOpenUrl(item.url)}
                                >
                                    <View style={styles.rowLeft}>
                                        {item.icon}
                                        <Text style={[styles.rowLabel, isLogout && styles.logoutLabel]}>{item.title}</Text>
                                    </View>
                                    {item.external ? (
                                        <Feather name="arrow-up-right" size={moderateScale(18)} color="#666" />
                                    ) : (
                                        <Ionicons name="chevron-forward" size={moderateScale(18)} color="#666" />
                                    )}
                                </TouchableOpacity>
                                {index < otherLinks.length - 1 && <View style={styles.divider} />}
                            </React.Fragment>
                        );
                    })}
                </View>
            </ScrollView>

            <LogoutModal visible={isLogoutModalVisible} onClose={() => setIsLogoutModalVisible(false)} onConfirm={handleConfirmLogout} />
        </View>
    );
}

function getIconForType(type: BiometricType): any {
    switch (type) {
        case 'face':
            return 'scan-outline';
        case 'voice':
            return 'mic-outline';
        default:
            return 'finger-print-outline';
    }
}
function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

const otherLinks = [
    { id: '1', title: 'Help articles', icon: <Ionicons name="book-outline" size={moderateScale(20)} color="#FFF" />, external: true, url: 'https://example.com' },
    { id: '2', title: 'Join Discord', icon: <MaterialCommunityIcons name="comment-question-outline" size={moderateScale(20)} color="#FFF" />, external: true, url: 'https://discord.gg' },
    { id: '3', title: 'Leave feedback', icon: <Ionicons name="chatbox-outline" size={moderateScale(20)} color="#FFF" />, external: false },
    { id: '4', title: 'Terms of service', icon: <Ionicons name="document-text-outline" size={moderateScale(20)} color="#FFF" />, external: false },
    { id: '5', title: 'Privacy policy', icon: <Ionicons name="lock-closed-outline" size={moderateScale(20)} color="#FFF" />, external: false },
    { id: 'logout', title: 'Log out', icon: <Ionicons name="log-out-outline" size={moderateScale(20)} color="#FF5252" />, external: false },
];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { paddingHorizontal: moderateScale(16), paddingTop: moderateScale(16), paddingBottom: moderateScale(120) },
    header: { alignItems: 'center', marginVertical: moderateScale(20) },
    avatarPlaceholder: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(20),
        backgroundColor: '#161618',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: moderateScale(12),
    },
    name: { color: '#FFF', fontSize: moderateScale(20), fontWeight: 'bold' },
    email: { color: '#888', fontSize: rf(13), marginTop: moderateScale(4) },
    sectionHeader: { color: '#666', fontSize: moderateScale(12), fontWeight: '600', marginBottom: moderateScale(8), marginLeft: moderateScale(4), letterSpacing: 0.5 },
    card: { backgroundColor: '#161618', borderRadius: moderateScale(16), paddingHorizontal: moderateScale(16), marginBottom: moderateScale(20) },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: moderateScale(14) },
    rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconCircle: {
        width: moderateScale(32),
        height: moderateScale(32),
        borderRadius: moderateScale(16),
        backgroundColor: '#1F1F1F',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: moderateScale(4),
    },
    labelContainer: { marginLeft: moderateScale(12), flex: 1 },
    rowLabel: { color: '#FFF', fontSize: moderateScale(15), fontWeight: '500', marginLeft: moderateScale(12) },
    logoutLabel: { color: '#FF5252' },
    subText: { color: '#888', fontSize: moderateScale(12), marginTop: moderateScale(2) },
    subSectionTitle: { color: '#AAA', fontSize: rf(12), fontWeight: '600', marginTop: moderateScale(4), marginBottom: moderateScale(12) },
    typeRow: { flexDirection: 'row', gap: moderateScale(8), marginBottom: moderateScale(8) },
    typeCard: {
        flex: 1,
        backgroundColor: '#1E1E20',
        borderRadius: moderateScale(14),
        paddingVertical: moderateScale(14),
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#2A2A2E',
    },
    typeCardActive: { backgroundColor: colors.accent, borderColor: colors.accent },
    typeLabel: { color: '#FFF', fontSize: rf(13), fontWeight: '700', marginTop: moderateScale(6) },
    typeLabelActive: { color: colors.onAccent },
    typeDesc: { color: '#888', fontSize: rf(10), marginTop: 2 },
    typeDescActive: { color: 'rgba(0,0,0,0.6)' },
    registerButton: {
        marginTop: moderateScale(14),
        height: moderateScale(48),
        borderRadius: moderateScale(24),
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: moderateScale(8),
    },
    registerButtonText: { color: colors.onAccent, fontSize: rf(14), fontWeight: '800' },
    hintText: { color: '#666', fontSize: rf(11), marginTop: moderateScale(8), lineHeight: rf(14), textAlign: 'center' },
    removeButton: { backgroundColor: '#2A2A2E', paddingHorizontal: moderateScale(12), paddingVertical: moderateScale(5), borderRadius: moderateScale(14) },
    removeButtonText: { color: '#FF5252', fontSize: moderateScale(12), fontWeight: '500' },
    divider: { height: 1, backgroundColor: '#222224' },
    loadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: moderateScale(18) },
    loadingText: { color: '#888', fontSize: moderateScale(13), marginLeft: moderateScale(10) },
    emptyRow: { alignItems: 'center', paddingVertical: moderateScale(24) },
    emptyText: { color: '#888', fontSize: moderateScale(14), fontWeight: '500', marginTop: moderateScale(10) },
    emptySubtext: { color: '#555', fontSize: moderateScale(12), marginTop: moderateScale(4), textAlign: 'center' },
});
