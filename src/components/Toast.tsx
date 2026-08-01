import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { moderateScale, rf } from '../utils/responsive';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide?: () => void;
  duration?: number;
}

/**
 * Small auto-dismissing toast, positioned absolutely — render it as a child
 * of a `position: relative`-equivalent container (any plain View works,
 * since React Native positions absolute children relative to their parent
 * regardless of the parent's own position style).
 */
export default function Toast({ message, visible, onHide, duration = 2200 }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;

    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => onHide?.());
    }, duration);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]} pointerEvents="none">
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: moderateScale(90),
    left: moderateScale(24),
    right: moderateScale(24),
    alignItems: 'center',
  },
  text: {
    backgroundColor: 'rgba(30,30,30,0.95)',
    color: colors.textPrimary,
    fontSize: rf(13),
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(14),
    overflow: 'hidden',
  },
});