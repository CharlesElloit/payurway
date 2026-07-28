import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';

interface OptionListProps {
    options: string[];
    selected?: string;
    onSelect: (value: string) => void;
}

export default function OptionList({ options, selected, onSelect }: OptionListProps) {
    return (
        <View>
            {options.map((option, index) => {
                const isSelected = option === selected;
                return (
                    <TouchableOpacity
                        key={option}
                        style={[styles.row, index !== options.length - 1 && styles.rowBorder]}
                        activeOpacity={0.7}
                        onPress={() => onSelect(option)}
                    >
                        <Text style={[styles.label, isSelected && styles.labelSelected]}>{option}</Text>
                        {isSelected && <Ionicons name="checkmark" size={rf(18)} color={colors.accent} />}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: moderateScale(16),
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    label: {
        fontSize: rf(15),
        color: colors.textSecondary,
        fontWeight: '500',
    },
    labelSelected: {
        color: colors.textPrimary,
        fontWeight: '700',
    },
});