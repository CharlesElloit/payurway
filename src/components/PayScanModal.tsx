import React, { useEffect, useRef, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated,
    Easing,
    PanResponder,
    useWindowDimensions,
    ActivityIndicator,
    TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import { user } from '../constants/mockData';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AccountSelector from './AccountSelector';

interface PayScanModalProps {
    visible: boolean;
    onClose: () => void;
}

type PayTab = 'scan' | 'venmo' | 'show';

const ANIM_DURATION = 320;
const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.8;

const TABS: { key: PayTab; label: string }[] = [
    { key: 'scan', label: 'Scan code' },
    { key: 'venmo', label: 'Venmo me' },
    { key: 'show', label: 'Show to pay' },
];

const accounts = [
    {
        id: 'main',
        name: 'Main Account',
        balance: 12500.50,
    },
    {
        id: 'savings',
        name: 'Savings',
        balance: 8300.75,
    },
    {
        id: 'business',
        name: 'Business',
        balance: 4250.00,
    },
];

export default function PayScanModal({ visible, onClose }: PayScanModalProps) {
    const { height: windowHeight } = useWindowDimensions();
    const [modalVisible, setModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<PayTab>('scan');
    const translateY = useRef(new Animated.Value(windowHeight)).current;
    const [permission, requestPermission] = useCameraPermissions();
    const [isVerifying, setIsVerifying] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState('main');
    const [amount, setAmount] = useState('');
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (visible) {
            setActiveTab('scan');
            setModalVisible(true);
        } else if (modalVisible) {
            animateClose(() => setModalVisible(false));
        }
    }, [visible]);

    useEffect(() => {
        if (visible && !permission?.granted) {
            requestPermission();
        }
    }, [visible]);

    const animateOpen = () => {
        translateY.setValue(windowHeight);
        Animated.timing(translateY, {
            toValue: 0,
            duration: ANIM_DURATION,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    };

    const animateClose = (onDone?: () => void) => {
        Animated.timing(translateY, {
            toValue: windowHeight,
            duration: ANIM_DURATION,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
        }).start(() => onDone?.());
    };

    const handleQRCodeScanned = ({ data }: { data: string }) => {
        if (scanned) return;

        setScanned(true);
        setScannedData(data);
        setIsVerifying(true);

        setTimeout(() => {
            setIsVerifying(false);
            setShowPaymentModal(true);
        }, 1500);
    };

    // Drag-down-to-dismiss, scoped to the header/tab area only, matching the
    // same pattern used across the app's other full-screen modals.
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponderCapture: (_, gesture) => gesture.dy > 6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
            onPanResponderMove: (_, gesture) => {
                if (gesture.dy > 0) translateY.setValue(gesture.dy);
            },
            onPanResponderRelease: (_, gesture) => {
                if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
                    onClose();
                } else {
                    Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
                }
            },
        })
    ).current;

    return (
        <Modal
            visible={modalVisible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={onClose}
            onShow={animateOpen}
        >
            <Animated.View style={[styles.root, { transform: [{ translateY }] }]}>
                <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
                    <View {...panResponder.panHandlers}>
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.backButton} onPress={onClose} activeOpacity={0.7}>
                                <Ionicons name="chevron-back" size={rf(20)} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.segmentRow}>
                            {TABS.map((tab) => {
                                const active = tab.key === activeTab;
                                return (
                                    <TouchableOpacity
                                        key={tab.key}
                                        style={[styles.segment, active && styles.segmentActive]}
                                        activeOpacity={0.8}
                                        onPress={() => setActiveTab(tab.key)}
                                    >
                                        <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{tab.label}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.content}>
                        {activeTab === 'scan' && (
                            <>
                                <Text style={styles.scanHint}>
                                    Point your camera at a QR code
                                </Text>
                                <View style={styles.scanFrame}>

                                    <CameraView

                                        style={StyleSheet.absoluteFillObject}

                                        barcodeScannerSettings={{

                                            barcodeTypes: ['qr'],

                                        }}

                                        onBarcodeScanned={handleQRCodeScanned}

                                    />
                                </View>
                                <TouchableOpacity style={styles.galleryButton} activeOpacity={0.8}>
                                    <Ionicons name="image-outline" size={rf(22)} color={colors.textPrimary} />
                                </TouchableOpacity>
                            </>
                        )}

                        {activeTab === 'venmo' && (
                            <View style={styles.venmoCard}>
                                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                                <Text style={styles.venmoName}>{user.name}</Text>
                                <Text style={styles.venmoHandle}>@{user.id}</Text>
                                <View style={styles.divider} />
                                <Text style={styles.venmoHint}>Share your link so anyone can pay you directly</Text>
                                <TouchableOpacity style={styles.shareButton} activeOpacity={0.9}>
                                    <Ionicons name="share-outline" size={rf(18)} color={colors.onAccent} style={{ marginRight: 8 }} />
                                    <Text style={styles.shareButtonText}>Share my link</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {activeTab === 'show' && (
                            <View style={styles.showCard}>
                                <View style={styles.qrPlaceholder}>
                                    <Ionicons name="qr-code" size={rf(140)} color={colors.onAccent} />
                                </View>
                                <Text style={styles.venmoName}>{user.name}</Text>
                                <Text style={styles.venmoHandle}>ID: {user.id}</Text>
                                <Text style={styles.showHint}>Let others scan this to pay you</Text>
                            </View>
                        )}

                        {
                            isVerifying && (
                                <View style={styles.verifyingOverlay}>
                                    <ActivityIndicator size="large" color={colors.accent} />
                                    <Text style={styles.verifyingText}>
                                        Verifying payment code...
                                    </Text>
                                </View>
                            )
                        }

                        <Modal
                            visible={showPaymentModal}
                            transparent
                            animationType="slide"
                        >
                            <View style={styles.paymentModalContainer}>
                                <View style={styles.paymentCard}>
                                    <Text style={styles.title}>Confirm Payment</Text>

                                    <TextInput
                                        value={amount}
                                        onChangeText={setAmount}
                                        placeholder="Enter amount"
                                        keyboardType="numeric"
                                    />

                                    <AccountSelector
                                        accounts={accounts}
                                        selectedAccount={selectedAccount}
                                        onSelect={setSelectedAccount}
                                    />

                                    <TouchableOpacity style={styles.confirmButton}>
                                        <Text>Confirm Payment</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>
                    </View>
                </SafeAreaView>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
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
    segmentRow: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: moderateScale(24),
        padding: moderateScale(4),
        marginHorizontal: moderateScale(16),
        marginTop: moderateScale(20),
    },
    segment: {
        flex: 1,
        paddingVertical: moderateScale(10),
        borderRadius: moderateScale(20),
        alignItems: 'center',
    },
    segmentActive: {
        backgroundColor: colors.accent,
    },
    segmentText: {
        fontSize: rf(13),
        fontWeight: '600',
        color: colors.textSecondary,
    },
    segmentTextActive: {
        color: colors.onAccent,
        fontWeight: '700',
    },
    content: {
        flex: 1,
        paddingHorizontal: moderateScale(24),
        alignItems: 'center',
        paddingTop: moderateScale(28),
    },
    scanFrame: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: moderateScale(24),
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanHint: {
        marginTop: moderateScale(14),
        fontSize: rf(13),
        color: colors.textMuted,
        textAlign: 'center',
        paddingHorizontal: moderateScale(24),
    },
    galleryButton: {
        marginTop: moderateScale(32),
        width: moderateScale(52),
        height: moderateScale(52),
        borderRadius: moderateScale(26),
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    venmoCard: {
        width: '100%',
        backgroundColor: colors.surface,
        borderRadius: moderateScale(24),
        padding: moderateScale(24),
        alignItems: 'center',
    },
    avatar: {
        width: moderateScale(72),
        height: moderateScale(72),
        borderRadius: moderateScale(36),
        borderWidth: 2,
        borderColor: colors.accent,
        marginBottom: moderateScale(14),
    },
    venmoName: {
        fontSize: rf(17),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    venmoHandle: {
        fontSize: rf(13),
        color: colors.textMuted,
        marginTop: 4,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: colors.border,
        marginVertical: moderateScale(20),
    },
    venmoHint: {
        fontSize: rf(13),
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: moderateScale(18),
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.accent,
        borderRadius: moderateScale(26),
        paddingVertical: moderateScale(12),
        paddingHorizontal: moderateScale(24),
        width: '100%',
    },
    shareButtonText: {
        fontSize: rf(14),
        fontWeight: '700',
        color: colors.onAccent,
    },
    showCard: {
        width: '100%',
        alignItems: 'center',
    },
    qrPlaceholder: {
        width: '100%',
        aspectRatio: 1,
        maxWidth: moderateScale(260),
        borderRadius: moderateScale(24),
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: moderateScale(20),
    },
    showHint: {
        marginTop: moderateScale(10),
        fontSize: rf(13),
        color: colors.textMuted,
        textAlign: 'center',
    },
    paymentModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },

    paymentCard: {
        backgroundColor: colors.background,
        borderTopLeftRadius: moderateScale(28),
        borderTopRightRadius: moderateScale(28),
        paddingHorizontal: moderateScale(24),
        paddingTop: moderateScale(24),
        paddingBottom: moderateScale(40),
    },

    paymentTitle: {
        fontSize: rf(18),
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
    },

    paymentSubtitle: {
        marginTop: moderateScale(6),
        textAlign: 'center',
        color: colors.textMuted,
        fontSize: rf(13),
    },

    amountLabel: {
        marginTop: moderateScale(24),
        marginBottom: moderateScale(8),
        color: colors.textPrimary,
        fontWeight: '700',
        fontSize: rf(14),
    },

    amountInput: {
        height: moderateScale(56),
        borderRadius: moderateScale(16),
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: moderateScale(16),
        color: colors.textPrimary,
        fontSize: rf(18),
        fontWeight: '600',
    },

    confirmButton: {
        marginTop: moderateScale(24),
        height: moderateScale(56),
        borderRadius: moderateScale(18),
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },

    confirmButtonText: {
        color: colors.onAccent,
        fontWeight: '700',
        fontSize: rf(15),
    },
    paymentModalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },

    title: {
        fontSize: rf(22),
        fontWeight: '800',
        color: colors.textPrimary,
        textAlign: 'center',
        letterSpacing: 0.3,
        marginBottom: moderateScale(8),
    },

    verifyingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(10, 10, 10, 0.78)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },

    verifyingText: {
        marginTop: moderateScale(16),
        fontSize: rf(15),
        fontWeight: '600',
        color: '#FFFFFF',
        textAlign: 'center',
        letterSpacing: 0.2,
    },
});