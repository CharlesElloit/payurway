import React, { useRef } from 'react';
import { Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';

interface AddMoneyButtonProps {
  label?: string;
  onPress?: () => void;
}

export default function AddMoneyButton({ label = 'Add Money', onPress }: AddMoneyButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.9}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
      >
        <Text style={styles.label}>{label}</Text>
        <Ionicons
          name="add"
          size={rf(20)}
          color={colors.accent}
          style={styles.iconCircle}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent,
    borderRadius: moderateScale(28),
    height: moderateScale(52),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: rf(16),
    fontWeight: '700',
    color: colors.onAccent,
    marginRight: moderateScale(10),
  },
  iconCircle: {
    backgroundColor: colors.onAccent,
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
});
