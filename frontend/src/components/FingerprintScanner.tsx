import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { moderateScale, rf } from '../utils/responsive';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export type ScannerStatus = 'idle' | 'scanning' | 'success' | 'error';

interface FingerprintScannerProps {
    status: ScannerStatus;
    size?: number;
}

export default function FingerprintScanner({ status, size = 140 }: FingerprintScannerProps) {
    const strokeWidth = moderateScale(4);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const rotation = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(1)).current;
    const iconScale = useRef(new Animated.Value(1)).current;
    const shakeX = useRef(new Animated.Value(0)).current;
    const ringProgress = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        let spinLoop: Animated.CompositeAnimation | null = null;
        let pulseLoop: Animated.CompositeAnimation | null = null;

        if (status === 'scanning') {
            rotation.setValue(0);
            spinLoop = Animated.loop(
                Animated.timing(rotation, {
                    toValue: 1,
                    duration: 1100,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            );
            spinLoop.start();

            pulseLoop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1.08, duration: 550, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulse, { toValue: 1, duration: 550, easing: Easing.in(Easing.ease), useNativeDriver: true }),
                ])
            );
            pulseLoop.start();

            Animated.timing(ringProgress, { toValue: 0, duration: 200, useNativeDriver: false }).start();
        }

        if (status === 'success') {
            spinLoop?.stop();
            pulseLoop?.stop();
            Animated.parallel([
                Animated.timing(ringProgress, {
                    toValue: 1,
                    duration: 380,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: false,
                }),
                Animated.sequence([
                    Animated.spring(iconScale, { toValue: 1.25, friction: 3, useNativeDriver: true }),
                    Animated.spring(iconScale, { toValue: 1, friction: 4, useNativeDriver: true }),
                ]),
            ]).start();
        }

        if (status === 'error') {
            spinLoop?.stop();
            pulseLoop?.stop();
            pulse.setValue(1);
            Animated.sequence([
                Animated.timing(shakeX, { toValue: 8, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeX, { toValue: -8, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeX, { toValue: 6, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeX, { toValue: -6, duration: 45, useNativeDriver: true }),
                Animated.timing(shakeX, { toValue: 0, duration: 45, useNativeDriver: true }),
            ]).start();
        }

        if (status === 'idle') {
            spinLoop?.stop();
            pulseLoop?.stop();
            rotation.setValue(0);
            pulse.setValue(1);
            ringProgress.setValue(0);
        }

        return () => {
            spinLoop?.stop();
            pulseLoop?.stop();
        };
    }, [status, rotation, pulse, ringProgress, iconScale, shakeX]);

    const spin = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

    const dashOffset = ringProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference * 0.75, 0],
    });

    const ringColor = status === 'error' ? colors.danger : status === 'success' ? colors.success : colors.accent;

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Animated.View
                style={[
                    StyleSheet.absoluteFillObject,
                    { transform: [{ rotate: status === 'scanning' ? spin : '0deg' }] },
                ]}
            >
                <Svg width={size} height={size}>
                    {/* Track */}
                    <Circle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={colors.border}
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    {/* Animated progress arc */}
                    <AnimatedCircle
                        cx={size / 2}
                        cy={size / 2}
                        r={radius}
                        stroke={ringColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={dashOffset}
                    />
                </Svg>
            </Animated.View>

            <Animated.View
                style={[
                    styles.iconCircle,
                    {
                        width: size * 0.74,
                        height: size * 0.74,
                        borderRadius: (size * 0.74) / 2,
                        transform: [{ scale: Animated.multiply(pulse, iconScale) }, { translateX: shakeX }],
                    },
                ]}
            >
                <Ionicons
                    name={status === 'success' ? 'checkmark' : status === 'error' ? 'close' : 'finger-print'}
                    size={rf(size * 0.33)}
                    color={ringColor}
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconCircle: {
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
});