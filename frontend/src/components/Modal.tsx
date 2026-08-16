import React, { useEffect, useRef, useState } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    Animated,
    Easing,
    PanResponder,
    TouchableWithoutFeedback,
    ScrollView,
    useWindowDimensions,
} from 'react-native';
import { colors } from '../theme/colors';
import { moderateScale, rf } from '../utils/responsive';

const ANIM_DURATION = 280;
// How far (px) the sheet must be dragged down, or how fast it must be
// flicked, before a release counts as "dismiss" rather than "snap back".
const DISMISS_DISTANCE = 100;
const DISMISS_VELOCITY = 0.8;

interface HalfModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    /** Max height as a fraction of screen height (0–1). Defaults to 0.7. */
    maxHeightPercent?: number;
}

/**
 * A reusable bottom-sheet ("half modal") with an iOS-style drag handle.
 * Slides up from the bottom on open, can be dismissed by tapping the backdrop
 * or dragging the handle down, and only unmounts its native <Modal> after the
 * close animation has finished (no hard cut).
 *
 * Usage: wrap arbitrary content as children — e.g. an OptionList picker, a
 * form, or any other bottom-sheet-style content.
 */
export default function HalfModal({ visible, onClose, title, children, maxHeightPercent = 0.7 }: HalfModalProps) {
    const { height: windowHeight } = useWindowDimensions();
    const [modalVisible, setModalVisible] = useState(false);

    const translateY = useRef(new Animated.Value(windowHeight)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setModalVisible(true);
        } else if (modalVisible) {
            animateClose(() => setModalVisible(false));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    // Triggered by the native Modal's onShow — guarantees the modal is already
    // presented natively before our JS-driven slide-up animation starts,
    // avoiding any flicker/race between native presentation and our animation.
    const animateOpen = () => {
        translateY.setValue(windowHeight);
        backdropOpacity.setValue(0);
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: 0,
                duration: ANIM_DURATION,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 1,
                duration: ANIM_DURATION,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const animateClose = (onDone?: () => void) => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: windowHeight,
                duration: ANIM_DURATION,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: ANIM_DURATION,
                useNativeDriver: true,
            }),
        ]).start(() => onDone?.());
    };

    // Drag-to-dismiss is scoped to the handle area only (via panHandlers below),
    // so it never fights with scrolling inside the sheet's own content.
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
            <View style={styles.root}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
                </TouchableWithoutFeedback>

                <Animated.View
                    style={[styles.sheet, { maxHeight: `${maxHeightPercent * 100}%`, transform: [{ translateY }] }]}
                >
                    <View {...panResponder.panHandlers} style={styles.handleArea}>
                        <View style={styles.handle} />
                        {title ? <Text style={styles.title}>{title}</Text> : null}
                    </View>

                    <ScrollView bounces={false} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                        {children}
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        backgroundColor: colors.surfaceAlt,
        borderTopLeftRadius: moderateScale(24),
        borderTopRightRadius: moderateScale(24),
        overflow: 'hidden',
    },
    handleArea: {
        alignItems: 'center',
        paddingTop: moderateScale(10),
        paddingBottom: moderateScale(8),
    },
    handle: {
        width: moderateScale(40),
        height: moderateScale(4),
        borderRadius: moderateScale(2),
        backgroundColor: colors.border,
    },
    title: {
        marginTop: moderateScale(12),
        fontSize: rf(15),
        fontWeight: '700',
        color: colors.textPrimary,
    },
    content: {
        paddingHorizontal: moderateScale(16),
        paddingBottom: moderateScale(28),
    },
});