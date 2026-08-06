import React, { useEffect, useRef, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Image,
    Animated,
    Easing,
    PanResponder,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import { formatCurrency, formatReceiptTimestamp, numberToWords } from '../utils/format';
import { user, accounts } from '../constants/mockData';
import HalfModal from './Modal';

interface PayScanModalProps {
    visible: boolean;
    onClose: () => void;
}

type PayTab = 'scan' | 'venmo' | 'show';
type ScanState = 'idle' | 'verifying' | 'confirming';
type PaymentState = 'form' | 'reviewing' | 'processing' | 'success';

const ANIM_DURATION = 320;
const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.8;
const VERIFY_DURATION = 1500;
const PROCESSING_DURATION = 1100;
const SUCCESS_DISPLAY_DURATION = 1200;
const MAX_DAILY_TRANSACTION_AMOUNT = 1000000;
const AMOUNT_CHIPS = [5000, 10000, 20000, 50000];

const TABS: { key: PayTab; label: string }[] = [
    { key: 'scan', label: 'Scan code' },
    { key: 'venmo', label: 'Venmo me' },
    { key: 'show', label: 'Show to pay' },
];

//Mock fee rule — larger transfers incur a flat charge, smaller ones are free.
// Swap this out for a real fee lookup once there's a backend to ask.
function calculateTransactionCharge(amount: number): number {
    return amount > 50000 ? (amount * 0.02) : 0;
}

function generateTransactionId(): string {
    return `TRN-${Math.floor(10000000 + Math.random() * 89999999)}`;
}

// Text-based stand-ins for provider logos — no real brand assets bundled here.
function getProviderBadge(provider: 'MTN' | 'Airtel'): { bg: string; textColor: string; label: string } {
    if (provider === 'Airtel') {
        return { bg: '#ED1C24', textColor: '#FFFFFF', label: 'airtel' };
    }
    return { bg: '#FFCC08', textColor: '#0A0A0A', label: 'MTN' };
}

function generateReceiptNumber(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const sequence = String(Math.floor(100000 + Math.random() * 899999));
    return `${y}${m}${d}${sequence}`;
}

// Mock — no real tax rules to apply yet. Kept separate from the transaction
// charge above for clarity/extensibility once there's something to compute.
function calculateTransactionTax(_amount: number): number {
    return 0;
}

export default function PayScanModal({ visible, onClose }: PayScanModalProps) {
    const { height: windowHeight } = useWindowDimensions();
    const [modalVisible, setModalVisible] = useState(false);
    const [activeTab, setActiveTab] = useState<PayTab>('scan');
    const translateY = useRef(new Animated.Value(windowHeight)).current;
    const [transactionId, setTransactionId] = useState('');
    const [permission, requestPermission] = useCameraPermissions();
    const hasScannedRef = useRef(false);
    const [narration, setNarration] = useState('');
    const [scanState, setScanState] = useState<ScanState>('idle');
    const [scannedData, setScannedData] = useState<string | null>(null);
    const [paymentState, setPaymentState] = useState<PaymentState>('form');
    const [amount, setAmount] = useState(0);
    const [transactionDate, setTransactionDate] = useState<Date | null>(null);
    const [receiptNumber, setReceiptNumber] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState(accounts[0].id);

    const successScale = useRef(new Animated.Value(0)).current;
    const reviewOpacity = useRef(new Animated.Value(0)).current;
    const reviewTranslateY = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        if (visible) {
            setActiveTab('scan');
            resetScanFlow();
            setModalVisible(true);
        } else if (modalVisible) {
            animateClose(() => setModalVisible(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Entrance animation for the reviewing section — fires whenever paymentState
    // becomes 'reviewing', regardless of which handler got it there.
    useEffect(() => {
        if (paymentState === 'reviewing') {
            reviewOpacity.setValue(0);
            reviewTranslateY.setValue(24);
            Animated.parallel([
                Animated.timing(reviewOpacity, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
                Animated.timing(reviewTranslateY, { toValue: 0, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            ]).start();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [paymentState]);

    // Plays the reviewing section's exit animation, then hands off to whatever
    // should happen next — used by both "Edit" (back to form) and "Confirm &
    // Pay" (on to processing), so the content swap never happens as a hard cut.
    const animateReviewExit = (onDone: () => void) => {
        Animated.parallel([
            Animated.timing(reviewOpacity, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
            Animated.timing(reviewTranslateY, { toValue: -16, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        ]).start(onDone);
    };

    const resetScanFlow = () => {
        hasScannedRef.current = false;
        setScanState('idle');
        setScannedData(null);
        setPaymentState('form');
        setAmount(0);
        setNarration('');
        setTransactionId('');
        setTransactionDate(null);
        setSelectedAccountId(accounts[0].id);
        successScale.setValue(0);
    };

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

    const handleBarcodeScanned = (result: BarcodeScanningResult) => {
        // The scanner keeps firing while a code stays in frame — ignore
        // everything after the first hit until the flow resets.
        if (hasScannedRef.current) return;
        hasScannedRef.current = true;

        setScannedData(result.data);
        setScanState('verifying');

        // No real backend to validate a scanned code against, so this simulates
        // the network round-trip a "verify this code" call would normally take.
        setTimeout(() => {
            setScanState('confirming');
        }, VERIFY_DURATION);
    };

    const handleAmountChange = (text: string) => {
        const digitsOnly = text.replace(/[^0-9]/g, '');
        setAmount(digitsOnly ? parseInt(digitsOnly, 10) : 0);
    };

    const handleFinalConfirm = () => {
        animateReviewExit(() => {
            setPaymentState('processing');
            setTimeout(() => {
                setPaymentState('success');
                Animated.spring(successScale, { toValue: 1, useNativeDriver: true, bounciness: 10 }).start();
                setTimeout(() => {
                    // Return the person to Home once the success state has been visible
                    // long enough to register, rather than leaving them to dismiss it manually.
                    onClose();
                }, SUCCESS_DISPLAY_DURATION);
            }, PROCESSING_DURATION);
        });
    };

    const handleReviewPayment = () => {
        const now = new Date();
        setTransactionId(generateTransactionId());
        setTransactionDate(now);
        setReceiptNumber(generateReceiptNumber(now));
        setPaymentState('reviewing');
    };

    const handleEditReview = () => {
        animateReviewExit(() => setPaymentState('form'));
    };

    const handleCancelConfirm = () => {
        setScanState('idle');
        hasScannedRef.current = false;
        setScannedData(null);
        setPaymentState('form');
    };

    const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];
    const transactionCharge = calculateTransactionCharge(amount);
    const transactionTax = calculateTransactionTax(amount);
    const canReview = amount > 0 && narration.trim().length > 0;

    return (
        <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
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
                                <Text style={styles.scanHint}>Point your camera at a QR code</Text>

                                <View style={styles.scanFrame}>
                                    {permission?.granted ? (
                                        <>
                                            <CameraView
                                                style={StyleSheet.absoluteFillObject}
                                                facing="back"
                                                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                                                onBarcodeScanned={scanState === 'idle' ? handleBarcodeScanned : undefined}
                                            />
                                            {/* Corner brackets overlaid on the live feed for the classic scanner look. */}
                                            <View pointerEvents="none" style={styles.bracketOverlay}>
                                                <View style={[styles.bracket, styles.bracketTopLeft]} />
                                                <View style={[styles.bracket, styles.bracketTopRight]} />
                                                <View style={[styles.bracket, styles.bracketBottomLeft]} />
                                                <View style={[styles.bracket, styles.bracketBottomRight]} />
                                            </View>

                                            {scanState === 'verifying' && (
                                                <View style={styles.verifyOverlay}>
                                                    <ActivityIndicator size="large" color={colors.accent} />
                                                    <Text style={styles.verifyText}>Verifying code…</Text>
                                                </View>
                                            )}
                                        </>
                                    ) : (
                                        <View style={styles.permissionPrompt}>
                                            <Ionicons name="camera-outline" size={rf(48)} color={colors.textMuted} />
                                            <Text style={styles.permissionText}>
                                                {permission?.canAskAgain === false
                                                    ? 'Camera access was denied. Enable it in your device settings to scan codes.'
                                                    : 'PayMyBills needs camera access to scan QR payment codes.'}
                                            </Text>
                                            {permission?.canAskAgain !== false && (
                                                <TouchableOpacity style={styles.permissionButton} activeOpacity={0.85} onPress={requestPermission}>
                                                    <Text style={styles.permissionButtonText}>Grant camera access</Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    )}
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
                    </View>
                </SafeAreaView>
            </Animated.View>

            <HalfModal
                visible={scanState === 'confirming'}
                onClose={paymentState === 'form' || paymentState === 'reviewing' ? handleCancelConfirm : () => { }}
                title={
                    paymentState === 'form'
                        ? 'Confirm payment'
                        : paymentState === 'reviewing'
                            ? 'Review transaction'
                            : undefined
                }
                maxHeightPercent={0.95}
            >
                {paymentState === 'form' && (
                    <View>
                        <Text style={styles.fieldLabel}>
                            Amount <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.amountRow}>
                            <Text style={styles.amountCurrency}>UGX</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={formatCurrency(amount, false)}
                                onChangeText={handleAmountChange}
                                keyboardType="number-pad"
                                autoFocus
                            />
                            {amount > 0 && (
                                <TouchableOpacity onPress={() => setAmount(0)} activeOpacity={0.7}>
                                    <Ionicons name="close-circle" size={rf(20)} color={colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* <Text style={styles.smallHelperText}>Select a figure below or enter the figure manually.</Text>
                        <View style={styles.chipRow}>
                            {AMOUNT_CHIPS.map((chip) => (
                                <TouchableOpacity
                                    key={chip}
                                    style={styles.chip}
                                    activeOpacity={0.7}
                                    onPress={() => setAmount((prev) => prev + chip)}
                                >
                                    <Text style={styles.chipText}>+{formatCurrency(chip, false)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View> */}


                        <TextInput
                            style={styles.narrationInput}
                            value={narration}
                            onChangeText={(text) => setNarration(text.slice(0, 50))}
                            placeholder="Narration"
                            placeholderTextColor={colors.textSecondary}
                            maxLength={50}
                        />
                        {/* <Text style={styles.smallHelperText}>Describe what the money is for...</Text> */}
                        <View style={[styles.narrationLabelRow, { marginTop: moderateScale(20) }]}>
                            <Text style={styles.limitText}>
                                Maximum transaction amount is{' '}
                                <Text style={styles.limitAmount}>UGX{formatCurrency(MAX_DAILY_TRANSACTION_AMOUNT)}</Text> per day.
                            </Text>
                            {/* <Text style={styles.fieldLabel}>
                                Narration <Text style={styles.required}>*</Text>
                            </Text> */}
                            <Text style={[styles.charCounter, narration.length >= 40 && styles.charCounterWarning]}>
                                {narration.length}/50
                            </Text>
                        </View>

                        <View style={[styles.payFromHeaderRow, { marginTop: moderateScale(20) }]}>
                            <Text style={styles.payFromTitle}>Pay from</Text>
                            <TouchableOpacity activeOpacity={0.7} onPress={() => { }}>
                                <Text style={styles.addNewLink}>Add new</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.smallHelperText}>
                            Select where we should get the money. Default to the main account.
                        </Text>

                        {accounts.map((account) => {
                            const selected = account.id === selectedAccountId;
                            const badge = getProviderBadge(account.provider);
                            return (
                                <TouchableOpacity
                                    key={account.id}
                                    style={[styles.accountCard, selected && styles.accountCardSelected]}
                                    activeOpacity={0.7}
                                    onPress={() => setSelectedAccountId(account.id)}
                                >
                                    <View style={[styles.providerBadge, { backgroundColor: badge.bg }]}>
                                        <Text style={[styles.providerBadgeText, { color: badge.textColor }]}>{badge.label}</Text>
                                    </View>
                                    <View style={styles.accountInfo}>
                                        <Text style={styles.accountName}>{account.name}</Text>
                                        <Text style={styles.accountNumber}>{account.number}</Text>
                                    </View>
                                    <View style={styles.accountBalanceBlock}>
                                        <Text style={styles.balanceLabel}>Balance</Text>
                                        <Text style={styles.accountBalance}>UGX {formatCurrency(account.balance)}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        <TouchableOpacity
                            style={[styles.saveButton, !canReview && styles.confirmButtonDisabled]}
                            activeOpacity={0.9}
                            disabled={!canReview}
                            onPress={handleReviewPayment}
                        >
                            <Text style={styles.saveButtonText}>Save</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.cancelButton} activeOpacity={0.8} onPress={handleCancelConfirm}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {paymentState === 'reviewing' && transactionDate && (
                    <Animated.View style={{ opacity: reviewOpacity, transform: [{ translateY: reviewTranslateY }] }}>
                        <View style={styles.receiptCard}>
                            <View style={styles.receiptBrandRow}>
                                <View style={styles.receiptLogoCircle}>
                                    <Text style={styles.receiptLogoLetter}>P</Text>
                                </View>
                                <View style={styles.receiptBrandTextBlock}>
                                    <Text style={styles.receiptBrandName}>PayMyBills</Text>
                                    <Text style={styles.receiptTagline}>Simple bills, sorted.</Text>
                                </View>
                            </View>

                            <View style={styles.dashedDivider} />

                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Receipt Number</Text>
                                <Text style={styles.receiptValue}>{receiptNumber}</Text>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Date</Text>
                                <View>
                                    {formatReceiptTimestamp(transactionDate)
                                        .split(', ')
                                        .map((line, i) => (
                                            <Text key={i} style={i === 0 ? styles.receiptValue : styles.receiptValueSub}>
                                                {line}
                                            </Text>
                                        ))}
                                </View>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Account Number</Text>
                                <Text style={styles.receiptValue}>{selectedAccount.number}</Text>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Account Name</Text>
                                <Text style={styles.receiptValue}>{user.name}</Text>
                            </View>

                            <View style={styles.dashedDivider} />

                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Transaction ID</Text>
                                <Text style={styles.receiptValue}>{transactionId}</Text>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Narration</Text>
                                <Text style={styles.receiptValue} numberOfLines={2}>
                                    {narration}
                                </Text>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Amount</Text>
                                <Text style={styles.receiptValue}>UGX {formatCurrency(amount)}</Text>
                            </View>
                            <Text style={styles.amountInWords}>{numberToWords(amount)} Shillings</Text>

                            <View style={styles.dashedDivider} />

                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Transaction Charges</Text>
                                <Text style={styles.receiptValue}>UGX {formatCurrency(transactionCharge)}</Text>
                            </View>
                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptLabel}>Transaction Taxes</Text>
                                <Text style={styles.receiptValue}>UGX {formatCurrency(transactionTax)}</Text>
                            </View>

                            <View style={styles.solidDivider} />

                            <View style={styles.receiptRow}>
                                <Text style={styles.receiptTotalLabel}>Total</Text>
                                <Text style={styles.receiptTotalValue}>
                                    UGX {formatCurrency(amount + transactionCharge + transactionTax)}
                                </Text>
                            </View>

                            <Text style={styles.thankYouText}>Thank you for using PayMyBills.</Text>
                        </View>

                        <TouchableOpacity style={styles.confirmPayButton} activeOpacity={0.9} onPress={handleFinalConfirm}>
                            <Text style={styles.confirmButtonText}>Confirm & Pay</Text>
                            <Ionicons name="checkmark-circle" size={rf(18)} color={colors.onAccent} style={{ marginLeft: 8 }} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.editButton} activeOpacity={0.8} onPress={handleEditReview}>
                            <Text style={styles.editButtonText}>Edit</Text>
                        </TouchableOpacity>
                    </Animated.View>
                )}

                {paymentState === 'processing' && (
                    <View style={styles.statusBlock}>
                        <ActivityIndicator size="large" color={colors.accent} />
                        <Text style={styles.statusText}>Processing payment…</Text>
                    </View>
                )}

                {paymentState === 'success' && (
                    <View style={styles.statusBlock}>
                        <Animated.View style={[styles.successCircle, { transform: [{ scale: successScale }] }]}>
                            <Ionicons name="checkmark" size={rf(40)} color={colors.onAccent} />
                        </Animated.View>
                        <Text style={styles.statusText}>
                            UGX {formatCurrency(amount, false)} sent from {selectedAccount.name}
                        </Text>
                        {narration ? <Text style={styles.statusSubtext}>{narration}</Text> : null}
                    </View>
                )}
            </HalfModal>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.surface,
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
        borderRadius: moderateScale(10),
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
    scanHint: {
        fontSize: rf(13),
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: moderateScale(16),
        paddingHorizontal: moderateScale(24),
    },
    scanFrame: {
        width: '100%',
        aspectRatio: 1,
        borderRadius: moderateScale(24),
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bracketOverlay: {
        ...StyleSheet.absoluteFillObject,
        padding: moderateScale(20),
    },
    bracket: {
        position: 'absolute',
        width: moderateScale(28),
        height: moderateScale(28),
        borderColor: colors.accent,
    },
    bracketTopLeft: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
        borderTopLeftRadius: moderateScale(10),
    },
    bracketTopRight: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
        borderTopRightRadius: moderateScale(10),
    },
    bracketBottomLeft: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
        borderBottomLeftRadius: moderateScale(10),
    },
    bracketBottomRight: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
        borderBottomRightRadius: moderateScale(10),
    },
    verifyOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifyText: {
        marginTop: moderateScale(12),
        fontSize: rf(14),
        fontWeight: '600',
        color: colors.textPrimary,
    },
    permissionPrompt: {
        alignItems: 'center',
        paddingHorizontal: moderateScale(24),
    },
    permissionText: {
        marginTop: moderateScale(12),
        fontSize: rf(13),
        color: colors.textMuted,
        textAlign: 'center',
    },
    permissionButton: {
        marginTop: moderateScale(18),
        backgroundColor: colors.accent,
        borderRadius: moderateScale(20),
        paddingHorizontal: moderateScale(18),
        paddingVertical: moderateScale(10),
    },
    permissionButtonText: {
        fontSize: rf(13),
        fontWeight: '700',
        color: colors.onAccent,
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
    scannedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceAlt,
        borderRadius: moderateScale(12),
        paddingHorizontal: moderateScale(12),
        paddingVertical: moderateScale(10),
        marginBottom: moderateScale(18),
    },
    scannedText: {
        marginLeft: moderateScale(8),
        fontSize: rf(12),
        color: colors.textMuted,
        flexShrink: 1,
    },
    fieldLabel: {
        fontSize: rf(13),
        color: colors.textSecondary,
        marginBottom: moderateScale(10),
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderTopLeftRadius: moderateScale(5),
        borderTopRightRadius: moderateScale(5),
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(12),
        borderBottomWidth: 1.5,
        borderBottomColor: colors.border,
    },
    amountCurrency: {
        fontSize: rf(15),
        fontWeight: '700',
        color: colors.textSecondary,
        marginRight: moderateScale(8),
    },
    amountInput: {
        flex: 1,
        fontSize: rf(20),
        fontWeight: '800',
        color: colors.textPrimary,
        padding: 0,
    },
    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: moderateScale(14),
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(12),
        marginBottom: moderateScale(10),
    },
    accountRowSelected: {
        borderColor: colors.accent,
        backgroundColor: colors.surfaceAlt,
    },
    accountLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    accountName: {
        fontSize: rf(14),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    accountNumber: {
        fontSize: rf(11),
        color: colors.textMuted,
        marginTop: 2,
    },
    accountBalance: {
        fontSize: rf(13),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    confirmButton: {
        marginTop: moderateScale(20),
        backgroundColor: colors.accent,
        borderRadius: moderateScale(28),
        height: moderateScale(52),
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonDisabled: {
        opacity: 0.4,
    },
    confirmButtonText: {
        fontSize: rf(15),
        fontWeight: '700',
        color: colors.onAccent,
    },
    required: {
        color: colors.danger,
    },
    narrationLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    charCounter: {
        fontSize: rf(11),
        fontWeight: '600',
        color: colors.textMuted,
    },
    charCounterWarning: {
        color: colors.warning,
    },
    narrationInput: {
        backgroundColor: colors.surface,
        borderBottomLeftRadius: moderateScale(5),
        borderBottomRightRadius: moderateScale(5),
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(12),
        fontSize: rf(14),
        fontWeight: '500',
        color: colors.textPrimary,
    },
    statusBlock: {
        alignItems: 'center',
        paddingVertical: moderateScale(32),
    },
    statusText: {
        marginTop: moderateScale(16),
        fontSize: rf(14),
        fontWeight: '600',
        color: colors.textPrimary,
        textAlign: 'center',
        paddingHorizontal: moderateScale(16),
    },
    successCircle: {
        width: moderateScale(72),
        height: moderateScale(72),
        borderRadius: moderateScale(36),
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    receiptDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginVertical: moderateScale(6),
    },
    reviewButtonRow: {
        flexDirection: 'row',
        gap: moderateScale(10),
    },
    statusSubtext: {
        marginTop: moderateScale(6),
        fontSize: rf(12),
        color: colors.textMuted,
        textAlign: 'center',
    },
    // new styles
    smallHelperText: {
        fontSize: rf(12),
        color: colors.textMuted,
        marginTop: moderateScale(8),
    },
    limitText: {
        fontSize: rf(12),
        color: colors.textMuted,
        marginTop: moderateScale(8),
    },
    limitAmount: {
        color: colors.accent,
        fontWeight: '700',
    },
    chipRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: moderateScale(12),
    },
    chip: {
        flexGrow: 1,
        flexBasis: 0,
        marginRight: moderateScale(8),
        paddingVertical: moderateScale(10),
        borderRadius: moderateScale(12),
        backgroundColor: colors.surfaceAlt,
        alignItems: 'center',
    },
    chipText: {
        fontSize: rf(12),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    payFromHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    payFromTitle: {
        fontSize: rf(18),
        fontWeight: '800',
        color: colors.textPrimary,
    },
    addNewLink: {
        fontSize: rf(13),
        fontWeight: '700',
        color: colors.accent,
    },
    accountCard: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: moderateScale(14),
        borderWidth: 1.5,
        borderColor: colors.border,
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(12),
        marginTop: moderateScale(12),
    },
    accountCardSelected: {
        borderColor: colors.accent,
    },
    providerBadge: {
        width: moderateScale(38),
        height: moderateScale(38),
        borderRadius: moderateScale(19),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: moderateScale(12),
    },
    providerBadgeText: {
        fontSize: rf(10),
        fontWeight: '800',
    },
    accountInfo: {
        flex: 1,
    },
    accountBalanceBlock: {
        alignItems: 'flex-end',
    },
    balanceLabel: {
        fontSize: rf(11),
        color: colors.textMuted,
    },
    saveButton: {
        marginTop: moderateScale(24),
        backgroundColor: colors.accent,
        borderRadius: moderateScale(28),
        height: moderateScale(52),
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        fontSize: rf(15),
        fontWeight: '700',
        color: colors.onAccent,
    },
    cancelButton: {
        marginTop: moderateScale(10),
        backgroundColor: colors.surface,
        borderRadius: moderateScale(28),
        height: moderateScale(52),
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButtonText: {
        fontSize: rf(15),
        fontWeight: '700',
        color: colors.textMuted,
    },
    receiptCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: moderateScale(20),
        padding: moderateScale(18),
        marginBottom: moderateScale(16),
    },
    receiptBrandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: moderateScale(14),
    },
    receiptLogoCircle: {
        width: moderateScale(40),
        height: moderateScale(40),
        borderRadius: moderateScale(20),
        backgroundColor: colors.accent,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: moderateScale(12),
    },
    receiptLogoLetter: {
        fontSize: rf(20),
        fontWeight: '800',
        color: colors.onAccent,
    },
    receiptBrandTextBlock: {
        flex: 1,
    },
    receiptBrandName: {
        fontSize: rf(16),
        fontWeight: '800',
        color: '#1A1A1A',
    },
    receiptTagline: {
        fontSize: rf(11),
        color: '#6E6E6E',
        marginTop: 2,
    },
    dashedDivider: {
        borderTopWidth: 1,
        borderStyle: 'dashed',
        borderColor: '#D8D8D8',
        marginVertical: moderateScale(10),
    },
    solidDivider: {
        height: 1,
        backgroundColor: '#1A1A1A',
        marginVertical: moderateScale(10),
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingVertical: moderateScale(6),
    },
    receiptLabel: {
        fontSize: rf(12),
        color: '#6E6E6E',
        flex: 1,
    },
    receiptValue: {
        fontSize: rf(13),
        fontWeight: '700',
        color: '#1A1A1A',
        flex: 1.4,
        textAlign: 'right',
    },
    receiptValueSub: {
        fontSize: rf(11),
        fontWeight: '600',
        color: '#6E6E6E',
        textAlign: 'right',
        marginTop: 2,
    },
    amountInWords: {
        fontSize: rf(12),
        fontWeight: '700',
        color: '#1A1A1A',
        textAlign: 'right',
        marginTop: moderateScale(2),
    },
    receiptTotalLabel: {
        fontSize: rf(14),
        fontWeight: '700',
        color: '#1A1A1A',
    },
    receiptTotalValue: {
        fontSize: rf(16),
        fontWeight: '800',
        color: '#1A1A1A',
    },
    thankYouText: {
        fontSize: rf(12),
        color: '#6E6E6E',
        textAlign: 'center',
        marginTop: moderateScale(14),
    },
    confirmPayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: moderateScale(52),
        borderRadius: moderateScale(28),
        backgroundColor: colors.accent,
    },
    editButton: {
        marginTop: moderateScale(10),
        height: moderateScale(52),
        borderRadius: moderateScale(28),
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editButtonText: {
        fontSize: rf(15),
        fontWeight: '700',
        color: colors.textMuted,
    },
});