import React from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { moderateScale, rf } from '../utils/responsive';

export const MY_BILLS_HEADER_HEIGHT = moderateScale(56);

interface MyBillsHeaderProps {
  height: Animated.AnimatedInterpolation<number>;
  opacity: Animated.AnimatedInterpolation<number>;
  onBack?: () => void;
  onAdd?: () => void;
}

export default function MyBillsHeader({ height, opacity, onBack, onAdd }: MyBillsHeaderProps) {
  return (
    <Animated.View style={[styles.container, { height }]}>
      <Animated.View style={[styles.inner, { opacity }]}>
        <TouchableOpacity style={styles.iconButton} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={rf(18)} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>My Bills</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAdd} activeOpacity={0.85}>
          <Ionicons name="add" size={rf(20)} color={colors.onAccent} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: moderateScale(20),
  },
  inner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: MY_BILLS_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(14),
  },
  iconButton: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addButton: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});