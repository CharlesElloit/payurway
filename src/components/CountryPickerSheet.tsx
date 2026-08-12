import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';
import { countries, Country } from '../constants/countries';
import HalfModal from './Modal';

interface CountryPickerSheetProps {
    visible: boolean;
    onClose: () => void;
    selected: Country;
    onSelect: (country: Country) => void;
}

export default function CountryPickerSheet({ visible, onClose, selected, onSelect }: CountryPickerSheetProps) {
    const [query, setQuery] = useState('');

    const filtered = countries.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()));

    return (
        <HalfModal visible={visible} onClose={onClose} title="Select country or region" maxHeightPercent={0.8}>
            <View style={styles.searchRow}>
                <Ionicons name="search" size={rf(16)} color={colors.textMuted} />
                <TextInput
                    style={styles.searchInput}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search country"
                    placeholderTextColor={colors.textMuted}
                />
            </View>

            {filtered.map((country) => {
                const active = country.code === selected.code;
                return (
                    <TouchableOpacity
                        key={country.code}
                        style={[styles.row, active && styles.rowActive]}
                        activeOpacity={0.7}
                        onPress={() => {
                            onSelect(country);
                            onClose();
                        }}
                    >
                        <Text style={styles.flag}>{country.flag}</Text>
                        <Text style={styles.name}>{country.name}</Text>
                        <Text style={styles.dialCode}>{country.dialCode}</Text>
                        {active && <Ionicons name="checkmark" size={rf(16)} color={colors.accent} style={{ marginLeft: 8 }} />}
                    </TouchableOpacity>
                );
            })}
        </HalfModal>
    );
}

const styles = StyleSheet.create({
    searchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: moderateScale(14),
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(10),
        marginBottom: moderateScale(12),
    },
    searchInput: {
        flex: 1,
        marginLeft: moderateScale(8),
        fontSize: rf(14),
        color: colors.textPrimary,
        padding: 0,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: moderateScale(12),
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    rowActive: {},
    flag: {
        fontSize: rf(20),
        marginRight: moderateScale(12),
    },
    name: {
        flex: 1,
        fontSize: rf(14),
        fontWeight: '600',
        color: colors.textPrimary,
    },
    dialCode: {
        fontSize: rf(13),
        color: colors.textMuted,
    },
});