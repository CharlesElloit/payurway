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
import Toast from './Toast';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: Date;
  onConfirm: (date: Date) => void;
  /** When false, navigating to any month after the current real-world month
   * (via swipe, chevron, or the month/year picker) is blocked and shows a
   * toast instead. Defaults to true (no restriction). */
  allowFutureMonths?: boolean;
}

const ANIM_DURATION = 320;
const MONTH_SWIPE_DURATION = 260;
// Vertical drag-up distance/speed that counts as "dismiss" rather than "snap back".
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 0.7;
// Horizontal swipe distance/speed that counts as "change month".
const MONTH_SWIPE_DISTANCE = 60;
const MONTH_SWIPE_VELOCITY = 0.5;
// Backdrop's opacity once fully open — fades in lockstep with the panel's
// vertical position, same idea as the AddBillModal backdrop.
const BACKDROP_MAX_OPACITY = 0.6;
const FUTURE_BLOCKED_MESSAGE = "You can't select a future date";

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

/** True if (year, month) falls strictly after today's real-world month. */
function isMonthAfterToday(year: number, month: number, today: Date): boolean {
  if (year > today.getFullYear()) return true;
  if (year === today.getFullYear() && month > today.getMonth()) return true;
  return false;
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

interface MonthGridViewProps {
  dates: Date[];
  viewMonth: number;
  today: Date;
  pendingDate: Date;
  width: number;
  onSelect: (date: Date) => void;
}

function MonthGridView({ dates, viewMonth, today, pendingDate, width, onSelect }: MonthGridViewProps) {
  return (
    <View style={[styles.grid, { width }]}>
      {dates.map((date) => {
        const inCurrentMonth = date.getMonth() === viewMonth;
        const isToday = isSameDay(date, today);
        const isSelected = isSameDay(date, pendingDate);
        const isWeekend = date.getDay() === 0;

        return (
          <TouchableOpacity
            key={date.toISOString()}
            style={styles.cell}
            activeOpacity={0.7}
            onPress={() => onSelect(date)}
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
    </View>
  );
}

export default function CalendarModal({
  visible,
  onClose,
  selectedDate,
  onConfirm,
  allowFutureMonths = true,
}: CalendarModalProps) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);

  // Panel covers most of the screen height but stops short of the very
  // bottom, leaving the backdrop (and a "Slide" hint) visible beneath it.
  const panelHeight = windowHeight * 0.9;

  const translateY = useRef(new Animated.Value(-panelHeight)).current;
  // Offset from the pager's resting position (0 = current month centered,
  // -windowWidth = next month fully revealed, +windowWidth = prev month fully revealed).
  const pagerOffset = useRef(new Animated.Value(0)).current;
  const isTransitioningRef = useRef(false);

  const [today, setToday] = useState(() => new Date());
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());
  const [pendingDate, setPendingDate] = useState(selectedDate);
  const [monthPickerVisible, setMonthPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedDate.getFullYear());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      const now = new Date();
      setToday(now);
      setPendingDate(selectedDate);
      // Always reset to the current real-world month on open, regardless of
      // what was previously selected/confirmed.
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
      pagerOffset.setValue(0);
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

  const showBlockedToast = () => setToastMessage(FUTURE_BLOCKED_MESSAGE);

  const prevDate = new Date(viewYear, viewMonth - 1, 1);
  const nextDate = new Date(viewYear, viewMonth + 1, 1);
  const prevGrid = useMemo(() => buildMonthGrid(prevDate.getFullYear(), prevDate.getMonth()), [viewYear, viewMonth]);
  const currentGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const nextGrid = useMemo(() => buildMonthGrid(nextDate.getFullYear(), nextDate.getMonth()), [viewYear, viewMonth]);

  const nextIsBlocked = !allowFutureMonths && isMonthAfterToday(nextDate.getFullYear(), nextDate.getMonth(), today);

  const goToAdjacentMonth = (direction: 1 | -1) => {
    if (isTransitioningRef.current) return;

    if (direction === 1 && nextIsBlocked) {
      showBlockedToast();
      Animated.spring(pagerOffset, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
      return;
    }

    isTransitioningRef.current = true;
    Animated.timing(pagerOffset, {
      toValue: -direction * windowWidth,
      duration: MONTH_SWIPE_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      const d = new Date(viewYear, viewMonth + direction, 1);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      pagerOffset.setValue(0);
      isTransitioningRef.current = false;
    });
  };

  const snapBack = () => {
    Animated.spring(pagerOffset, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
  };

  // Vertical drag-to-dismiss, scoped to the whole panel via capture so it
  // always wins over the pager's horizontal swipe for vertical-dominant drags.
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

  // Horizontal swipe-to-change-month, scoped to just the pager viewport. Only
  // claims horizontal-dominant gestures, so it never fights the drag-to-dismiss above.
  const horizontalPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        !isTransitioningRef.current && Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        // Dragging left (negative dx) toward a blocked next month is allowed to
        // rubber-band slightly, but doesn't reveal the (nonexistent-for-us) page.
        if (gesture.dx < 0 && nextIsBlocked) {
          pagerOffset.setValue(gesture.dx / 3);
        } else {
          pagerOffset.setValue(gesture.dx);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const draggedNext = gesture.dx < -MONTH_SWIPE_DISTANCE || gesture.vx < -MONTH_SWIPE_VELOCITY;
        const draggedPrev = gesture.dx > MONTH_SWIPE_DISTANCE || gesture.vx > MONTH_SWIPE_VELOCITY;

        if (draggedNext) {
          goToAdjacentMonth(1);
        } else if (draggedPrev) {
          goToAdjacentMonth(-1);
        } else {
          snapBack();
        }
      },
    })
  ).current;

  const handleOpenMonthPicker = () => {
    setPickerYear(viewYear);
    setMonthPickerVisible(true);
  };

  const handlePickMonth = (year: number, month: number) => {
    if (!allowFutureMonths && isMonthAfterToday(year, month, today)) {
      showBlockedToast();
      return;
    }
    setViewYear(year);
    setViewMonth(month);
    pagerOffset.setValue(0);
    setMonthPickerVisible(false);
  };

  const handlePickerYearNext = () => {
    if (!allowFutureMonths && pickerYear >= today.getFullYear()) {
      showBlockedToast();
      return;
    }
    setPickerYear((y) => y + 1);
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

            {/* Fixed-width clipping viewport; the wider 3-page row slides inside it. */}
            <View style={styles.pagerViewport} {...horizontalPanResponder.panHandlers}>
              <Animated.View
                style={[
                  styles.pagerRow,
                  { width: windowWidth * 3, transform: [{ translateX: Animated.add(-windowWidth, pagerOffset) }] },
                ]}
              >
                <MonthGridView
                  dates={prevGrid}
                  viewMonth={prevDate.getMonth()}
                  today={today}
                  pendingDate={pendingDate}
                  width={windowWidth}
                  onSelect={setPendingDate}
                />
                <MonthGridView
                  dates={currentGrid}
                  viewMonth={viewMonth}
                  today={today}
                  pendingDate={pendingDate}
                  width={windowWidth}
                  onSelect={setPendingDate}
                />
                <MonthGridView
                  dates={nextGrid}
                  viewMonth={nextDate.getMonth()}
                  today={today}
                  pendingDate={pendingDate}
                  width={windowWidth}
                  onSelect={setPendingDate}
                />
              </Animated.View>
            </View>
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

        <Toast message={toastMessage ?? ''} visible={!!toastMessage} onHide={() => setToastMessage(null)} />
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
          <TouchableOpacity onPress={handlePickerYearNext} style={styles.yearStepButton} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={rf(18)} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.monthGrid}>
          {MONTH_SHORT_LABELS.map((label, index) => {
            const isActive = pickerYear === viewYear && index === viewMonth;
            const isBlocked = !allowFutureMonths && isMonthAfterToday(pickerYear, index, today);
            return (
              <TouchableOpacity
                key={label}
                style={[styles.monthChip, isActive && styles.monthChipActive, isBlocked && styles.monthChipBlocked]}
                activeOpacity={0.7}
                onPress={() => handlePickMonth(pickerYear, index)}
              >
                <Text
                  style={[
                    styles.monthChipText,
                    isActive && styles.monthChipTextActive,
                    isBlocked && styles.monthChipTextBlocked,
                  ]}
                >
                  {label}
                </Text>
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
  pagerViewport: {
    flex: 1,
    overflow: 'hidden',
  },
  pagerRow: {
    flex: 1,
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignContent: 'flex-start',
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
  monthChipBlocked: {
    opacity: 0.4,
  },
  monthChipText: {
    fontSize: rf(13),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  monthChipTextActive: {
    color: colors.onAccent,
  },
  monthChipTextBlocked: {
    color: colors.textMuted,
  },
});