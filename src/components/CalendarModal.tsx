import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Easing,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { moderateScale, rf } from '../utils/responsive';
import HalfModal from './Modal';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  onConfirm: (date: Date) => void;
}

const ANIM_DURATION = 320;
const MONTH_SWIPE_DURATION = 220;
// Vertical drag-up distance/speed that counts as "dismiss" rather than "snap back".
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 0.7;
// Horizontal swipe distance/speed that counts as "change month".
const MONTH_SWIPE_DISTANCE = 60;
const MONTH_SWIPE_VELOCITY = 0.5;
// Backdrop's opacity once fully open — fades in lockstep with the panel's
// vertical position, same idea as the AddBillModal backdrop.
const BACKDROP_MAX_OPACITY = 0.6;

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const MONTH_SHORT_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Builds a full 6-row (42-cell) grid for the given month, including the
 * leading/trailing days of adjacent months needed to fill complete weeks. */
function buildMonthGrid(year: number, month: number): Date[] {
  const firstOfMonth = new Date(year, month, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(year, month, 1 - startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export default function CalendarModal({ visible, onClose, selectedDate, onConfirm }: CalendarModalProps) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  // Panel covers most of the screen height but stops short of the very
  // bottom, leaving the backdrop (and a "Slide" hint) visible beneath it.
  const panelHeight = windowHeight * 0.9;

  const translateY = useRef(new Animated.Value(-panelHeight)).current;
  const gridTranslateX = useRef(new Animated.Value(0)).current;

  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [pendingDate, setPendingDate] = useState(selectedDate);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedDate.getFullYear());

  useEffect(() => {
    if (visible) {
      setPendingDate(selectedDate);
      setViewYear(selectedDate.getFullYear());
      setViewMonth(selectedDate.getMonth());
      setModalVisible(true);
    } else if (modalVisible) {
      animateClose(() => setModalVisible(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const animateOpen = () => {
    translateY.setValue(-panelHeight);
    Animated.timing(translateY, {
      toValue: 0,
      duration: ANIM_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const animateClose = (onDone?: () => void) => {
    Animated.timing(translateY, {
      toValue: -panelHeight,
      duration: ANIM_DURATION,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => onDone?.());
  };

  // Backdrop fade is tied directly to translateY, so it stays in sync whether
  // translateY is changing from a drag gesture or an open/close animation.
  const backdropOpacity = translateY.interpolate({
    inputRange: [-panelHeight, 0],
    outputRange: [0, BACKDROP_MAX_OPACITY],
    extrapolate: 'clamp',
  });

  const goToMonth = (year: number, month: number) => {
    const d = new Date(year, month, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  };

  const animateToMonth = (direction: 1 | -1) => {
    Animated.timing(gridTranslateX, {
      toValue: -direction * windowWidth,
      duration: MONTH_SWIPE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      const d = new Date(viewYear, viewMonth + direction, 1);
      goToMonth(d.getFullYear(), d.getMonth());
      gridTranslateX.setValue(direction * windowWidth);
      Animated.timing(gridTranslateX, {
        toValue: 0,
        duration: MONTH_SWIPE_DURATION,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  };

  // Vertical drag-to-dismiss, scoped to the whole panel via capture so it
  // always wins over the grid's horizontal swipe for vertical-dominant drags.
  const verticalPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_, gesture) =>
        gesture.dy < -6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy < 0) translateY.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -DISMISS_DISTANCE || gesture.vy < -DISMISS_VELOCITY) {
          onClose();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
    })
  ).current;

  // Horizontal swipe-to-change-month, scoped to just the grid area. Only
  // claims horizontal-dominant gestures, so it never fights the drag-to-dismiss above.
  const horizontalPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        gridTranslateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -MONTH_SWIPE_DISTANCE || gesture.vx < -MONTH_SWIPE_VELOCITY) {
          animateToMonth(1);
        } else if (gesture.dx > MONTH_SWIPE_DISTANCE || gesture.vx > MONTH_SWIPE_VELOCITY) {
          animateToMonth(-1);
        } else {
          Animated.spring(gridTranslateX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
    })
  ).current;

  const grid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const handleOpenMonthPicker = () => {
    setPickerYear(viewYear);
    setMonthPickerVisible(true);
  };

  const handleConfirm = () => {
    onConfirm(pendingDate);
    onClose();
  };

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
          style={[styles.panel, { height: panelHeight, transform: [{ translateY }] }]}
          {...verticalPanResponder.panHandlers}
        >
          <View style={[styles.headerRow, { paddingTop: insets.top + moderateScale(12) }]}>
            <Text style={styles.headerTitle}>Calendar</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={rf(18)} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <TouchableOpacity style={styles.monthYearBlock} activeOpacity={0.7} onPress={handleOpenMonthPicker}>
              <Text style={styles.monthLabel}>{MONTH_LABELS[viewMonth]}</Text>
              <Text style={styles.yearLabel}>{viewYear}</Text>
            </TouchableOpacity>

            <View style={styles.weekdayRow}>
              {WEEKDAY_LABELS.map((label) => (
                <View key={label} style={styles.weekdayCell}>
                  <View style={[styles.weekdayPin, label === 'Sun' && styles.weekdayPinSun]} />
                  <Text style={[styles.weekdayLabel, label === 'Sun' && styles.weekendText]}>{label}</Text>
                </View>
              ))}
            </View>

            <Animated.View
              style={[styles.grid, { transform: [{ translateX: gridTranslateX }] }]}
              {...horizontalPanResponder.panHandlers}
            >
              {grid.map((date) => {
                const inCurrentMonth = date.getMonth() === viewMonth;
                const isToday = isSameDay(date, today);
                const isSelected = isSameDay(date, pendingDate);
                const isWeekend = date.getDay() === 0;

                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    style={styles.cell}
                    activeOpacity={0.7}
                    onPress={() => setPendingDate(date)}
                  >
                    <View style={[styles.cellInner, isSelected && styles.cellSelected]}>
                      <Text
                        style={[
                          styles.cellText,
                          isWeekend && styles.weekendText,
                          !inCurrentMonth && styles.cellTextMuted,
                          isToday && !isSelected && styles.cellTextToday,
                          isSelected && styles.cellTextSelected,
                        ]}
                      >
                        {date.getDate()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>
          </View>

          <View style={styles.slideHintRow}>
            <Ionicons name="arrow-back" size={rf(14)} color={colors.textMuted} />
            <Text style={styles.slideHintText}>Slide</Text>
            <Ionicons name="arrow-forward" size={rf(14)} color={colors.textMuted} />
          </View>

          <TouchableOpacity style={styles.confirmButton} activeOpacity={0.9} onPress={handleConfirm}>
            <Text style={styles.confirmButtonText}>Confirm date</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <HalfModal
        visible={monthPickerVisible}
        onClose={() => setMonthPickerVisible(false)}
        title="Select month & year"
      >
        <View style={styles.yearStepperRow}>
          <TouchableOpacity onPress={() => setPickerYear((y) => y - 1)} style={styles.yearStepButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={rf(18)} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.yearStepperLabel}>{pickerYear}</Text>
          <TouchableOpacity onPress={() => setPickerYear((y) => y + 1)} style={styles.yearStepButton} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={rf(18)} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.monthGrid}>
          {MONTH_SHORT_LABELS.map((label, index) => {
            const isActive = pickerYear === viewYear && index === viewMonth;
            return (
              <TouchableOpacity
                key={label}
                style={[styles.monthChip, isActive && styles.monthChipActive]}
                activeOpacity={0.7}
                onPress={() => {
                  goToMonth(pickerYear, index);
                  setMonthPickerVisible(false);
                }}
              >
                <Text style={[styles.monthChipText, isActive && styles.monthChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </HalfModal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderBottomLeftRadius: moderateScale(28),
    borderBottomRightRadius: moderateScale(28),
    paddingHorizontal: moderateScale(16),
    paddingBottom: moderateScale(16),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: moderateScale(16),
  },
  headerTitle: {
    fontSize: rf(24),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: moderateScale(20),
    padding: moderateScale(16),
    overflow: 'hidden',
  },
  monthYearBlock: {
    marginBottom: moderateScale(12),
  },
  monthLabel: {
    fontSize: rf(26),
    fontWeight: '800',
    color: colors.textPrimary,
  },
  yearLabel: {
    fontSize: rf(14),
    color: colors.textSecondary,
    marginTop: 2,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: moderateScale(4),
  },
  weekdayCell: {
    flexBasis: `${100 / 7}%`,
    alignItems: 'center',
  },
  weekdayPin: {
    width: moderateScale(6),
    height: moderateScale(16),
    borderRadius: moderateScale(3),
    backgroundColor: colors.border,
    marginBottom: moderateScale(6),
  },
  weekdayPinSun: {
    backgroundColor: colors.danger,
    opacity: 0.5,
  },
  weekdayLabel: {
    fontSize: rf(12),
    color: colors.textSecondary,
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellInner: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: colors.accent,
  },
  cellText: {
    fontSize: rf(14),
    color: colors.textPrimary,
    fontWeight: '500',
  },
  weekendText: {
    color: colors.danger,
  },
  cellTextMuted: {
    color: colors.textMuted,
  },
  cellTextToday: {
    color: colors.accent,
    fontWeight: '800',
  },
  cellTextSelected: {
    color: colors.onAccent,
    fontWeight: '800',
  },
  slideHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: moderateScale(14),
    gap: moderateScale(8),
  },
  slideHintText: {
    fontSize: rf(14),
    fontWeight: '700',
    color: colors.textMuted,
  },
  confirmButton: {
    marginTop: moderateScale(14),
    backgroundColor: colors.accent,
    borderRadius: moderateScale(28),
    height: moderateScale(50),
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: rf(15),
    fontWeight: '700',
    color: colors.onAccent,
  },
  yearStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(16),
  },
  yearStepButton: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: moderateScale(16),
  },
  yearStepperLabel: {
    fontSize: rf(17),
    fontWeight: '800',
    color: colors.textPrimary,
    minWidth: moderateScale(60),
    textAlign: 'center',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthChip: {
    width: '31%',
    paddingVertical: moderateScale(14),
    borderRadius: moderateScale(14),
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    marginBottom: moderateScale(10),
  },
  monthChipActive: {
    backgroundColor: colors.accent,
  },
  monthChipText: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  monthChipTextActive: {
    color: colors.onAccent,
  },
});