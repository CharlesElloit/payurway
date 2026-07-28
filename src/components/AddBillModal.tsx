import React, { useEffect, useRef, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Switch,
    Animated,
    Easing,
    PanResponder,
    useWindowDimensions,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import { formatCurrency } from '../utils/format';
import HalfModal from './Modal';
import OptionList from './OptionList';
import { BILL_CATEGORIES, PAYMENT_FREQUENCIES } from '../constants/mockData';

export interface NewBillPayload {
    name: string;
    category: string;
    amount: number;
    frequency: string;
    repeatAutomatically: boolean;
}

interface AddBillModalProps {
    visible: boolean;
    onClose: () => void;
    onSave?: (bill: NewBillPayload) => void;
}

const AMOUNT_CHIPS = [5000, 10000, 20000, 50000];
const ANIM_DURATION = 320;
const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.8;
const BACKDROP_MAX_OPACITY = 1;

export default function AddBillModal({ visible, onClose, onSave }: AddBillModalProps) {
    const { height: windowHeight } = useWindowDimensions();
    const [modalVisible, setModalVisible] = useState(false);
    const translateY = useRef(new Animated.Value(windowHeight)).current;

    const [billName, setBillName] = useState('UEDCL');
    const [isNameFocused, setIsNameFocused] = useState(false);
    const [category, setCategory] = useState('Electricity');
    const [amount, setAmount] = useState(20000);
    const [frequency, setFrequency] = useState('Monthly');
    const [repeatAutomatically, setRepeatAutomatically] = useState(true);
    const [categorySheetVisible, setCategorySheetVisible] = useState(false);
    const [frequencySheetVisible, setFrequencySheetVisible] = useState(false);
    const backdropOpacity = translateY.interpolate({
        inputRange: [0, windowHeight],
        outputRange: [BACKDROP_MAX_OPACITY, 0],
        extrapolate: 'clamp',
    });

    useEffect(() => {
        if (visible) {
            setModalVisible(true);
        } else if (modalVisible) {
            animateClose(() => setModalVisible(false));
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

    const handleAmountChipPress = (chip: number) => {
        setAmount((prev) => prev + chip);
    };

    const handleAmountChange = (text: string) => {
        const digitsOnly = text.replace(/[^0-9]/g, '');
        setAmount(digitsOnly ? parseInt(digitsOnly, 10) : 0);
    };

    const handleSave = () => {
        onSave?.({ name: billName, category, amount, frequency, repeatAutomatically });
        onClose();
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponderCapture: (_, gesture) => Math.abs(gesture.dy) > 6,
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
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="none" />
            <Animated.View style={[styles.root, { transform: [{ translateY }] }]}>
                <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
                    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                        <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
                            <View style={styles.dragHandle} />
                        </View>
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.backButton} onPress={onClose} activeOpacity={0.7}>
                                <Ionicons name="arrow-back" size={rf(18)} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Add a bill</Text>
                            <View style={styles.backButton} />
                        </View>

                        <ScrollView
                            style={styles.scrollFlex}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Bill info card */}
                            <View style={styles.card}>
                                <Text style={styles.cardLabel}>
                                    Bill info <Text style={styles.required}>*</Text>
                                </Text>

                                <TextInput
                                    style={[styles.input, isNameFocused && styles.inputFocused]}
                                    value={billName}
                                    onChangeText={setBillName}
                                    onFocus={() => setIsNameFocused(true)}
                                    onBlur={() => setIsNameFocused(false)}
                                    placeholder="Bill name"
                                    placeholderTextColor={colors.textMuted}
                                />

                                <TouchableOpacity
                                    style={styles.selectRow}
                                    activeOpacity={0.7}
                                    onPress={() => setCategorySheetVisible(true)}
                                >
                                    <Text style={category ? styles.selectValue : styles.selectPlaceholder}>
                                        {category || 'Category'}
                                    </Text>
                                    <Ionicons name="chevron-down" size={rf(18)} color={colors.textSecondary} />
                                </TouchableOpacity>

                                <Text style={styles.helperText}>Fill the information about the bill</Text>
                            </View>

                            {/* Amount card */}
                            <View style={styles.card}>
                                <Text style={styles.cardLabel}>Amount</Text>

                                <View style={styles.amountRow}>
                                    <Text style={styles.amountCurrency}>UGX</Text>
                                    <TextInput
                                        style={styles.amountInput}
                                        value={formatCurrency(amount, false)}
                                        onChangeText={handleAmountChange}
                                        keyboardType="number-pad"
                                    />
                                    {amount > 0 && (
                                        <TouchableOpacity onPress={() => setAmount(0)} activeOpacity={0.7}>
                                            <Ionicons name="close-circle" size={rf(20)} color={colors.textMuted} />
                                        </TouchableOpacity>
                                    )}
                                </View>

                                <Text style={styles.helperText}>Select a figure below or enter the figure manually.</Text>

                                <View style={styles.chipRow}>
                                    {AMOUNT_CHIPS.map((chip) => (
                                        <TouchableOpacity
                                            key={chip}
                                            style={styles.chip}
                                            activeOpacity={0.7}
                                            onPress={() => handleAmountChipPress(chip)}
                                        >
                                            <Text style={styles.chipText}>+{formatCurrency(chip, false)}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Payment frequency card */}
                            <View style={styles.card}>
                                <Text style={styles.cardLabel}>
                                    Payment frequency <Text style={styles.required}>*</Text>
                                </Text>

                                <TouchableOpacity
                                    style={styles.frequencyRow}
                                    activeOpacity={0.7}
                                    onPress={() => setFrequencySheetVisible(true)}
                                >
                                    <Text style={styles.selectValue}>{frequency}</Text>
                                    <View style={styles.frequencyRight}>
                                        <Text style={styles.frequencyDefault}>{frequency} as default</Text>
                                        <Ionicons name="chevron-down" size={rf(16)} color={colors.textSecondary} />
                                    </View>
                                </TouchableOpacity>

                                <Text style={styles.helperText}>
                                    This is the frequency in which the payment will be automatically made.
                                </Text>

                                <Text style={[styles.cardLabel, styles.dueDateLabel]}>First due date</Text>
                                <View style={styles.dueDateRow}>
                                    <Text style={styles.selectValue}>July 27th 2026</Text>
                                </View>

                                <View style={styles.switchRow}>
                                    <View style={styles.switchTextBlock}>
                                        <Text style={styles.switchLabel}>Repeat automatically</Text>
                                        <Text style={styles.switchSubtext}>Recreates this bill every monthly cycle</Text>
                                    </View>
                                    <Switch
                                        value={repeatAutomatically}
                                        onValueChange={setRepeatAutomatically}
                                        trackColor={{ false: colors.border, true: colors.accentDark }}
                                        thumbColor={repeatAutomatically ? colors.accent : colors.textMuted}
                                    />
                                </View>
                            </View>
                        </ScrollView>
                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.saveButton} activeOpacity={0.9} onPress={handleSave}>
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </SafeAreaView>
            </Animated.View>

            <HalfModal visible={categorySheetVisible} onClose={() => setCategorySheetVisible(false)} title="Select category">
                <OptionList
                    options={BILL_CATEGORIES}
                    selected={category}
                    onSelect={(value) => {
                        setCategory(value);
                        setCategorySheetVisible(false);
                    }}
                />
            </HalfModal>

            <HalfModal
                visible={frequencySheetVisible}
                onClose={() => setFrequencySheetVisible(false)}
                title="Payment frequency"
            >
                <OptionList
                    options={PAYMENT_FREQUENCIES}
                    selected={frequency}
                    onSelect={(value) => {
                        setFrequency(value);
                        setFrequencySheetVisible(false);
                    }}
                />
            </HalfModal>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.background,
        borderTopLeftRadius: moderateScale(24),
        borderTopRightRadius: moderateScale(24),
        overflow: 'hidden',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.background,
    },
    flex: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: moderateScale(16),
        paddingTop: moderateScale(12),
        paddingBottom: moderateScale(8),
    },
    backButton: {
        width: moderateScale(36),
        height: moderateScale(36),
        borderRadius: moderateScale(18),
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: rf(17),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    scrollContent: {
        paddingHorizontal: moderateScale(16),
        paddingBottom: moderateScale(20),
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: moderateScale(20),
        padding: moderateScale(16),
        marginTop: moderateScale(16),
    },
    cardLabel: {
        fontSize: rf(13),
        color: colors.textSecondary,
        marginBottom: moderateScale(10),
    },
    required: {
        color: colors.danger,
    },
    input: {
        borderWidth: 1.5,
        borderColor: colors.border,
        borderRadius: moderateScale(14),
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(12),
        fontSize: rf(15),
        fontWeight: '600',
        color: colors.textPrimary,
        backgroundColor: colors.surfaceAlt,
    },
    inputFocused: {
        borderColor: colors.accent,
    },
    dragHandleArea: {
        alignItems: 'center',
        paddingTop: moderateScale(10),
        paddingBottom: moderateScale(4),
    },
    dragHandle: {
        width: moderateScale(40),
        height: moderateScale(4),
        borderRadius: moderateScale(2),
        backgroundColor: colors.border,
    },
    scrollFlex: {
        flex: 1,
    },
    footer: {
        paddingHorizontal: moderateScale(16),
        paddingTop: moderateScale(12),
        paddingBottom: moderateScale(12),
        backgroundColor: colors.background,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    selectRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: moderateScale(14),
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(14),
        backgroundColor: colors.surfaceAlt,
        marginTop: moderateScale(10),
    },
    selectValue: {
        fontSize: rf(14),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    selectPlaceholder: {
        fontSize: rf(14),
        fontWeight: '500',
        color: colors.textMuted,
    },
    helperText: {
        fontSize: rf(12),
        color: colors.textMuted,
        marginTop: moderateScale(10),
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceAlt,
        borderRadius: moderateScale(14),
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(12),
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
    frequencyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceAlt,
        borderRadius: moderateScale(14),
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(14),
    },
    frequencyRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    frequencyDefault: {
        fontSize: rf(12),
        color: colors.textMuted,
        marginRight: moderateScale(6),
    },
    dueDateLabel: {
        marginTop: moderateScale(16),
        marginBottom: moderateScale(10),
    },
    dueDateRow: {
        backgroundColor: colors.surfaceAlt,
        borderRadius: moderateScale(14),
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(14),
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: moderateScale(18),
    },
    switchTextBlock: {
        flex: 1,
        marginRight: moderateScale(12),
    },
    switchLabel: {
        fontSize: rf(14),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    switchSubtext: {
        fontSize: rf(12),
        color: colors.textMuted,
        marginTop: 2,
    },
    saveButton: {
        backgroundColor: colors.accent,
        borderRadius: moderateScale(28),
        height: moderateScale(52),
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        fontSize: rf(16),
        fontWeight: '700',
        color: colors.onAccent,
    },
});